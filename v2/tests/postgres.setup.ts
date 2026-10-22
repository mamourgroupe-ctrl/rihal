import EmbeddedPostgres from 'embedded-postgres';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TestProject } from 'vitest/node';
import { createPrismaClient } from '../packages/database/src';
import { seedPlaceholders } from './fixtures';
import type { TestDatabaseConnections } from './database-context';

async function availablePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Cannot reserve a test database port.');
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

export default async function setup(project: TestProject) {
  // embedded-postgres's default beforeExit hook hard-codes exit status 0, which
  // can hide failing Vitest runs. Vitest owns normal teardown; retain the
  // library's signal cleanup hooks but remove its normal-exit handlers.
  const require = createRequire(import.meta.url);
  const embeddedRequire = createRequire(require.resolve('embedded-postgres'));
  const exitHook = embeddedRequire('async-exit-hook') as { unhookEvent(event: string): void };
  exitHook.unhookEvent('beforeExit');
  exitHook.unhookEvent('exit');

  const root = fileURLToPath(new URL('../', import.meta.url));
  await mkdir(join(root, '.cache'), { recursive: true });
  const directory = await mkdtemp(join(root, '.cache', 'postgres-test-'));
  const port = await availablePort();
  const logs: string[] = [];
  const postgres = new EmbeddedPostgres({
    databaseDir: join(directory, 'data'),
    port,
    user: 'rihal_v2_test_bootstrap',
    password: '',
    // No credentials: this private disposable cluster uses trust on loopback.
    initdbFlags: ['--auth=trust'],
    postgresFlags: ['-h', '127.0.0.1', '-k', directory],
    persistent: false,
    createPostgresUser: false,
    onLog: (message) => { logs.push(message); },
    onError: (message) => { logs.push(String(message)); },
  });

  const url = (role: string, database = 'rihal_v2_test') =>
    `postgresql://${role}@127.0.0.1:${port}/${database}`;
  const connections: TestDatabaseConnections = {
    runtimeUrl: url('rihal_v2_test_app'),
    ownerUrl: url('rihal_v2_test_owner'),
    platformUrl: url('rihal_v2_test_platform_operator'),
    bootstrapUrl: url('rihal_v2_test_bootstrap'),
  };
  const oldTemporaryDirectory = process.env.TMPDIR;
  // Keep initdb's temporary files within v2 as well.
  process.env.TMPDIR = directory;

  try {
    try {
      await postgres.initialise();
    } finally {
      if (oldTemporaryDirectory === undefined) delete process.env.TMPDIR;
      else process.env.TMPDIR = oldTemporaryDirectory;
    }
    await postgres.start();
    const bootstrap = postgres.getPgClient('postgres', '127.0.0.1');
    await bootstrap.connect();
    try {
      await bootstrap.query(`
        CREATE ROLE rihal_v2_test_owner LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
        CREATE ROLE rihal_v2_test_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
        CREATE ROLE rihal_v2_test_platform_operator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
      `);
      await bootstrap.query('CREATE DATABASE rihal_v2_test OWNER rihal_v2_test_owner');
      await bootstrap.query(await readFile(join(root, 'packages/database/prisma/bootstrap-roles.sql'), 'utf8'));
    } finally {
      await bootstrap.end();
    }

    const admin = postgres.getPgClient('rihal_v2_test', '127.0.0.1');
    await admin.connect();
    try {
      // Apply the actual checked-in migration SQL with a non-superuser owner.
      await admin.query('SET ROLE rihal_v2_test_owner');
      await admin.query('BEGIN');
      await admin.query(await readFile(join(root, 'packages/database/prisma/migrations/20261010000000_initial/migration.sql'), 'utf8'));
      await admin.query('COMMIT');
      await admin.query('RESET ROLE');
      const fixtureClient = createPrismaClient(connections.bootstrapUrl);
      try {
        await seedPlaceholders(fixtureClient);
      } finally {
        await fixtureClient.$disconnect();
      }
      await admin.query('SET ROLE rihal_v2_test_owner');
      await admin.query(await readFile(join(root, 'packages/database/prisma/migrations/20261010000100_tenant_rls/migration.sql'), 'utf8'));
      // Reapplying the standalone file also verifies policy idempotency.
      await admin.query(await readFile(join(root, 'packages/database/prisma/rls.sql'), 'utf8'));
      await admin.query('RESET ROLE');
      await admin.query(`
        GRANT USAGE ON SCHEMA public TO rihal_v2_test_app, rihal_v2_test_platform_operator;
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rihal_v2_test_app;
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO rihal_v2_test_platform_operator;
        GRANT INSERT, UPDATE, DELETE ON tenants TO rihal_v2_test_platform_operator;
        GRANT rihal_v2_platform_admin TO rihal_v2_test_platform_operator;
      `);
    } finally {
      await admin.query('ROLLBACK').catch(() => undefined);
      await admin.end();
    }
    project.provide('database', connections);
  } catch (error) {
    await postgres.stop();
    await rm(directory, { recursive: true, force: true });
    throw new Error(`Disposable PostgreSQL setup failed.\n${logs.join('')}`, { cause: error });
  }

  return async () => {
    await postgres.stop();
    await rm(directory, { recursive: true, force: true });
  };
}
