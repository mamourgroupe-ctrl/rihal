import { readFile } from 'node:fs/promises';
import { Pool, type PoolClient } from 'pg';
import { getDMMF } from '@prisma/internals';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { assertTenantId, createPrismaClient, Prisma, setLocalTenantId, type PrismaClient } from '../src';
import {
  ids, insertValues, TENANT_A, TENANT_B, TENANT_TABLES,
  type FixtureTenant, type TenantTable,
} from '../../../tests/fixtures';
import type { TestDatabaseConnections } from '../../../tests/database-context';

const quote = (identifier: string) => `"${identifier.replaceAll('"', '""')}"`;

async function insertRow(client: PoolClient, table: TenantTable, values: Record<string, unknown>) {
  const entries = Object.entries(values);
  return client.query<{ id: string; tenantId: string }>(
    `INSERT INTO ${quote(table)} (${entries.map(([key]) => quote(key)).join(', ')})
     VALUES (${entries.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id, "tenantId"`,
    entries.map(([, value]) => value),
  );
}

/** Always rolls back: mutations and failed statements cannot contaminate fixtures. */
async function withTenant<T>(pool: Pool, tenantId: FixtureTenant, action: (client: PoolClient) => Promise<T>) {
  assertTenantId(tenantId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
    return await action(client);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
}

interface RelationshipCase {
  label: string;
  table: TenantTable;
  override: Record<string, unknown>;
}
const a = ids(TENANT_A);
const b = ids(TENANT_B);
const relationshipCases: RelationshipCase[] = [
  { label: 'Booking → Person', table: 'bookings', override: { personId: b.extraPerson } },
  { label: 'Booking → Trip', table: 'bookings', override: { tripId: b.trip } },
  { label: 'Group → Trip', table: 'groups', override: { tripId: b.trip } },
  { label: 'GroupMember → Trip', table: 'group_members', override: { tripId: b.otherTrip } },
  { label: 'GroupMember → Group', table: 'group_members', override: { groupId: b.otherGroup } },
  { label: 'GroupMember → Booking', table: 'group_members', override: { bookingId: b.otherBooking } },
  { label: 'Document → Person', table: 'documents', override: { personId: b.person, bookingId: null } },
  { label: 'Document → Booking', table: 'documents', override: { bookingId: b.booking } },
  { label: 'Document → uploader', table: 'documents', override: { uploadedById: b.user } },
  { label: 'Document → verifier', table: 'documents', override: { verifiedById: b.user } },
  { label: 'Invoice → Booking', table: 'invoices', override: { bookingId: b.booking } },
  { label: 'Notification → User', table: 'notifications', override: { userId: b.user } },
  { label: 'Notification → Person', table: 'notifications', override: { personId: b.person } },
  { label: 'Notification → Booking', table: 'notifications', override: { bookingId: b.booking } },
  { label: 'AuditLog → actor', table: 'audit_logs', override: { actorUserId: b.user } },
];

describe('PostgreSQL tenant isolation (real PostgreSQL, no RLS mocks)', () => {
  let runtime: Pool;
  let owner: Pool;
  let platform: Pool;
  let prisma: PrismaClient;
  let connections: TestDatabaseConnections;

  beforeAll(() => {
    connections = inject('database');
    // max=1 deliberately exercises reuse of the exact same pooled connection.
    runtime = new Pool({ connectionString: connections.runtimeUrl, max: 1, idleTimeoutMillis: 0 });
    owner = new Pool({ connectionString: connections.ownerUrl, max: 1, idleTimeoutMillis: 0 });
    platform = new Pool({ connectionString: connections.platformUrl, max: 1, idleTimeoutMillis: 0 });
    prisma = createPrismaClient(connections.runtimeUrl);
  });

  afterAll(async () => {
    await Promise.all([runtime.end(), owner.end(), platform.end(), prisma.$disconnect()]);
  });

  it('uses PostgreSQL 16 and non-superuser, NOBYPASSRLS runtime/owner roles', async () => {
    const version = await owner.query<{ version: number }>("SELECT current_setting('server_version_num')::int AS version");
    expect(version.rows[0]?.version).toBeGreaterThanOrEqual(160000);
    expect(version.rows[0]?.version).toBeLessThan(170000);
    for (const pool of [runtime, owner]) {
      const result = await pool.query<{ superuser: boolean; bypass: boolean; admin: boolean }>(`
        SELECT rolsuper AS superuser, rolbypassrls AS bypass,
               pg_has_role(current_user, 'rihal_v2_platform_admin', 'member') AS admin
        FROM pg_roles WHERE rolname = current_user
      `);
      expect(result.rows).toEqual([{ superuser: false, bypass: false, admin: false }]);
    }
  });

  it('ENABLEs and FORCEs RLS and installs policies on all 11 schema tables', async () => {
    const expected = ['tenants', ...TENANT_TABLES].sort();
    const result = await owner.query<{
      table: string; enabled: boolean; forced: boolean; owner: string; policies: number;
    }>(`
      SELECT c.relname::text AS "table", c.relrowsecurity AS enabled,
             c.relforcerowsecurity AS forced, pg_get_userbyid(c.relowner)::text AS owner,
             (SELECT count(*)::int FROM pg_policy p WHERE p.polrelid = c.oid) AS policies
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY c.relname
    `);
    expect(result.rows.map((row) => row.table)).toEqual(expected);
    for (const row of result.rows) {
      expect(row.enabled, row.table).toBe(true);
      expect(row.forced, row.table).toBe(true);
      expect(row.owner, row.table).toBe('rihal_v2_test_owner');
      expect(row.policies, row.table).toBeGreaterThan(0);
    }
    expect(Prisma.dmmf.datamodel.models.map((model) => model.dbName ?? model.name).sort()).toEqual(expected);
  });

  it('deploys the same composite FKs described by the Prisma schema', async () => {
    // Prisma's runtime DMMF omits FK metadata; use its full WASM schema parser.
    const schema = await readFile(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');
    const dmmf = await getDMMF({ datamodel: schema });
    const models = new Map(dmmf.datamodel.models.map((model) => [model.name, model]));
    const expected: string[] = [];
    for (const model of models.values()) {
      for (const field of model.fields) {
        if (field.kind !== 'object' || !field.relationFromFields?.length) continue;
        const target = models.get(field.type);
        if (!target) throw new Error(`Missing relation target ${field.type}`);
        if (target.name !== 'Tenant') {
          expect(field.relationFromFields).toContain('tenantId');
          expect(field.relationToFields).toContain('tenantId');
        }
        expected.push(`${model.dbName ?? model.name}(${field.relationFromFields.join(',')})→${target.dbName ?? target.name}(${field.relationToFields?.join(',')})`);
      }
    }
    const actual = await owner.query<{ source: string; target: string; from: string[]; to: string[] }>(`
      SELECT c.relname::text AS source, t.relname::text AS target,
        ARRAY(SELECT a.attname::text FROM unnest(k.conkey) WITH ORDINALITY AS key(attnum, position)
              JOIN pg_attribute a ON a.attrelid=k.conrelid AND a.attnum=key.attnum ORDER BY key.position) AS "from",
        ARRAY(SELECT a.attname::text FROM unnest(k.confkey) WITH ORDINALITY AS key(attnum, position)
              JOIN pg_attribute a ON a.attrelid=k.confrelid AND a.attnum=key.attnum ORDER BY key.position) AS "to"
      FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid
      JOIN pg_class t ON t.oid=k.confrelid
      WHERE k.contype='f' AND c.relnamespace='public'::regnamespace
    `);
    expect(actual.rows.map((row) => `${row.source}(${row.from.join(',')})→${row.target}(${row.to.join(',')})`).sort()).toEqual(expected.sort());
    expect(actual.rows).toHaveLength(25);
  });

  it('keeps the standalone RLS file identical to its deployable migration', async () => {
    const standalone = await readFile(new URL('../prisma/rls.sql', import.meta.url), 'utf8');
    const migration = await readFile(new URL('../prisma/migrations/20261010000100_tenant_rls/migration.sql', import.meta.url), 'utf8');
    expect(standalone).toBe(migration);
  });

  it('can reapply policies without losing protection or creating duplicate policies', async () => {
    const policies = 'SELECT tablename, policyname, cmd, qual, with_check FROM pg_policies WHERE schemaname=\'public\' ORDER BY tablename, policyname';
    const before = (await owner.query(policies)).rows;
    const sql = await readFile(new URL('../prisma/rls.sql', import.meta.url), 'utf8');
    await owner.query(sql);
    await owner.query(sql);
    expect((await owner.query(policies)).rows).toEqual(before);
    expect(before).toHaveLength(12);
  });

  it.each(TENANT_TABLES)('denies cross-tenant reads on %s', async (table) => {
    await withTenant(runtime, TENANT_A, async (client) => {
      // Intentionally omit application filters: RLS must do the isolation.
      const visible = await client.query<{ tenantId: string }>(`SELECT "tenantId" FROM ${quote(table)}`);
      expect(visible.rows.length).toBeGreaterThan(0);
      expect(visible.rows.every((row) => row.tenantId === TENANT_A)).toBe(true);
      const forbidden = await client.query(`SELECT * FROM ${quote(table)} WHERE "tenantId"=$1`, [TENANT_B]);
      // PostgreSQL hides denied rows; a forbidden SELECT does not throw.
      expect(forbidden.rows).toEqual([]);
    });
  });

  it.each(TENANT_TABLES)('denies cross-tenant inserts on %s (SQLSTATE 42501)', async (table) => {
    await expect(withTenant(runtime, TENANT_A, (client) => insertRow(client, table, insertValues(table, TENANT_B))))
      .rejects.toMatchObject({ code: '42501' });
  });

  it.each(TENANT_TABLES)('cannot update or delete hidden tenant rows in %s', async (table) => {
    await withTenant(runtime, TENANT_A, async (client) => {
      const update = await client.query(`UPDATE ${quote(table)} SET id=id WHERE "tenantId"=$1`, [TENANT_B]);
      const remove = await client.query(`DELETE FROM ${quote(table)} WHERE "tenantId"=$1`, [TENANT_B]);
      expect(update.rowCount).toBe(0);
      expect(remove.rowCount).toBe(0);
    });
  });

  it('WITH CHECK prevents moving an existing own-tenant row to another tenant', async () => {
    await expect(withTenant(runtime, TENANT_A, async (client) => {
      const row = await insertRow(client, 'people', insertValues('people', TENANT_A));
      return client.query('UPDATE people SET "tenantId"=$1 WHERE id=$2', [TENANT_B, row.rows[0]?.id]);
    })).rejects.toMatchObject({ code: '42501' });
  });

  it.each(relationshipCases)('rejects a cross-tenant $label relationship (SQLSTATE 23503)', async ({ table, override }) => {
    // The row itself belongs to A, so RLS passes; only the composite FK can deny it.
    await expect(withTenant(runtime, TENANT_A, (client) =>
      insertRow(client, table, { ...insertValues(table, TENANT_A), ...override })))
      .rejects.toMatchObject({ code: '23503' });
  });

  it('rejects a same-tenant group membership pointing at a different trip', async () => {
    await expect(withTenant(runtime, TENANT_A, (client) => insertRow(client, 'group_members', {
      ...insertValues('group_members', TENANT_A), groupId: a.group,
    }))).rejects.toMatchObject({ code: '23503' });
  });

  it('rejects a same-tenant booking in a group from a different trip', async () => {
    await expect(withTenant(runtime, TENANT_A, (client) => insertRow(client, 'group_members', {
      ...insertValues('group_members', TENANT_A), bookingId: a.booking,
    }))).rejects.toMatchObject({ code: '23503' });
  });

  it('rejects a document attached to another person\'s booking within the same tenant', async () => {
    await expect(withTenant(runtime, TENANT_A, (client) => insertRow(client, 'documents', {
      ...insertValues('documents', TENANT_A), personId: a.extraPerson,
    }))).rejects.toMatchObject({ code: '23503' });
  });

  it.each(TENANT_TABLES)('allows valid same-tenant inserts and reads on %s', async (table) => {
    for (const tenantId of [TENANT_A, TENANT_B] as const) {
      await withTenant(runtime, tenantId, async (client) => {
        const inserted = await insertRow(client, table, insertValues(table, tenantId));
        expect(inserted.rows).toEqual([{ id: insertValues(table, tenantId).id, tenantId }]);
        const read = await client.query(`SELECT id, "tenantId" FROM ${quote(table)} WHERE id=$1`, [inserted.rows[0]?.id]);
        expect(read.rows).toEqual(inserted.rows);
      });
    }
  });

  it('allows same-tenant updates and deletes of an unreferenced person', async () => {
    await withTenant(runtime, TENANT_A, async (client) => {
      const inserted = await insertRow(client, 'people', insertValues('people', TENANT_A));
      const update = await client.query('UPDATE people SET "fullName"=$1 WHERE id=$2 RETURNING "fullName"', ['Synthetic Updated', inserted.rows[0]?.id]);
      expect(update.rows).toEqual([{ fullName: 'Synthetic Updated' }]);
      const remove = await client.query('DELETE FROM people WHERE id=$1', [inserted.rows[0]?.id]);
      expect(remove.rowCount).toBe(1);
    });
  });

  it('keeps journey status on Booking, not Person, for repeat trips', async () => {
    await withTenant(runtime, TENANT_A, async (client) => {
      await client.query('UPDATE bookings SET status=\'COMPLETED\' WHERE id=$1', [a.booking]);
      const bookings = await client.query('SELECT id,status FROM bookings WHERE "personId"=$1 ORDER BY id', [a.person]);
      expect(bookings.rows).toEqual([{ id: a.booking, status: 'COMPLETED' }, { id: a.otherBooking, status: 'DRAFT' }]);
      expect(Prisma.dmmf.datamodel.models.find((model) => model.name === 'Person')?.fields.some((field) => field.name === 'status')).toBe(false);
    });
  });

  it.each(TENANT_TABLES)('fails closed without a tenant context on %s', async (table) => {
    const read = await runtime.query(`SELECT * FROM ${quote(table)}`);
    expect(read.rows).toEqual([]);
    const client = await runtime.connect();
    try {
      await expect(insertRow(client, table, insertValues(table, TENANT_A))).rejects.toMatchObject({ code: '42501' });
    } finally {
      client.release();
    }
  });

  it('fails closed for an empty tenant context', async () => {
    const client = await runtime.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL app.current_tenant_id = ''");
      expect((await client.query('SELECT * FROM people')).rows).toEqual([]);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });

  it('FORCE RLS subjects the actual non-superuser table owner to read isolation', async () => {
    expect((await owner.query('SELECT * FROM people')).rows).toEqual([]);
    await withTenant(owner, TENANT_A, async (client) => {
      const rows = (await client.query<{ tenantId: string }>('SELECT "tenantId" FROM people')).rows;
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((row) => row.tenantId === TENANT_A)).toBe(true);
      expect((await client.query('SELECT * FROM people WHERE "tenantId"=$1', [TENANT_B])).rows).toEqual([]);
    });
  });

  it('FORCE RLS rejects a cross-tenant write by the actual table owner', async () => {
    await expect(withTenant(owner, TENANT_A, (client) => insertRow(client, 'people', insertValues('people', TENANT_B))))
      .rejects.toMatchObject({ code: '42501' });
  });

  it('denies tenant-registry access even with the runtime tenant scope', async () => {
    await withTenant(runtime, TENANT_A, async (client) => {
      expect((await client.query('SELECT * FROM tenants')).rows).toEqual([]);
      expect((await client.query('UPDATE tenants SET name=name WHERE id=$1', [TENANT_A])).rowCount).toBe(0);
      expect((await client.query('DELETE FROM tenants WHERE id=$1', [TENANT_A])).rowCount).toBe(0);
    });
    await expect(withTenant(runtime, TENANT_A, (client) => client.query(
      'INSERT INTO tenants (id,name,slug,"updatedAt") VALUES ($1,$2,$3,now())',
      ['tenant-new-placeholder', 'Placeholder', 'placeholder-new'],
    ))).rejects.toMatchObject({ code: '42501' });
  });

  it('does not elevate a runtime connection through a forged platform-admin GUC', async () => {
    await withTenant(runtime, TENANT_A, async (client) => {
      await client.query("SET LOCAL app.is_platform_admin = 'true'");
      expect((await client.query('SELECT * FROM tenants')).rows).toEqual([]);
      await expect(client.query('SET LOCAL ROLE rihal_v2_platform_admin')).rejects.toMatchObject({ code: '42501' });
    });
  });

  it('allows tenant-registry CRUD only for a real platform-admin database role', async () => {
    const client = await platform.connect();
    try {
      await client.query('BEGIN');
      expect((await client.query('SELECT id FROM tenants ORDER BY id')).rows).toEqual([{ id: TENANT_A }, { id: TENANT_B }]);
      await client.query('INSERT INTO tenants (id,name,slug,"updatedAt") VALUES ($1,$2,$3,now())', ['tenant-admin-placeholder', 'Placeholder Admin Tenant', 'placeholder-admin']);
      expect((await client.query('UPDATE tenants SET name=$1 WHERE id=$2', ['Synthetic Updated', 'tenant-admin-placeholder'])).rowCount).toBe(1);
      expect((await client.query('DELETE FROM tenants WHERE id=$1', ['tenant-admin-placeholder'])).rowCount).toBe(1);
      // Platform-admin membership is not a blanket bypass of agency data RLS.
      expect((await client.query('SELECT * FROM people')).rows).toEqual([]);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });

  it('keeps audit logs append-only even for the RLS-subject table owner', async () => {
    for (const pool of [runtime, owner]) {
      await withTenant(pool, TENANT_A, async (client) => {
        expect((await client.query('UPDATE audit_logs SET action=$1 WHERE id=$2', ['synthetic.changed', a.audit])).rowCount).toBe(0);
        expect((await client.query('DELETE FROM audit_logs WHERE id=$1', [a.audit])).rowCount).toBe(0);
        expect((await client.query('SELECT id FROM audit_logs WHERE id=$1', [a.audit])).rows).toEqual([{ id: a.audit }]);
      });
    }
  });

  it('does not grant TRUNCATE to the runtime role (RLS cannot protect TRUNCATE)', async () => {
    await expect(runtime.query('TRUNCATE audit_logs')).rejects.toMatchObject({ code: '42501' });
  });

  it.each(['COMMIT', 'ROLLBACK'] as const)('SET LOCAL is cleared after %s on a reused pooled connection', async (finish) => {
    const first = await runtime.connect();
    let pid: number | undefined;
    try {
      pid = (await first.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]?.pid;
      await first.query('BEGIN');
      await first.query(`SET LOCAL app.current_tenant_id = '${TENANT_A}'`);
      expect((await first.query('SELECT * FROM people')).rows.length).toBeGreaterThan(0);
      await first.query(finish);
    } finally {
      await first.query('ROLLBACK');
      first.release();
    }
    const next = await runtime.connect();
    try {
      expect((await next.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]?.pid).toBe(pid);
      expect((await next.query('SELECT * FROM people')).rows).toEqual([]);
      await next.query('BEGIN');
      await next.query(`SET LOCAL app.current_tenant_id = '${TENANT_B}'`);
      const rows = (await next.query<{ tenantId: string }>('SELECT "tenantId" FROM people')).rows;
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((row) => row.tenantId === TENANT_B)).toBe(true);
    } finally {
      await next.query('ROLLBACK');
      next.release();
    }
  });

  it('isolates ORM queries and composite links through the actual Prisma client', async () => {
    await prisma.$transaction(async (tx) => {
      await setLocalTenantId(tx, TENANT_A);
      expect(await tx.person.findUnique({ where: { id: b.person } })).toBeNull();
      const people = await tx.person.findMany();
      expect(people.length).toBeGreaterThan(0);
      expect(people.every((person) => person.tenantId === TENANT_A)).toBe(true);
    });
    await expect(prisma.$transaction(async (tx) => {
      await setLocalTenantId(tx, TENANT_A);
      return tx.booking.create({ data: { id: 'prisma-cross-link', tenantId: TENANT_A, personId: b.extraPerson, tripId: a.trip, bookingReference: 'synthetic-cross-link' } });
    })).rejects.toMatchObject({ code: 'P2003' });
    expect(await prisma.person.findMany()).toEqual([]);
  });

  it.each(['', 'tenant-alpha\n', "tenant-alpha'; RESET ROLE; --", 'x'.repeat(129)])('rejects unsafe/empty tenant IDs: %j', (value) => {
    expect(() => assertTenantId(value)).toThrow(TypeError);
  });
});
