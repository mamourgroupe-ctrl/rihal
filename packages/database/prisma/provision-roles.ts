import { appendFileSync, readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

function quoteSqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function connectionUrl(adminUrl: string, role: string, password: string): string {
  const url = new URL(adminUrl);
  url.username = role;
  url.password = password;
  if (!url.searchParams.has('schema')) {
    url.searchParams.set('schema', 'public');
  }
  return url.toString();
}

async function provisionRoles(): Promise<void> {
  const adminUrl = process.env.ADMIN_DATABASE_URL;
  if (!adminUrl) {
    throw new Error('ADMIN_DATABASE_URL is required for one-time role provisioning.');
  }

  const githubEnv = process.env.GITHUB_ENV;
  const suppliedAppPassword = process.env.APP_ROLE_PASSWORD;
  const suppliedMigratorPassword = process.env.MIGRATOR_ROLE_PASSWORD;
  if (Boolean(suppliedAppPassword) !== Boolean(suppliedMigratorPassword)) {
    throw new Error('Set both APP_ROLE_PASSWORD and MIGRATOR_ROLE_PASSWORD, or neither.');
  }

  const appPassword = suppliedAppPassword ?? (githubEnv ? randomBytes(32).toString('base64url') : undefined);
  const migratorPassword = suppliedMigratorPassword ??
    (githubEnv ? randomBytes(32).toString('base64url') : undefined);
  const admin = new PrismaClient({
    datasources: { db: { url: adminUrl } },
    log: ['error'],
  });

  try {
    await admin.$connect();
    const bootstrapSql = readFileSync(resolve(process.cwd(), 'prisma/roles-bootstrap.sql'), 'utf8');
    await admin.$executeRawUnsafe(bootstrapSql);

    if (appPassword && migratorPassword) {
      await admin.$executeRawUnsafe(`ALTER ROLE rihal_app PASSWORD ${quoteSqlLiteral(appPassword)}`);
      await admin.$executeRawUnsafe(`ALTER ROLE rihal_migrator PASSWORD ${quoteSqlLiteral(migratorPassword)}`);

      if (githubEnv) {
        const runtimeUrl = connectionUrl(adminUrl, 'rihal_app', appPassword);
        const migrationUrl = connectionUrl(adminUrl, 'rihal_migrator', migratorPassword);
        appendFileSync(githubEnv, `DATABASE_URL=${runtimeUrl}\nDIRECT_URL=${migrationUrl}\n`);
      }
    }
  } finally {
    await admin.$disconnect();
  }

  console.info(
    githubEnv && appPassword && migratorPassword
      ? 'Database roles provisioned; ephemeral CI connection URLs were added to the job environment.'
      : 'Database roles provisioned. Set role passwords through the deployment secret manager before connecting.',
  );
}

provisionRoles().catch(() => {
  // Do not expose database URLs, role passwords, or provider errors in CI logs.
  console.error('Database role provisioning failed. Check admin connectivity and role/bootstrap privileges.');
  process.exitCode = 1;
});
