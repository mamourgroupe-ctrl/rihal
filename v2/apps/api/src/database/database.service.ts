import { AsyncLocalStorage } from 'node:async_hooks';
import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { assertTenantId, createPrismaClient, Prisma, setLocalTenantId, type PrismaClient } from '@rihal-v2/database';

export const DATABASE_URL = Symbol('RIHAL_V2_DATABASE_URL');

interface TenantTransactionScope {
  tenantId: string;
  tx: Prisma.TransactionClient;
  active: boolean;
}

/** Business services use client, never a global/unscoped Prisma singleton. */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly prisma: PrismaClient;
  private readonly scope = new AsyncLocalStorage<TenantTransactionScope>();

  constructor(@Inject(DATABASE_URL) connectionString: string) {
    this.prisma = createPrismaClient(connectionString);
  }

  get client(): Prisma.TransactionClient {
    return this.activeScope().tx;
  }

  get tenantId(): string {
    return this.activeScope().tenantId;
  }

  async runInTenantTransaction<T>(tenantId: string, action: () => T | Promise<T>): Promise<T> {
    assertTenantId(tenantId);
    if (this.scope.getStore()?.active) {
      throw new Error('Nested tenant transactions are not allowed; use the active client.');
    }

    return this.prisma.$transaction(async (tx) => {
      await setLocalTenantId(tx, tenantId);
      const context: TenantTransactionScope = { tenantId, tx, active: true };
      try {
        return await this.scope.run(context, action);
      } finally {
        // Detached promises/timers can retain an ALS store after the request.
        // Do not expose a completed transaction to that work.
        context.active = false;
      }
    }, { maxWait: 5_000, timeout: 15_000 });
  }

  /** Fail closed if somebody accidentally configures privileged credentials. */
  async onModuleInit(): Promise<void> {
    const tables = Prisma.dmmf.datamodel.models.map((model) => model.dbName ?? model.name);
    const roles = await this.prisma.$queryRaw<{
      privileged: boolean; platformAdmin: boolean; ownsTables: boolean;
    }[]>(Prisma.sql`
      SELECT
        EXISTS (
          SELECT 1 FROM pg_roles privileged_role
          WHERE (privileged_role.rolsuper OR privileged_role.rolbypassrls
            OR privileged_role.rolcreaterole OR privileged_role.rolcreatedb OR privileged_role.rolreplication)
            AND pg_has_role(current_user, privileged_role.oid, 'member')
        ) AS privileged,
        pg_has_role(current_user, 'rihal_v2_platform_admin', 'member') AS "platformAdmin",
        EXISTS (
          SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relname::text IN (${Prisma.join(tables)})
            AND pg_has_role(current_user, c.relowner, 'member')
        ) AS "ownsTables"
    `);
    const role = roles[0];
    if (!role || role.privileged || role.platformAdmin || role.ownsTables) {
      throw new Error('Runtime database role must be non-owner, unprivileged, NOBYPASSRLS, and not a platform admin.');
    }

    const protection = await this.prisma.$queryRaw<{
      enabled: boolean; forced: boolean; policies: number; truncate: boolean;
    }[]>(Prisma.sql`
      SELECT c.relrowsecurity AS enabled, c.relforcerowsecurity AS forced,
        (SELECT count(*)::int FROM pg_policy p WHERE p.polrelid=c.oid) AS policies,
        has_table_privilege(current_user, c.oid, 'TRUNCATE') AS truncate
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r' AND c.relname::text IN (${Prisma.join(tables)})
    `);
    if (protection.length !== tables.length || protection.some((table) =>
      !table.enabled || !table.forced || table.policies === 0 || table.truncate)) {
      throw new Error('Runtime requires complete ENABLE/FORCE RLS policies and no TRUNCATE privilege.');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
    this.scope.disable();
  }

  private activeScope(): TenantTransactionScope {
    const context = this.scope.getStore();
    if (!context?.active) {
      throw new Error('No active tenant transaction; use TenantInterceptor or runInTenantTransaction.');
    }
    return context;
  }
}
