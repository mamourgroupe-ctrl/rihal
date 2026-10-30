import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient } from '@rihal/database';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const applicationDatabaseUrl = process.env.TEST_DATABASE_URL ??
  (process.env.CI === 'true' ? process.env.DATABASE_URL : undefined);
const fixtureDatabaseUrl = process.env.TEST_ADMIN_DATABASE_URL ??
  (process.env.CI === 'true' ? process.env.ADMIN_DATABASE_URL : undefined);
const canRunIntegrationTests = Boolean(applicationDatabaseUrl && fixtureDatabaseUrl);

const tenantTables = [
  'users',
  'pilgrims',
  'groups',
  'group_members',
  'documents',
  'invoices',
  'invoice_items',
  'notifications',
  'auth_sessions',
  'refresh_tokens',
  'password_reset_tokens',
] as const;

interface TenantRowIdentity {
  id: string;
  tenantId: string;
}

interface TenantTableCase {
  table: (typeof tenantTables)[number];
  ownId: string;
  foreignId: string;
  read: (tx: Prisma.TransactionClient) => Promise<TenantRowIdentity[]>;
  updateForeign: (tx: Prisma.TransactionClient) => Promise<{ count: number }>;
  moveOwnToForeign: (tx: Prisma.TransactionClient) => Promise<{ count: number }>;
  deleteForeign: (tx: Prisma.TransactionClient) => Promise<{ count: number }>;
  insertForeign: (tx: Prisma.TransactionClient) => Promise<unknown>;
  foreignCount: () => Promise<number>;
}

let appPrisma: PrismaClient | undefined;
let fixturePrisma: PrismaClient | undefined;
let tenantAId = '';
let tenantBId = '';
let subscriptionPlanId = '';
let permissionCode = '';
let foreignUserId = '';
let foreignRoleId = '';
let tableCases: TenantTableCase[] = [];

function appDb(): PrismaClient {
  if (!appPrisma) {
    throw new Error('The PostgreSQL application client is not initialized.');
  }
  return appPrisma;
}

function fixtureDb(): PrismaClient {
  if (!fixturePrisma) {
    throw new Error('The PostgreSQL fixture client is not initialized.');
  }
  return fixturePrisma;
}

async function withTenant<T>(
  tenantId: string,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return appDb().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
    return operation(tx);
  });
}

async function createFixtures(): Promise<void> {
  const [tenantA, tenantB] = await Promise.all([
    fixtureDb().tenant.create({
      data: { name: 'Synthetic RLS tenant A', slug: `rls-a-${randomUUID()}` },
      select: { id: true },
    }),
    fixtureDb().tenant.create({
      data: { name: 'Synthetic RLS tenant B', slug: `rls-b-${randomUUID()}` },
      select: { id: true },
    }),
  ]);
  tenantAId = tenantA.id;
  tenantBId = tenantB.id;

  const createTenantFixtures = async (tenantId: string, label: string) => {
    const user = await fixtureDb().user.create({
      data: {
        tenantId,
        email: `rls-${label}-${randomUUID()}@seed.invalid`,
        passwordHash: 'NOT_A_REAL_PASSWORD_HASH',
        name: `Synthetic RLS user ${label}`,
        role: 'VIEWER',
      },
      select: { id: true },
    });
    const pilgrim = await fixtureDb().pilgrim.create({
      data: {
        tenantId,
        fullNameAr: `معتمر اختبار ${label}`,
        fullNameEn: `Synthetic RLS pilgrim ${label}`,
        passportNumber: `RLS-${label}-${randomUUID()}`,
        passportExpiry: new Date('2035-01-01T00:00:00.000Z'),
        nationality: 'DZ',
      },
      select: { id: true },
    });
    const group = await fixtureDb().group.create({
      data: { tenantId, name: `Synthetic RLS group ${label}` },
      select: { id: true },
    });
    const membership = await fixtureDb().groupMember.create({
      data: { tenantId, groupId: group.id, pilgrimId: pilgrim.id },
      select: { id: true },
    });
    const document = await fixtureDb().document.create({
      data: {
        tenantId,
        pilgrimId: pilgrim.id,
        type: 'PASSPORT',
        storageKey: `private-test/rls/${label}/document`,
        fileName: 'synthetic-passport.jpg',
        fileSize: 128,
        mimeType: 'image/jpeg',
      },
      select: { id: true },
    });
    const invoice = await fixtureDb().invoice.create({
      data: {
        tenantId,
        invoiceNumber: `RLS-${label}-${randomUUID()}`,
        customerName: `Synthetic customer ${label}`,
        amount: '1.00',
      },
      select: { id: true },
    });
    const invoiceItem = await fixtureDb().invoiceItem.create({
      data: {
        tenantId,
        invoiceId: invoice.id,
        description: `Synthetic RLS line ${label}`,
        quantity: 1,
        unitPrice: '1.00',
        lineTotal: '1.00',
      },
      select: { id: true },
    });
    const notification = await fixtureDb().notification.create({
      data: {
        tenantId,
        userId: user.id,
        channel: 'IN_APP',
        template: `synthetic-rls-${label}`,
        payload: { fixture: true },
      },
      select: { id: true },
    });
    const session = await fixtureDb().authSession.create({
      data: {
        tenantId,
        userId: user.id,
        expiresAt: new Date('2035-01-01T00:00:00.000Z'),
      },
      select: { id: true },
    });
    const refreshToken = await fixtureDb().refreshToken.create({
      data: {
        tenantId,
        sessionId: session.id,
        tokenHash: randomUUID().replaceAll('-', '').padEnd(64, 'a'),
        expiresAt: new Date('2035-01-01T00:00:00.000Z'),
      },
      select: { id: true },
    });
    const passwordResetToken = await fixtureDb().passwordResetToken.create({
      data: {
        tenantId,
        userId: user.id,
        tokenHash: randomUUID().replaceAll('-', '').padEnd(64, 'b'),
        expiresAt: new Date('2035-01-01T00:00:00.000Z'),
      },
      select: { id: true },
    });

    return {
      user: user.id,
      pilgrim: pilgrim.id,
      group: group.id,
      membership: membership.id,
      document: document.id,
      invoice: invoice.id,
      invoiceItem: invoiceItem.id,
      notification: notification.id,
      session: session.id,
      refreshToken: refreshToken.id,
      passwordResetToken: passwordResetToken.id,
      userId: user.id,
      pilgrimId: pilgrim.id,
      groupId: group.id,
      invoiceId: invoice.id,
      sessionId: session.id,
    };
  };

  const [own, foreign] = await Promise.all([
    createTenantFixtures(tenantAId, 'own'),
    createTenantFixtures(tenantBId, 'foreign'),
  ]);

  permissionCode = `rls.test.${randomUUID()}`;
  const plan = await fixtureDb().subscriptionPlan.create({
    data: {
      code: `rls-test-${randomUUID()}`,
      name: 'Synthetic RLS plan',
      billingInterval: 'MONTHLY',
      price: '1.00',
    },
    select: { id: true },
  });
  subscriptionPlanId = plan.id;
  await fixtureDb().permission.create({
    data: { code: permissionCode, name: 'Synthetic RLS permission' },
  });

  const [roleA, roleB] = await Promise.all([
    fixtureDb().tenantRole.create({
      data: { tenantId: tenantAId, code: 'RLS_TEST', name: 'Synthetic RLS role' },
      select: { id: true },
    }),
    fixtureDb().tenantRole.create({
      data: { tenantId: tenantBId, code: 'RLS_TEST', name: 'Synthetic RLS role' },
      select: { id: true },
    }),
  ]);
  foreignUserId = foreign.userId;
  foreignRoleId = roleB.id;
  await Promise.all([
    fixtureDb().tenantRolePermission.create({
      data: { tenantId: tenantAId, roleId: roleA.id, permissionCode },
    }),
    fixtureDb().tenantRolePermission.create({
      data: { tenantId: tenantBId, roleId: roleB.id, permissionCode },
    }),
    fixtureDb().userRole.create({
      data: { tenantId: tenantAId, userId: own.userId, roleId: roleA.id },
    }),
    fixtureDb().userRole.create({
      data: { tenantId: tenantBId, userId: foreign.userId, roleId: roleB.id },
    }),
    fixtureDb().agencySubscription.create({
      data: {
        tenantId: tenantAId,
        subscriptionPlanId,
        currentPeriodStart: new Date('2035-01-01T00:00:00.000Z'),
        currentPeriodEnd: new Date('2035-02-01T00:00:00.000Z'),
        price: '1.00',
      },
    }),
    fixtureDb().agencySubscription.create({
      data: {
        tenantId: tenantBId,
        subscriptionPlanId,
        currentPeriodStart: new Date('2035-01-01T00:00:00.000Z'),
        currentPeriodEnd: new Date('2035-02-01T00:00:00.000Z'),
        price: '1.00',
      },
    }),
  ]);

  const createForeignUser = (tx: Prisma.TransactionClient) => tx.user.create({
    data: {
      tenantId: tenantBId,
      email: `rls-denied-${randomUUID()}@seed.invalid`,
      passwordHash: 'NOT_A_REAL_PASSWORD_HASH',
      name: 'Synthetic denied user',
      role: 'VIEWER',
    },
  });
  const createForeignPilgrim = (tx: Prisma.TransactionClient) => tx.pilgrim.create({
    data: {
      tenantId: tenantBId,
      fullNameAr: 'معتمر مرفوض',
      fullNameEn: 'Synthetic denied pilgrim',
      passportNumber: `RLS-DENIED-${randomUUID()}`,
      passportExpiry: new Date('2035-01-01T00:00:00.000Z'),
      nationality: 'DZ',
    },
  });
  const createForeignGroup = (tx: Prisma.TransactionClient) => tx.group.create({
    data: { tenantId: tenantBId, name: `Synthetic denied group ${randomUUID()}` },
  });
  const createForeignMembership = (tx: Prisma.TransactionClient) => tx.groupMember.create({
    data: { tenantId: tenantBId, groupId: foreign.groupId, pilgrimId: foreign.pilgrimId },
  });
  const createForeignDocument = (tx: Prisma.TransactionClient) => tx.document.create({
    data: {
      tenantId: tenantBId,
      pilgrimId: foreign.pilgrimId,
      type: 'PASSPORT',
      storageKey: `private-test/rls/denied/${randomUUID()}`,
      fileName: 'denied-passport.jpg',
      fileSize: 128,
      mimeType: 'image/jpeg',
    },
  });
  const createForeignInvoice = (tx: Prisma.TransactionClient) => tx.invoice.create({
    data: {
      tenantId: tenantBId,
      invoiceNumber: `RLS-DENIED-${randomUUID()}`,
      customerName: 'Synthetic denied customer',
      amount: '1.00',
    },
  });
  const createForeignInvoiceItem = (tx: Prisma.TransactionClient) => tx.invoiceItem.create({
    data: {
      tenantId: tenantBId,
      invoiceId: foreign.invoiceId,
      description: 'Synthetic denied invoice line',
      quantity: 1,
      unitPrice: '1.00',
      lineTotal: '1.00',
    },
  });
  const createForeignNotification = (tx: Prisma.TransactionClient) => tx.notification.create({
    data: {
      tenantId: tenantBId,
      userId: foreign.userId,
      channel: 'IN_APP',
      template: `synthetic-denied-${randomUUID()}`,
      payload: { fixture: true },
    },
  });
  const createForeignSession = (tx: Prisma.TransactionClient) => tx.authSession.create({
    data: {
      tenantId: tenantBId,
      userId: foreign.userId,
      expiresAt: new Date('2035-01-01T00:00:00.000Z'),
    },
  });
  const createForeignRefreshToken = (tx: Prisma.TransactionClient) => tx.refreshToken.create({
    data: {
      tenantId: tenantBId,
      sessionId: foreign.sessionId,
      tokenHash: randomUUID().replaceAll('-', '').padEnd(64, 'c'),
      expiresAt: new Date('2035-01-01T00:00:00.000Z'),
    },
  });
  const createForeignPasswordResetToken = (tx: Prisma.TransactionClient) => tx.passwordResetToken.create({
    data: {
      tenantId: tenantBId,
      userId: foreign.userId,
      tokenHash: randomUUID().replaceAll('-', '').padEnd(64, 'd'),
      expiresAt: new Date('2035-01-01T00:00:00.000Z'),
    },
  });

  tableCases = [
    {
      table: 'users', ownId: own.user, foreignId: foreign.user,
      read: (tx) => tx.user.findMany({ select: { id: true, tenantId: true } }),
      updateForeign: (tx) => tx.user.updateMany({ where: { id: foreign.user }, data: { tenantId: tenantBId } }),
      moveOwnToForeign: (tx) => tx.user.updateMany({ where: { id: own.user }, data: { tenantId: tenantBId } }),
      deleteForeign: (tx) => tx.user.deleteMany({ where: { id: foreign.user } }),
      insertForeign: createForeignUser,
      foreignCount: () => fixtureDb().user.count({ where: { id: foreign.user } }),
    },
    {
      table: 'pilgrims', ownId: own.pilgrim, foreignId: foreign.pilgrim,
      read: (tx) => tx.pilgrim.findMany({ select: { id: true, tenantId: true } }),
      updateForeign: (tx) => tx.pilgrim.updateMany({ where: { id: foreign.pilgrim }, data: { tenantId: tenantBId } }),
      moveOwnToForeign: (tx) => tx.pilgrim.updateMany({ where: { id: own.pilgrim }, data: { tenantId: tenantBId } }),
      deleteForeign: (tx) => tx.pilgrim.deleteMany({ where: { id: foreign.pilgrim } }),
      insertForeign: createForeignPilgrim,
      foreignCount: () => fixtureDb().pilgrim.count({ where: { id: foreign.pilgrim } }),
    },
    {
      table: 'groups', ownId: own.group, foreignId: foreign.group,
      read: (tx) => tx.group.findMany({ select: { id: true, tenantId: true } }),
      updateForeign: (tx) => tx.group.updateMany({ where: { id: foreign.group }, data: { tenantId: tenantBId } }),
      moveOwnToForeign: (tx) => tx.group.updateMany({ where: { id: own.group }, data: { tenantId: tenantBId } }),
      deleteForeign: (tx) => tx.group.deleteMany({ where: { id: foreign.group } }),
      insertForeign: createForeignGroup,
      foreignCount: () => fixtureDb().group.count({ where: { id: foreign.group } }),
    },
    {
      table: 'group_members', ownId: own.membership, foreignId: foreign.membership,
      read: (tx) => tx.groupMember.findMany({ select: { id: true, tenantId: true } }),
      updateForeign: (tx) => tx.groupMember.updateMany({ where: { id: foreign.membership }, data: { tenantId: tenantBId } }),
      moveOwnToForeign: (tx) => tx.groupMember.updateMany({ where: { id: own.membership }, data: { tenantId: tenantBId } }),
      deleteForeign: (tx) => tx.groupMember.deleteMany({ where: { id: foreign.membership } }),
      insertForeign: createForeignMembership,
      foreignCount: () => fixtureDb().groupMember.count({ where: { id: foreign.membership } }),
    },
    {
      table: 'documents', ownId: own.document, foreignId: foreign.document,
      read: (tx) => tx.document.findMany({ select: { id: true, tenantId: true } }),
      updateForeign: (tx) => tx.document.updateMany({ where: { id: foreign.document }, data: { tenantId: tenantBId } }),
      moveOwnToForeign: (tx) => tx.document.updateMany({ where: { id: own.document }, data: { tenantId: tenantBId } }),
      deleteForeign: (tx) => tx.document.deleteMany({ where: { id: foreign.document } }),
      insertForeign: createForeignDocument,
      foreignCount: () => fixtureDb().document.count({ where: { id: foreign.document } }),
    },
    {
      table: 'invoices', ownId: own.invoice, foreignId: foreign.invoice,
      read: (tx) => tx.invoice.findMany({ select: { id: true, tenantId: true } }),
      updateForeign: (tx) => tx.invoice.updateMany({ where: { id: foreign.invoice }, data: { tenantId: tenantBId } }),
      moveOwnToForeign: (tx) => tx.invoice.updateMany({ where: { id: own.invoice }, data: { tenantId: tenantBId } }),
      deleteForeign: (tx) => tx.invoice.deleteMany({ where: { id: foreign.invoice } }),
      insertForeign: createForeignInvoice,
      foreignCount: () => fixtureDb().invoice.count({ where: { id: foreign.invoice } }),
    },
    {
      table: 'invoice_items', ownId: own.invoiceItem, foreignId: foreign.invoiceItem,
      read: (tx) => tx.invoiceItem.findMany({ select: { id: true, tenantId: true } }),
      updateForeign: (tx) => tx.invoiceItem.updateMany({ where: { id: foreign.invoiceItem }, data: { tenantId: tenantBId } }),
      moveOwnToForeign: (tx) => tx.invoiceItem.updateMany({ where: { id: own.invoiceItem }, data: { tenantId: tenantBId } }),
      deleteForeign: (tx) => tx.invoiceItem.deleteMany({ where: { id: foreign.invoiceItem } }),
      insertForeign: createForeignInvoiceItem,
      foreignCount: () => fixtureDb().invoiceItem.count({ where: { id: foreign.invoiceItem } }),
    },
    {
      table: 'notifications', ownId: own.notification, foreignId: foreign.notification,
      read: (tx) => tx.notification.findMany({ select: { id: true, tenantId: true } }),
      updateForeign: (tx) => tx.notification.updateMany({ where: { id: foreign.notification }, data: { tenantId: tenantBId } }),
      moveOwnToForeign: (tx) => tx.notification.updateMany({ where: { id: own.notification }, data: { tenantId: tenantBId } }),
      deleteForeign: (tx) => tx.notification.deleteMany({ where: { id: foreign.notification } }),
      insertForeign: createForeignNotification,
      foreignCount: () => fixtureDb().notification.count({ where: { id: foreign.notification } }),
    },
    {
      table: 'auth_sessions', ownId: own.session, foreignId: foreign.session,
      read: (tx) => tx.authSession.findMany({ select: { id: true, tenantId: true } }),
      updateForeign: (tx) => tx.authSession.updateMany({ where: { id: foreign.session }, data: { tenantId: tenantBId } }),
      moveOwnToForeign: (tx) => tx.authSession.updateMany({ where: { id: own.session }, data: { tenantId: tenantBId } }),
      deleteForeign: (tx) => tx.authSession.deleteMany({ where: { id: foreign.session } }),
      insertForeign: createForeignSession,
      foreignCount: () => fixtureDb().authSession.count({ where: { id: foreign.session } }),
    },
    {
      table: 'refresh_tokens', ownId: own.refreshToken, foreignId: foreign.refreshToken,
      read: (tx) => tx.refreshToken.findMany({ select: { id: true, tenantId: true } }),
      updateForeign: (tx) => tx.refreshToken.updateMany({ where: { id: foreign.refreshToken }, data: { tenantId: tenantBId } }),
      moveOwnToForeign: (tx) => tx.refreshToken.updateMany({ where: { id: own.refreshToken }, data: { tenantId: tenantBId } }),
      deleteForeign: (tx) => tx.refreshToken.deleteMany({ where: { id: foreign.refreshToken } }),
      insertForeign: createForeignRefreshToken,
      foreignCount: () => fixtureDb().refreshToken.count({ where: { id: foreign.refreshToken } }),
    },
    {
      table: 'password_reset_tokens', ownId: own.passwordResetToken, foreignId: foreign.passwordResetToken,
      read: (tx) => tx.passwordResetToken.findMany({ select: { id: true, tenantId: true } }),
      updateForeign: (tx) => tx.passwordResetToken.updateMany({ where: { id: foreign.passwordResetToken }, data: { tenantId: tenantBId } }),
      moveOwnToForeign: (tx) => tx.passwordResetToken.updateMany({ where: { id: own.passwordResetToken }, data: { tenantId: tenantBId } }),
      deleteForeign: (tx) => tx.passwordResetToken.deleteMany({ where: { id: foreign.passwordResetToken } }),
      insertForeign: createForeignPasswordResetToken,
      foreignCount: () => fixtureDb().passwordResetToken.count({ where: { id: foreign.passwordResetToken } }),
    },
  ];
}

async function cleanFixtures(): Promise<void> {
  if (!tenantAId || !tenantBId) {
    return;
  }
  for (const tenantId of [tenantAId, tenantBId]) {
    await fixtureDb().$transaction(async (tx) => {
      await tx.refreshToken.deleteMany({ where: { tenantId } });
      await tx.passwordResetToken.deleteMany({ where: { tenantId } });
      await tx.authSession.deleteMany({ where: { tenantId } });
      await tx.userRole.deleteMany({ where: { tenantId } });
      await tx.tenantRolePermission.deleteMany({ where: { tenantId } });
      await tx.agencySubscription.deleteMany({ where: { tenantId } });
      await tx.tenantRole.deleteMany({ where: { tenantId } });
      await tx.invoiceItem.deleteMany({ where: { tenantId } });
      await tx.document.deleteMany({ where: { tenantId } });
      await tx.notification.deleteMany({ where: { tenantId } });
      await tx.groupMember.deleteMany({ where: { tenantId } });
      await tx.invoice.deleteMany({ where: { tenantId } });
      await tx.group.deleteMany({ where: { tenantId } });
      await tx.pilgrim.deleteMany({ where: { tenantId } });
      await tx.user.deleteMany({ where: { tenantId } });
      await tx.tenant.deleteMany({ where: { id: tenantId } });
    });
  }
  if (subscriptionPlanId) {
    await fixtureDb().subscriptionPlan.delete({ where: { id: subscriptionPlanId } });
  }
  if (permissionCode) {
    await fixtureDb().permission.delete({ where: { code: permissionCode } });
  }
}

describe.skipIf(!canRunIntegrationTests)('PostgreSQL row-level tenant isolation', () => {
  beforeAll(async () => {
    const database = await import('@rihal/database');
    appPrisma = new database.PrismaClient({
      datasources: { db: { url: applicationDatabaseUrl! } },
      log: ['error'],
    });
    fixturePrisma = new database.PrismaClient({
      datasources: { db: { url: fixtureDatabaseUrl! } },
      log: ['error'],
    });
    await Promise.all([appDb().$connect(), fixtureDb().$connect()]);
    await createFixtures();
  }, 30_000);

  afterAll(async () => {
    if (fixturePrisma && tenantAId && tenantBId) {
      await cleanFixtures();
    }
    await Promise.all([appPrisma?.$disconnect(), fixturePrisma?.$disconnect()]);
  }, 30_000);

  it('applies USING and WITH CHECK to reads, updates, inserts, and deletes on every tenant table', async () => {
    expect(tableCases.map(({ table }) => table)).toEqual(tenantTables);

    for (const tableCase of tableCases) {
      const visible = await withTenant(tenantAId, (tx) => tableCase.read(tx));
      expect(visible.some((row) => row.id === tableCase.ownId)).toBe(true);
      expect(visible.some((row) => row.id === tableCase.foreignId)).toBe(false);
      expect(visible.every((row) => row.tenantId === tenantAId)).toBe(true);

      const updated = await withTenant(tenantAId, (tx) => tableCase.updateForeign(tx));
      expect(updated.count, `cross-tenant update in ${tableCase.table}`).toBe(0);
      await expect(
        withTenant(tenantAId, (tx) => tableCase.moveOwnToForeign(tx)),
        `tenant-changing update in ${tableCase.table}`,
      ).rejects.toBeDefined();

      await expect(
        withTenant(tenantAId, (tx) => tableCase.insertForeign(tx)),
        `cross-tenant insert in ${tableCase.table}`,
      ).rejects.toBeDefined();

      // The runtime role has no DELETE grant. Even if one is added later, the
      // table's RLS policy also restricts DELETE through its USING predicate.
      await expect(
        withTenant(tenantAId, (tx) => tableCase.deleteForeign(tx)),
        `physical delete in ${tableCase.table}`,
      ).rejects.toBeDefined();
      expect(await tableCase.foreignCount()).toBe(1);
    }
  }, 30_000);

  it('returns no tenant rows and rejects tenant inserts when no context is set', async () => {
    const visibleWithoutContext = await appDb().$transaction(async (tx) => {
      const rows = await Promise.all(tableCases.map((tableCase) => tableCase.read(tx)));
      return rows.flat();
    });
    expect(visibleWithoutContext).toEqual([]);
    const newTenantTablesWithoutContext = await appDb().$transaction((tx) =>
      Promise.all([
        tx.agencySubscription.findMany(),
        tx.tenantRole.findMany(),
        tx.tenantRolePermission.findMany(),
        tx.userRole.findMany(),
      ]),
    );
    expect(newTenantTablesWithoutContext).toEqual([[], [], [], []]);

    await expect(
      appDb().$transaction((tx) => tx.group.create({
        data: { tenantId: tenantAId, name: `No-context ${randomUUID()}` },
      })),
    ).rejects.toBeDefined();

    // A preceding scoped transaction must not leak its SET LOCAL value through
    // the pooled connection into the next, unscoped transaction.
    await withTenant(tenantAId, (tx) => tx.pilgrim.count({ where: { tenantId: tenantAId } }));
    const afterScopedTransaction = await appDb().$transaction((tx) => tx.pilgrim.findMany());
    expect(afterScopedTransaction).toEqual([]);
  });

  it('isolates subscriptions and tenant-scoped RBAC while exposing global catalogs read-only', async () => {
    const scopedRows = await withTenant(tenantAId, async (tx) => {
      const [subscriptions, roles, rolePermissions, userRoles] = await Promise.all([
        tx.agencySubscription.findMany({ select: { tenantId: true } }),
        tx.tenantRole.findMany({ select: { tenantId: true } }),
        tx.tenantRolePermission.findMany({ select: { tenantId: true } }),
        tx.userRole.findMany({ select: { tenantId: true } }),
      ]);
      return { subscriptions, roles, rolePermissions, userRoles };
    });

    for (const rows of Object.values(scopedRows)) {
      expect(rows.length).toBe(1);
      expect(rows[0]?.tenantId).toBe(tenantAId);
    }

    const globalCatalog = await appDb().$transaction(async (tx) => {
      const [plan, permission] = await Promise.all([
        tx.subscriptionPlan.findUnique({ where: { id: subscriptionPlanId } }),
        tx.permission.findUnique({ where: { code: permissionCode } }),
      ]);
      return { plan, permission };
    });
    expect(globalCatalog.plan?.id).toBe(subscriptionPlanId);
    expect(globalCatalog.permission?.code).toBe(permissionCode);
    await expect(
      appDb().subscriptionPlan.update({
        where: { id: subscriptionPlanId },
        data: { name: 'Runtime write must fail' },
      }),
    ).rejects.toBeDefined();
    await expect(
      appDb().permission.create({
        data: { code: `runtime-${randomUUID()}`, name: 'Runtime write must fail' },
      }),
    ).rejects.toBeDefined();

    await expect(
      withTenant(tenantAId, (tx) => tx.agencySubscription.create({
        data: {
          tenantId: tenantBId,
          subscriptionPlanId,
          currentPeriodStart: new Date('2035-01-01T00:00:00.000Z'),
          currentPeriodEnd: new Date('2035-02-01T00:00:00.000Z'),
          price: '1.00',
        },
      })),
    ).rejects.toBeDefined();
    await expect(
      withTenant(tenantAId, (tx) => tx.tenantRole.create({
        data: { tenantId: tenantBId, code: 'CROSS_TENANT', name: 'Denied role' },
      })),
    ).rejects.toBeDefined();
    await expect(
      withTenant(tenantAId, (tx) => tx.tenantRolePermission.create({
        data: {
          tenantId: tenantBId,
          roleId: foreignRoleId,
          permissionCode,
        },
      })),
    ).rejects.toBeDefined();
    await expect(
      withTenant(tenantAId, (tx) => tx.userRole.create({
        data: {
          tenantId: tenantBId,
          userId: foreignUserId,
          roleId: foreignRoleId,
        },
      })),
    ).rejects.toBeDefined();
  });

  it('uses a non-owner, non-superuser application role and forces RLS on all scoped tables', async () => {
    const [runtimeRole, relationMetadata] = await Promise.all([
      appDb().$queryRaw<Array<{
        roleName: string;
        isSuperuser: boolean;
        bypassesRls: boolean;
        canCreateDb: boolean;
        canCreateRole: boolean;
        isMigrationMember: boolean;
        canDeleteTenantRows: boolean;
        canReadPlans: boolean;
        canWritePlans: boolean;
        canReadPermissions: boolean;
        canWritePermissions: boolean;
      }>>`
        SELECT current_user AS "roleName",
               role.rolsuper AS "isSuperuser",
               role.rolbypassrls AS "bypassesRls",
               role.rolcreatedb AS "canCreateDb",
               role.rolcreaterole AS "canCreateRole",
               pg_has_role(current_user, 'rihal_migrator', 'MEMBER') AS "isMigrationMember",
               has_table_privilege(current_user, 'users', 'DELETE') AS "canDeleteTenantRows",
               has_table_privilege(current_user, 'subscription_plans', 'SELECT') AS "canReadPlans",
               (has_table_privilege(current_user, 'subscription_plans', 'INSERT')
                OR has_table_privilege(current_user, 'subscription_plans', 'UPDATE')
                OR has_table_privilege(current_user, 'subscription_plans', 'DELETE')) AS "canWritePlans",
               has_table_privilege(current_user, 'permissions', 'SELECT') AS "canReadPermissions",
               (has_table_privilege(current_user, 'permissions', 'INSERT')
                OR has_table_privilege(current_user, 'permissions', 'UPDATE')
                OR has_table_privilege(current_user, 'permissions', 'DELETE')) AS "canWritePermissions"
        FROM pg_roles AS role
        WHERE role.rolname = current_user
      `,
      appDb().$queryRaw<Array<{
        tableName: string;
        ownerName: string;
        rowSecurity: boolean;
        forceRowSecurity: boolean;
      }>>`
        SELECT relation.relname AS "tableName",
               pg_get_userbyid(relation.relowner) AS "ownerName",
               relation.relrowsecurity AS "rowSecurity",
               relation.relforcerowsecurity AS "forceRowSecurity"
        FROM pg_class AS relation
        JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
        WHERE namespace.nspname = current_schema()
          AND relation.relname IN (
            'users', 'pilgrims', 'groups', 'group_members', 'documents', 'invoices',
            'invoice_items', 'notifications', 'auth_sessions', 'refresh_tokens',
            'password_reset_tokens', 'agency_subscriptions', 'tenant_roles',
            'tenant_role_permissions', 'user_roles'
          )
        ORDER BY relation.relname
      `,
    ]);

    expect(runtimeRole).toEqual([{
      roleName: 'rihal_app',
      isSuperuser: false,
      bypassesRls: false,
      canCreateDb: false,
      canCreateRole: false,
      isMigrationMember: false,
      canDeleteTenantRows: false,
      canReadPlans: true,
      canWritePlans: false,
      canReadPermissions: true,
      canWritePermissions: false,
    }]);
    expect(relationMetadata).toHaveLength(tenantTables.length + 4);
    for (const relation of relationMetadata) {
      expect(relation.ownerName).toBe('rihal_migrator');
      expect(relation.rowSecurity).toBe(true);
      expect(relation.forceRowSecurity).toBe(true);
    }

    await expect(
      appDb().$transaction(async (tx) => {
        await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantAId}, true)`;
        await tx.$queryRaw`SELECT set_config('row_security', 'off', true)`;
        return tx.$queryRaw`SELECT "id" FROM "pilgrims"`;
      }),
    ).rejects.toBeDefined();
  });
});
