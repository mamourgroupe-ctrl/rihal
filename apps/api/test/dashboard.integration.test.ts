import type { INestApplication } from '@nestjs/common';
import type { PrismaClient } from '@rihal/database';
import { hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const integrationDatabaseUrl = process.env.TEST_DATABASE_URL ??
  (process.env.CI === 'true' ? process.env.DATABASE_URL : undefined);
const integrationAdminDatabaseUrl = process.env.TEST_ADMIN_DATABASE_URL ??
  (process.env.CI === 'true' ? process.env.ADMIN_DATABASE_URL : undefined);
const canRunIntegrationTests = Boolean(integrationDatabaseUrl && integrationAdminDatabaseUrl);
const password = 'Synthetic-Dashboard-Password-51!';
const refreshCookieName = 'rihal_refresh';

let prisma: PrismaClient | undefined;
let adminPrisma: PrismaClient | undefined;
let app: INestApplication | undefined;
let baseUrl = '';
let tenantId = '';
let tenantSlug = '';
let email = '';
let otherTenantId = '';
let passportNumber = '';

function fixtureDb(): PrismaClient {
  if (!adminPrisma) {
    throw new Error('The dashboard fixture client is not initialized.');
  }
  return adminPrisma;
}

async function withTenant<T>(
  target: string,
  operation: (transaction: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]) => Promise<T>,
): Promise<T> {
  return fixtureDb().$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT set_config('app.current_tenant_id', ${target}, true)`;
    return operation(transaction);
  });
}

async function login(): Promise<{ accessToken: string; cookie: string }> {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tenantSlug, email, password }),
  });
  const body = (await response.json()) as { accessToken?: string };
  const cookie = new RegExp(`${refreshCookieName}=([^;]+)`).exec(
    response.headers.get('set-cookie') ?? '',
  )?.[1];
  return { accessToken: body.accessToken ?? '', cookie: `${refreshCookieName}=${cookie ?? ''}` };
}

describe.skipIf(!canRunIntegrationTests)('Tenant dashboard aggregates', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = integrationDatabaseUrl!;
    process.env.DIRECT_URL = integrationDatabaseUrl!;
    process.env.AUTH_SECRET = `synthetic-dashboard-secret-${randomUUID()}-not-production`;
    process.env.AUTH_URL = 'https://app.example.invalid';
    delete process.env.SMTP_URL;
    delete process.env.SMTP_FROM;

    const [databaseModule, nestCore, appModule, appSetup] = await Promise.all([
      import('@rihal/database'),
      import('@nestjs/core'),
      import('../src/app.module'),
      import('../src/app.setup'),
    ]);

    prisma = databaseModule.prisma;
    adminPrisma = databaseModule.createPrismaClient({
      url: integrationAdminDatabaseUrl!,
      log: ['error'],
    });
    await Promise.all([prisma.$connect(), adminPrisma.$connect()]);

    app = await nestCore.NestFactory.create(appModule.AppModule, { logger: false });
    appSetup.configureApiApp(app);
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}/api`;

    tenantSlug = `dash-${randomUUID()}`;
    email = `dash-${randomUUID()}@seed.invalid`;
    const tenant = await fixtureDb().tenant.create({
      data: { name: 'Synthetic dashboard tenant', slug: tenantSlug },
      select: { id: true },
    });
    tenantId = tenant.id;
    const otherTenant = await fixtureDb().tenant.create({
      data: { name: 'Synthetic dashboard neighbour', slug: `dash-other-${randomUUID()}` },
      select: { id: true },
    });
    otherTenantId = otherTenant.id;

    passportNumber = `DASH-${randomUUID().slice(0, 8).toUpperCase()}`;
    await withTenant(tenantId, async (transaction) => {
      await transaction.user.create({
        data: {
          tenantId,
          email,
          passwordHash: await hash(password, 12),
          name: 'Synthetic dashboard user',
          role: 'ADMIN',
        },
      });
      const pilgrim = await transaction.pilgrim.create({
        data: {
          tenantId,
          fullNameAr: 'معتمر لوحة اختبار',
          fullNameEn: 'Dashboard test pilgrim',
          passportNumber,
          passportExpiry: new Date('2032-01-01'),
          nationality: 'DZ',
          status: 'REGISTERED',
        },
        select: { id: true },
      });
      const group = await transaction.group.create({
        data: { tenantId, name: 'Dashboard test group', maxSize: 4, status: 'READY' },
        select: { id: true },
      });
      await transaction.groupMember.create({
        data: { tenantId, groupId: group.id, pilgrimId: pilgrim.id, isLeader: true },
      });
      await transaction.document.create({
        data: {
          tenantId,
          pilgrimId: pilgrim.id,
          type: 'PASSPORT',
          storageKey: `tests/${randomUUID()}`,
          fileName: 'passport.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          verified: true,
        },
      });
    });

    // A neighbouring tenant must never leak into the aggregates.
    await withTenant(otherTenantId, async (transaction) => {
      await transaction.pilgrim.create({
        data: {
          tenantId: otherTenantId,
          fullNameAr: 'معتمر وكالة أخرى',
          fullNameEn: 'Foreign tenant pilgrim',
          passportNumber: `OTHER-${randomUUID().slice(0, 8).toUpperCase()}`,
          passportExpiry: new Date('2032-01-01'),
          nationality: 'EG',
          status: 'BOOKED',
        },
      });
    });
  }, 30_000);

  afterAll(async () => {
    if (adminPrisma && tenantId) {
      const archivedAt = new Date();
      await fixtureDb().$transaction(async (transaction) => {
        await transaction.notification.updateMany({ where: { tenantId }, data: { archivedAt } });
        await transaction.document.updateMany({ where: { tenantId }, data: { archivedAt } });
        await transaction.groupMember.updateMany({ where: { tenantId }, data: { archivedAt } });
        await transaction.group.updateMany({ where: { tenantId }, data: { archivedAt } });
        await transaction.pilgrim.updateMany({ where: { tenantId }, data: { archivedAt } });
        await transaction.authSession.updateMany({ where: { tenantId }, data: { revokedAt: archivedAt } });
        await transaction.user.updateMany({ where: { tenantId }, data: { archivedAt } });
        await transaction.tenant.updateMany({ where: { id: tenantId }, data: { archivedAt } });
        await transaction.tenant.updateMany({ where: { id: otherTenantId }, data: { archivedAt } });
      });
    }
    await app?.close();
    await Promise.all([prisma?.$disconnect(), adminPrisma?.$disconnect()]);
  }, 30_000);

  it('rejects anonymous dashboard requests', async () => {
    const overview = await fetch(`${baseUrl}/dashboard/overview`);
    expect(overview.status).toBe(401);
    const pilgrims = await fetch(`${baseUrl}/dashboard/pilgrims`);
    expect(pilgrims.status).toBe(401);
  });

  it('returns tenant-scoped aggregates with masked passport numbers', async () => {
    const session = await login();
    expect(session.accessToken).toBeTruthy();

    const response = await fetch(`${baseUrl}/dashboard/overview`, {
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');

    const body = await response.json() as {
      summary: {
        pilgrims: { total: number; byStatus: Record<string, number> };
        groups: { total: number; occupied: number };
        documents: { total: number; verified: number };
      };
      recentPilgrims: Array<{ passportNumber: string; status: string }>;
      groups: Array<{ memberCount: number }>;
    };

    expect(body.summary.pilgrims.total).toBe(1);
    expect(body.summary.pilgrims.byStatus.REGISTERED).toBe(1);
    expect(body.summary.pilgrims.byStatus.BOOKED).toBe(0);
    expect(body.summary.groups.total).toBe(1);
    expect(body.summary.groups.occupied).toBe(1);
    expect(body.summary.documents).toMatchObject({ total: 1, verified: 1 });
    expect(body.groups[0]?.memberCount).toBe(1);

    expect(body.recentPilgrims).toHaveLength(1);
    expect(body.recentPilgrims[0]?.passportNumber).toBe(`••••${passportNumber.slice(-4)}`);
    expect(JSON.stringify(body)).not.toContain(passportNumber);
  });

  it('filters pilgrims by status and validates the filter', async () => {
    const session = await login();
    const headers = { authorization: `Bearer ${session.accessToken}` };

    const registered = await fetch(`${baseUrl}/dashboard/pilgrims?status=REGISTERED&limit=5`, { headers });
    expect(registered.status).toBe(200);
    const registeredBody = await registered.json() as Array<{ status: string }>;
    expect(registeredBody).toHaveLength(1);
    expect(registeredBody[0]?.status).toBe('REGISTERED');

    const booked = await fetch(`${baseUrl}/dashboard/pilgrims?status=BOOKED`, { headers });
    expect(booked.status).toBe(200);
    await expect(booked.json()).resolves.toEqual([]);

    const invalid = await fetch(`${baseUrl}/dashboard/pilgrims?status=NOT_A_STATUS`, { headers });
    expect(invalid.status).toBe(400);

    const invalidLimit = await fetch(`${baseUrl}/dashboard/pilgrims?limit=0`, { headers });
    expect(invalidLimit.status).toBe(400);
  });
});
