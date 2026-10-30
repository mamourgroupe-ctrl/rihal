import { randomUUID } from 'node:crypto';
import { ForbiddenException } from '@nestjs/common';
import type {
  DocumentType,
  InvoiceStatus,
  NotificationChannel,
  PilgrimStatus,
  Prisma,
  PrismaClient,
} from '@rihal/database';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { DocumentsService } from '../src/domain/documents.service';
import type { GroupsService } from '../src/domain/groups.service';
import type { InvoicesService } from '../src/domain/invoices.service';
import type { PilgrimsService } from '../src/domain/pilgrims.service';
import type { PrismaService } from '../src/database/prisma.service';
import { TenantContext } from '../src/database/tenant-context';

const integrationDatabaseUrl = process.env.TEST_DATABASE_URL ??
  (process.env.CI === 'true' ? process.env.DATABASE_URL : undefined);
const integrationAdminDatabaseUrl = process.env.TEST_ADMIN_DATABASE_URL ??
  (process.env.CI === 'true' ? process.env.ADMIN_DATABASE_URL : undefined);
const canRunIntegrationTests = Boolean(integrationDatabaseUrl && integrationAdminDatabaseUrl);
let prisma: PrismaClient | undefined;
let adminPrisma: PrismaClient | undefined;
let groupsService: GroupsService;
let documentsService: DocumentsService;
let invoicesService: InvoicesService;
let pilgrimsService: PilgrimsService;
const testTenantIds: string[] = [];
const tenantContext = new TenantContext();

function db(): PrismaClient {
  if (!prisma) {
    throw new Error('The PostgreSQL integration client is not initialized.');
  }
  return prisma;
}

function adminDb(): PrismaClient {
  if (!adminPrisma) {
    throw new Error('The PostgreSQL fixture client is not initialized.');
  }
  return adminPrisma;
}

async function withTenant<T>(
  tenantId: string,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return db().$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
    return operation(transaction);
  });
}

function asTenant<T>(tenantId: string, operation: () => Promise<T>): Promise<T> {
  return tenantContext.run(tenantId, operation);
}

async function createTenant(label: string): Promise<{ id: string }> {
  const slug = `phase4-${label}-${randomUUID()}`;
  const tenant = await adminDb().tenant.create({
    data: { name: `Test tenant ${label}`, slug },
    select: { id: true },
  });
  testTenantIds.push(tenant.id);
  return tenant;
}

async function createPilgrim(tenantId: string, label: string): Promise<{ id: string }> {
  return withTenant(tenantId, (tx) => tx.pilgrim.create({
    data: {
      tenantId,
      fullNameAr: `اسم تجريبي ${label}`,
      fullNameEn: `Synthetic Pilgrim ${label}`,
      passportNumber: `TEST-${label}-${randomUUID()}`,
      passportExpiry: new Date('2035-01-01T00:00:00.000Z'),
      nationality: 'DZ',
    },
    select: { id: true },
  }));
}

async function archiveTestRows(): Promise<void> {
  for (const tenantId of testTenantIds.splice(0)) {
    const archivedAt = new Date();
    await adminDb().$transaction(async (tx) => {
      await tx.groupMember.updateMany({ where: { tenantId, archivedAt: null }, data: { archivedAt } });
      await tx.invoiceItem.updateMany({ where: { tenantId, archivedAt: null }, data: { archivedAt } });
      await tx.document.updateMany({ where: { tenantId, archivedAt: null }, data: { archivedAt } });
      await tx.notification.updateMany({ where: { tenantId, archivedAt: null }, data: { archivedAt } });
      await tx.invoice.updateMany({ where: { tenantId, archivedAt: null }, data: { archivedAt } });
      await tx.group.updateMany({ where: { tenantId, archivedAt: null }, data: { archivedAt } });
      await tx.pilgrim.updateMany({ where: { tenantId, archivedAt: null }, data: { archivedAt } });
      await tx.user.updateMany({ where: { tenantId, archivedAt: null }, data: { archivedAt } });
      await tx.tenant.updateMany({ where: { id: tenantId, archivedAt: null }, data: { archivedAt } });
    });
  }
}

describe.skipIf(!canRunIntegrationTests)('PostgreSQL tenant and domain invariants', () => {
  beforeAll(async () => {
    const [database, groups, documents, invoices, pilgrims] = await Promise.all([
      import('@rihal/database'),
      import('../src/domain/groups.service'),
      import('../src/domain/documents.service'),
      import('../src/domain/invoices.service'),
      import('../src/domain/pilgrims.service'),
    ]);
    prisma = new database.PrismaClient({
      datasources: { db: { url: integrationDatabaseUrl! } },
      log: ['error'],
    });
    adminPrisma = new database.PrismaClient({
      datasources: { db: { url: integrationAdminDatabaseUrl! } },
      log: ['error'],
    });
    await Promise.all([prisma.$connect(), adminPrisma.$connect()]);
    const prismaService = {
      withRequestTenant: <T>(
        tenantId: string,
        operation: (transaction: Prisma.TransactionClient) => Promise<T>,
      ) => {
        const requestTenantId = tenantContext.getTenantId();
        if (!requestTenantId || requestTenantId !== tenantId) {
          throw new ForbiddenException('A matching authenticated tenant context is required.');
        }
        return withTenant(tenantId, operation);
      },
    } as unknown as PrismaService;
    groupsService = new groups.GroupsService(prismaService);
    documentsService = new documents.DocumentsService(prismaService);
    invoicesService = new invoices.InvoicesService(prismaService);
    pilgrimsService = new pilgrims.PilgrimsService(prismaService);
  });

  afterEach(async () => {
    await archiveTestRows();
  });

  afterAll(async () => {
    await Promise.all([prisma?.$disconnect(), adminPrisma?.$disconnect()]);
  });

  it('rejects cross-tenant group-member, document, and invoice links', async () => {
    const tenantA = await createTenant('group-owner');
    const tenantB = await createTenant('pilgrim-owner');
    const group = await asTenant(tenantA.id, () =>
      groupsService.create(tenantA.id, { name: 'Cross tenant test group' }),
    );
    const pilgrimB = await createPilgrim(tenantB.id, 'cross-tenant');

    await expect(
      asTenant(tenantA.id, () => groupsService.addMember(tenantA.id, group.id, pilgrimB.id)),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      asTenant(tenantA.id, () => documentsService.create(tenantA.id, {
        pilgrimId: pilgrimB.id,
        type: 'PASSPORT' as DocumentType,
        storageKey: 'private-test/cross-tenant/passport',
        fileName: 'passport-test.jpg',
        fileSize: 100,
        mimeType: 'image/jpeg',
      })),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });

    await expect(
      withTenant(tenantA.id, (tx) => tx.groupMember.create({
        data: { tenantId: tenantA.id, groupId: group.id, pilgrimId: pilgrimB.id },
      })),
    ).rejects.toMatchObject({ code: 'P2003' });

    await expect(
      withTenant(tenantA.id, (tx) => tx.document.create({
        data: {
          tenantId: tenantA.id,
          pilgrimId: pilgrimB.id,
          type: 'PASSPORT' as DocumentType,
          storageKey: 'private-test/cross-tenant/passport',
          fileName: 'passport-test.jpg',
          fileSize: 100,
          mimeType: 'image/jpeg',
        },
      })),
    ).rejects.toMatchObject({ code: 'P2003' });

    await expect(
      withTenant(tenantA.id, (tx) => tx.invoice.create({
        data: {
          tenantId: tenantA.id,
          invoiceNumber: `CROSS-${randomUUID()}`,
          customerName: 'Synthetic customer',
          pilgrimId: pilgrimB.id,
          amount: '1.00',
        },
      })),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it('enforces tenant-safe optional notification relations to users and pilgrims', async () => {
    const tenantA = await createTenant('notification-owner');
    const tenantB = await createTenant('notification-target');
    const userB = await withTenant(tenantB.id, (tx) => tx.user.create({
      data: {
        tenantId: tenantB.id,
        email: `test-${randomUUID()}@seed.invalid`,
        passwordHash: 'NOT_A_REAL_PASSWORD_HASH',
        name: 'Synthetic notification recipient',
      },
      select: { id: true },
    }));
    const pilgrimB = await createPilgrim(tenantB.id, 'notification-target');

    await expect(
      withTenant(tenantA.id, (tx) => tx.notification.create({
        data: {
          tenantId: tenantA.id,
          userId: userB.id,
          channel: 'EMAIL' as NotificationChannel,
          template: 'synthetic-test',
          payload: {},
        },
      })),
    ).rejects.toMatchObject({ code: 'P2003' });

    await expect(
      withTenant(tenantA.id, (tx) => tx.notification.create({
        data: {
          tenantId: tenantA.id,
          pilgrimId: pilgrimB.id,
          channel: 'EMAIL' as NotificationChannel,
          template: 'synthetic-test',
          payload: {},
        },
      })),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it('runs pilgrim and document state changes transactionally and keeps storage references private', async () => {
    const tenant = await createTenant('documents');
    const pilgrim = await asTenant(tenant.id, () => pilgrimsService.create(tenant.id, {
      fullNameAr: 'معتمر اصطناعي للاختبار',
      fullNameEn: 'Synthetic Domain Test Pilgrim',
      passportNumber: `TEST-DOMAIN-${randomUUID()}`,
      passportExpiry: new Date('2035-01-01T00:00:00.000Z'),
      nationality: 'DZ',
    }));
    await asTenant(tenant.id, () =>
      pilgrimsService.transitionStatus(tenant.id, pilgrim.id, 'REGISTERED' as PilgrimStatus),
    );

    await expect(
      asTenant(tenant.id, () => documentsService.create(tenant.id, {
        pilgrimId: pilgrim.id,
        type: 'PASSPORT' as DocumentType,
        storageKey: 'https://files.example.invalid/public/passport.jpg',
        fileName: 'passport-test.jpg',
        fileSize: 100,
        mimeType: 'image/jpeg',
      })),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });

    const document = await asTenant(tenant.id, () => documentsService.create(tenant.id, {
      pilgrimId: pilgrim.id,
      type: 'PASSPORT' as DocumentType,
      storageKey: 'private-test/domain/passport-object',
      fileName: 'passport-test.jpg',
      fileSize: 100,
      mimeType: 'image/jpeg',
    }));
    const transitionedPilgrim = await withTenant(tenant.id, (tx) => tx.pilgrim.findFirstOrThrow({
      where: { id: pilgrim.id, tenantId: tenant.id },
    }));
    expect(transitionedPilgrim.status).toBe('DOCUMENTS_UPLOADED');
    expect(
      (await asTenant(tenant.id, () => documentsService.verify(tenant.id, document.id))).verified,
    ).toBe(true);

    await asTenant(tenant.id, () => documentsService.archive(tenant.id, document.id));
    const archivedDocument = await withTenant(tenant.id, (tx) => tx.document.findFirstOrThrow({
      where: { id: document.id, tenantId: tenant.id },
    }));
    expect(archivedDocument.archivedAt).toBeInstanceOf(Date);
    await asTenant(tenant.id, () => pilgrimsService.archive(tenant.id, pilgrim.id));
    const archivedPilgrim = await withTenant(tenant.id, (tx) => tx.pilgrim.findFirstOrThrow({
      where: { id: pilgrim.id, tenantId: tenant.id },
    }));
    expect(archivedPilgrim.archivedAt).toBeInstanceOf(Date);
  });

  it('creates invoice items and enforces payment transitions and due dates', async () => {
    const tenant = await createTenant('invoices');
    const dueDate = new Date('2030-01-02T00:00:00.000Z');
    const invoice = await asTenant(tenant.id, () => invoicesService.create(tenant.id, {
      invoiceNumber: `INV-${randomUUID()}`,
      customerName: 'Synthetic invoice customer',
      dueDate,
      items: [{ description: 'Synthetic service', quantity: 2, unitPrice: '12.50' }],
    }));
    expect(invoice.amount.toFixed(2)).toBe('25.00');
    expect(invoice.items).toHaveLength(1);
    expect(invoice.status).toBe('DRAFT');

    await expect(
      asTenant(tenant.id, () =>
        invoicesService.transitionStatus(tenant.id, invoice.id, 'PAID' as InvoiceStatus),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_STATE_TRANSITION' });
    await asTenant(tenant.id, () => invoicesService.transitionStatus(
        tenant.id,
        invoice.id,
        'ISSUED' as InvoiceStatus,
        new Date('2030-01-01T00:00:00.000Z'),
      ));
    await expect(
      asTenant(tenant.id, () => invoicesService.transitionStatus(
        tenant.id,
        invoice.id,
        'OVERDUE' as InvoiceStatus,
        new Date('2030-01-01T00:00:00.000Z'),
      )),
    ).rejects.toMatchObject({ code: 'INVOICE_NOT_DUE' });

    const overdue = await asTenant(tenant.id, () => invoicesService.transitionStatus(
      tenant.id,
      invoice.id,
      'OVERDUE' as InvoiceStatus,
      new Date('2030-01-03T00:00:00.000Z'),
    ));
    expect(overdue.status).toBe('OVERDUE');
    const paidAt = new Date('2030-01-04T00:00:00.000Z');
    const paid = await asTenant(tenant.id, () => invoicesService.transitionStatus(
      tenant.id,
      invoice.id,
      'PAID' as InvoiceStatus,
      paidAt,
    ));
    expect(paid.status).toBe('PAID');
    expect(paid.paidAt).toEqual(paidAt);

    await asTenant(tenant.id, () => invoicesService.archive(tenant.id, invoice.id));
    const item = await withTenant(tenant.id, (tx) => tx.invoiceItem.findFirstOrThrow({
      where: { tenantId: tenant.id, invoiceId: invoice.id },
    }));
    expect(item.archivedAt).toBeInstanceOf(Date);
  });

  it('rejects a second group leader in the service and through the partial unique index', async () => {
    const tenant = await createTenant('leaders');
    const group = await asTenant(tenant.id, () =>
      groupsService.create(tenant.id, { name: 'Leader limit test', maxSize: 3 }),
    );
    const first = await createPilgrim(tenant.id, 'leader-one');
    const second = await createPilgrim(tenant.id, 'leader-two');

    await asTenant(tenant.id, () => groupsService.addMember(tenant.id, group.id, first.id, true));
    await expect(
      asTenant(tenant.id, () => groupsService.addMember(tenant.id, group.id, second.id, true)),
    ).rejects.toMatchObject({ code: 'LEADER_ALREADY_ASSIGNED' });

    await expect(
      withTenant(tenant.id, (tx) => tx.groupMember.create({
        data: { tenantId: tenant.id, groupId: group.id, pilgrimId: second.id, isLeader: true },
      })),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('rejects members beyond the group capacity in both the service and database', async () => {
    const tenant = await createTenant('capacity');
    const group = await asTenant(tenant.id, () =>
      groupsService.create(tenant.id, { name: 'Capacity test', maxSize: 2 }),
    );
    const pilgrims = await Promise.all([
      createPilgrim(tenant.id, 'capacity-one'),
      createPilgrim(tenant.id, 'capacity-two'),
      createPilgrim(tenant.id, 'capacity-three'),
    ]);

    await asTenant(tenant.id, () =>
      groupsService.addMember(tenant.id, group.id, pilgrims[0].id),
    );
    await asTenant(tenant.id, () =>
      groupsService.addMember(tenant.id, group.id, pilgrims[1].id),
    );
    await expect(
      asTenant(tenant.id, () =>
        groupsService.addMember(tenant.id, group.id, pilgrims[2].id),
      ),
    ).rejects.toMatchObject({ code: 'GROUP_FULL' });

    await expect(
      withTenant(tenant.id, (tx) => tx.groupMember.create({
        data: { tenantId: tenant.id, groupId: group.id, pilgrimId: pilgrims[2].id },
      })),
    ).rejects.toBeDefined();
  });
});
