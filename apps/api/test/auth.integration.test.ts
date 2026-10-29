import type { INestApplication } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@rihal/database';
import { hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const integrationDatabaseUrl = process.env.TEST_DATABASE_URL ??
  (process.env.CI === 'true' ? process.env.DATABASE_URL : undefined);
const integrationAdminDatabaseUrl = process.env.TEST_ADMIN_DATABASE_URL ??
  (process.env.CI === 'true' ? process.env.ADMIN_DATABASE_URL : undefined);
const canRunIntegrationTests = Boolean(integrationDatabaseUrl && integrationAdminDatabaseUrl);
const initialPassword = 'Synthetic-Test-Password-42!';
const resetPassword = 'Synthetic-Reset-Password-73!';
const refreshCookieName = 'rihal_refresh';
let prisma: PrismaClient | undefined;
let adminPrisma: PrismaClient | undefined;
let app: INestApplication | undefined;
let baseUrl = '';
let tenantId = '';
let otherTenantId = '';
let tenantSlug = '';
let email = '';
let userId = '';
let recoveryCrypto: { decryptRecoveryUrl(payload: unknown): string };

function database(): PrismaClient {
  if (!prisma) {
    throw new Error('The PostgreSQL authentication test client is not initialized.');
  }
  return prisma;
}

function fixtureDatabase(): PrismaClient {
  if (!adminPrisma) {
    throw new Error('The PostgreSQL authentication fixture client is not initialized.');
  }
  return adminPrisma;
}

async function withTenant<T>(
  tenantId: string,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return database().$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
    return operation(transaction);
  });
}

function refreshCookie(response: Response): string {
  const header = response.headers.get('set-cookie') ?? '';
  const token = new RegExp(`(?:^|[,;]\\s*)${refreshCookieName}=([^;]+)`).exec(header)?.[1];
  if (!token) {
    throw new Error('The authentication response did not set its refresh cookie.');
  }
  return `${refreshCookieName}=${token}`;
}

async function login(password = initialPassword): Promise<{
  accessToken: string;
  body: Record<string, unknown>;
  cookie: string;
  response: Response;
}> {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tenantSlug, email, password }),
  });
  const body = (await response.json()) as Record<string, unknown> & { accessToken?: string };
  return { accessToken: body.accessToken ?? '', body, cookie: refreshCookie(response), response };
}

describe.skipIf(!canRunIntegrationTests)('PostgreSQL authentication flow', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = integrationDatabaseUrl!;
    process.env.DIRECT_URL = integrationDatabaseUrl!;
    process.env.AUTH_SECRET = `synthetic-ci-auth-secret-${randomUUID()}-not-production`;
    process.env.AUTH_URL = 'https://app.example.invalid';
    delete process.env.SMTP_URL;
    delete process.env.SMTP_FROM;

    const [databaseModule, nestCore, appModule, cryptoModule] = await Promise.all([
      import('@rihal/database'),
      import('@nestjs/core'),
      import('../src/app.module'),
      import('../src/auth/recovery-crypto.service'),
    ]);
    prisma = databaseModule.prisma;
    adminPrisma = new databaseModule.PrismaClient({
      datasources: { db: { url: integrationAdminDatabaseUrl! } },
      log: ['error'],
    });
    await Promise.all([prisma.$connect(), adminPrisma.$connect()]);
    app = await nestCore.NestFactory.create(appModule.AppModule, { logger: false });
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}/api`;
    recoveryCrypto = app.get(cryptoModule.RecoveryCryptoService);

    tenantSlug = `phase3-${randomUUID()}`;
    email = `auth-${randomUUID()}@seed.invalid`;
    const tenant = await fixtureDatabase().tenant.create({
      data: { name: 'Synthetic authentication tenant', slug: tenantSlug },
      select: { id: true },
    });
    tenantId = tenant.id;
    const otherTenant = await fixtureDatabase().tenant.create({
      data: { name: 'Synthetic foreign tenant', slug: `phase3-other-${randomUUID()}` },
      select: { id: true },
    });
    otherTenantId = otherTenant.id;
    const user = await withTenant(tenantId, async (tx) => tx.user.create({
      data: {
        tenantId,
        email,
        passwordHash: await hash(initialPassword, 12),
        name: 'Synthetic test user',
        role: 'VIEWER',
      },
      select: { id: true },
    }));
    userId = user.id;
  }, 30_000);

  afterAll(async () => {
    if (adminPrisma && tenantId) {
      const archivedAt = new Date();
      await fixtureDatabase().$transaction(async (tx) => {
        await tx.authSession.updateMany({
          where: { tenantId, revokedAt: null },
          data: { revokedAt: archivedAt },
        });
        await tx.passwordResetToken.updateMany({
          where: { tenantId, revokedAt: null },
          data: { revokedAt: archivedAt },
        });
        await tx.notification.updateMany({
          where: { tenantId, archivedAt: null },
          data: { archivedAt },
        });
        await tx.user.updateMany({ where: { tenantId, archivedAt: null }, data: { archivedAt } });
        await tx.tenant.updateMany({ where: { id: tenantId, archivedAt: null }, data: { archivedAt } });
        await tx.tenant.updateMany({
          where: { id: otherTenantId, archivedAt: null },
          data: { archivedAt },
        });
      });
    }
    await app?.close();
    await Promise.all([prisma?.$disconnect(), adminPrisma?.$disconnect()]);
  }, 30_000);

  it('returns 401 anonymously and reads tenant context only from the verified access token', async () => {
    const healthResponse = await fetch(`${baseUrl}/health`);
    expect(healthResponse.status).toBe(200);

    const anonymousResponse = await fetch(`${baseUrl}/auth/me`);
    expect(anonymousResponse.status).toBe(401);

    const authenticated = await login();
    expect(authenticated.response.status).toBe(200);
    expect(authenticated.accessToken).toBeTruthy();
    expect(authenticated.body).not.toHaveProperty('refreshToken');
    expect(authenticated.body).not.toHaveProperty('user.passwordHash');
    expect(authenticated.body).not.toHaveProperty('user.email');
    expect(authenticated.response.headers.get('cache-control')).toContain('no-store');
    expect(authenticated.response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(authenticated.response.headers.get('set-cookie')).toContain('SameSite=Strict');

    const meResponse = await fetch(`${baseUrl}/auth/me?tenantId=${encodeURIComponent(otherTenantId)}`, {
      headers: { authorization: `Bearer ${authenticated.accessToken}` },
    });
    expect(meResponse.status).toBe(200);
    await expect(meResponse.json()).resolves.toMatchObject({ id: userId, tenantId, role: 'VIEWER' });

    const forgedTenantLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenantSlug, email, password: initialPassword, tenantId: otherTenantId }),
    });
    expect(forgedTenantLogin.status).toBe(400);
  });

  it('rotates opaque refresh tokens and revokes a session when a rotated token is replayed', async () => {
    const first = await login();
    const rotationResponse = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { cookie: first.cookie },
    });
    expect(rotationResponse.status).toBe(200);
    const rotated = (await rotationResponse.json()) as { accessToken: string };
    const secondCookie = refreshCookie(rotationResponse);

    const replayResponse = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { cookie: first.cookie },
    });
    expect(replayResponse.status).toBe(401);

    const revokedAccessResponse = await fetch(`${baseUrl}/auth/me`, {
      headers: { authorization: `Bearer ${rotated.accessToken}` },
    });
    expect(revokedAccessResponse.status).toBe(401);

    const revokedRefreshResponse = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { cookie: secondCookie },
    });
    expect(revokedRefreshResponse.status).toBe(401);
  });

  it('queues an encrypted, one-use recovery link, resets the password, and revokes existing sessions', async () => {
    const existingSession = await login();
    const recoveryResponse = await fetch(`${baseUrl}/auth/password/forgot`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenantSlug, email }),
    });
    expect(recoveryResponse.status).toBe(200);
    const genericMessage = (await recoveryResponse.json()) as { message: string };

    const latestNotification = await withTenant(tenantId, (tx) => tx.notification.findFirstOrThrow({
      where: { tenantId, userId, template: 'password-reset' },
      orderBy: { createdAt: 'desc' },
      select: { payload: true, status: true },
    }));
    expect(latestNotification.status).toBe('PENDING');
    const resetUrl = new URL(recoveryCrypto.decryptRecoveryUrl(latestNotification.payload));
    const token = new URLSearchParams(resetUrl.hash.slice(1)).get('token');
    expect(token).toBeTruthy();
    expect(JSON.stringify(latestNotification.payload)).not.toContain(token);

    const resetResponse = await fetch(`${baseUrl}/auth/password/reset`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, newPassword: resetPassword }),
    });
    expect(resetResponse.status).toBe(200);

    const oldAccessResponse = await fetch(`${baseUrl}/auth/me`, {
      headers: { authorization: `Bearer ${existingSession.accessToken}` },
    });
    expect(oldAccessResponse.status).toBe(401);

    const oldPasswordLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenantSlug, email, password: initialPassword }),
    });
    expect(oldPasswordLogin.status).toBe(401);

    const newPasswordLogin = await login(resetPassword);
    expect(newPasswordLogin.response.status).toBe(200);

    const replayedReset = await fetch(`${baseUrl}/auth/password/reset`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, newPassword: 'Synthetic-Another-Password-9!' }),
    });
    expect(replayedReset.status).toBe(400);

    const unknownAccountResponse = await fetch(`${baseUrl}/auth/password/forgot`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenantSlug, email: `missing-${randomUUID()}@seed.invalid` }),
    });
    expect(unknownAccountResponse.status).toBe(200);
    await expect(unknownAccountResponse.json()).resolves.toEqual(genericMessage);
  });
});
