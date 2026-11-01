import { ConfigService } from '@nestjs/config';
import { prisma } from '@rihal/database';

interface RuntimeRoleCheck {
  roleName: string;
  isSuperuser: boolean;
  bypassesRls: boolean;
  canCreateDb: boolean;
  canCreateRole: boolean;
  isMigrationMember: boolean;
  canDeleteTenantRows: boolean;
  migratorRoleExists: boolean;
}

export async function assertRuntimeRoleSafe(config: ConfigService): Promise<void> {
  const nodeEnv = config.get<string>('NODE_ENV', 'development');
  const databaseUrl = config.get<string>('DATABASE_URL');
  if (!databaseUrl) {
    const message = 'DATABASE_URL is not configured; skipping runtime role preflight.';
    if (nodeEnv === 'production') {
      throw new Error(message);
    }
    console.warn(`[preflight] ${message}`);
    return;
  }

  let role: RuntimeRoleCheck;
  try {
    const rows = await prisma.$queryRaw<RuntimeRoleCheck[]>`
      SELECT current_user AS "roleName",
             role.rolsuper AS "isSuperuser",
             role.rolbypassrls AS "bypassesRls",
             role.rolcreatedb AS "canCreateDb",
             role.rolcreaterole AS "canCreateRole",
             CASE
               WHEN to_regrole('rihal_migrator') IS NULL THEN false
               ELSE pg_has_role(current_user, 'rihal_migrator', 'MEMBER')
             END AS "isMigrationMember",
             has_table_privilege(current_user, 'users', 'DELETE') AS "canDeleteTenantRows",
             (to_regrole('rihal_migrator') IS NOT NULL) AS "migratorRoleExists"
      FROM pg_roles AS role
      WHERE role.rolname = current_user
    `;
    if (!rows[0]) {
      throw new Error('Unable to resolve the current database role.');
    }
    role = rows[0];
  } catch (error) {
    const message = `Runtime role preflight query failed: ${error instanceof Error ? error.message : String(error)}`;
    if (nodeEnv === 'production') {
      throw new Error(message);
    }
    console.warn(`[preflight] ${message}`);
    return;
  }

  const violations: string[] = [];
  if (role.isSuperuser) violations.push('superuser');
  if (role.bypassesRls) violations.push('BYPASSRLS');
  if (role.canCreateDb) violations.push('CREATEDB');
  if (role.canCreateRole) violations.push('CREATEROLE');
  if (role.isMigrationMember) violations.push('rihal_migrator membership');
  if (role.canDeleteTenantRows) violations.push('DELETE on tenant tables');
  if (!role.migratorRoleExists) violations.push('rihal_migrator role is not provisioned');

  if (violations.length > 0) {
    const message = `Unsafe runtime database role (${role.roleName}): ${violations.join(', ')}.`;
    if (nodeEnv === 'production') {
      throw new Error(message);
    }
    console.warn(`[preflight] ${message}`);
  }
}