import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sharedPrisma } = vi.hoisted(() => ({
  sharedPrisma: {
    $disconnect: vi.fn(),
    $transaction: vi.fn(),
  },
}));

vi.mock('@rihal/database', () => ({ prisma: sharedPrisma }));

import { PrismaService } from '../src/database/prisma.service';
import { TenantContext } from '../src/database/tenant-context';

describe('PrismaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disconnects the shared database package client on shutdown', async () => {
    const service = new PrismaService(new TenantContext());

    await service.onModuleDestroy();

    expect(sharedPrisma.$disconnect).toHaveBeenCalledOnce();
  });

  it('rejects a request tenant operation when the trusted context is absent', async () => {
    const service = new PrismaService(new TenantContext());
    const operation = vi.fn();

    await expect(service.withRequestTenant('tenant-a', operation)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    expect(sharedPrisma.$transaction).not.toHaveBeenCalled();
    expect(operation).not.toHaveBeenCalled();
  });

  it('sets the matching request tenant transaction-locally before the operation', async () => {
    const queryRaw = vi.fn().mockResolvedValue([]);
    const transaction = { $queryRaw: queryRaw };
    sharedPrisma.$transaction.mockImplementation(async (operation: (tx: typeof transaction) => Promise<unknown>) =>
      operation(transaction),
    );
    const tenantContext = new TenantContext();
    const service = new PrismaService(tenantContext);
    const operation = vi.fn(async () => 'complete');

    await expect(
      tenantContext.run('tenant-a', () => service.withRequestTenant('tenant-a', operation)),
    ).resolves.toBe('complete');

    expect(sharedPrisma.$transaction).toHaveBeenCalledOnce();
    expect(queryRaw).toHaveBeenCalledOnce();
    expect(operation).toHaveBeenCalledOnce();
  });

  it('rejects a service tenant that differs from the request identity', async () => {
    const tenantContext = new TenantContext();
    const service = new PrismaService(tenantContext);

    await expect(
      tenantContext.run('verified-tenant', () =>
        service.withRequestTenant('client-supplied-tenant', async () => undefined),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(sharedPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('keeps concurrent request tenants in separate transaction-local contexts', async () => {
    const transactionA = { $queryRaw: vi.fn().mockResolvedValue([]) };
    const transactionB = { $queryRaw: vi.fn().mockResolvedValue([]) };
    let transactionIndex = 0;
    sharedPrisma.$transaction.mockImplementation(
      async (operation: (tx: typeof transactionA | typeof transactionB) => Promise<unknown>) => {
        const transaction = transactionIndex++ === 0 ? transactionA : transactionB;
        return operation(transaction);
      },
    );
    const tenantContext = new TenantContext();
    const service = new PrismaService(tenantContext);

    await Promise.all([
      tenantContext.run('tenant-a', () =>
        service.withRequestTenant('tenant-a', async () => 'a'),
      ),
      tenantContext.run('tenant-b', () =>
        service.withRequestTenant('tenant-b', async () => 'b'),
      ),
    ]);

    expect(transactionA.$queryRaw).toHaveBeenCalledOnce();
    expect(transactionB.$queryRaw).toHaveBeenCalledOnce();
    expect(sharedPrisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('checks the verified tenant, user, session, role, and active account state', async () => {
    const now = new Date('2026-03-01T10:00:00.000Z');
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      authSession: {
        findFirst: vi.fn().mockResolvedValue({
          user: {
            isActive: true,
            archivedAt: null,
            role: 'ADMIN',
            tenant: { status: 'ACTIVE', archivedAt: null },
          },
        }),
      },
    };
    sharedPrisma.$transaction.mockImplementation(
      async (operation: (tx: typeof transaction) => Promise<unknown>) => operation(transaction),
    );
    const service = new PrismaService(new TenantContext());

    await expect(
      service.isAccessSessionActive({
        tenantId: 'tenant-a',
        userId: 'user-a',
        sessionId: 'session-a',
        role: 'ADMIN',
        now,
      }),
    ).resolves.toBe(true);

    expect(transaction.authSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'session-a',
          tenantId: 'tenant-a',
          userId: 'user-a',
          revokedAt: null,
          expiresAt: { gt: now },
        },
      }),
    );
  });

  it('consumes a password reset token and changes the password in one transaction', async () => {
    const now = new Date('2026-03-01T10:00:00.000Z');
    const tokenHash = 'reset-token-hash';
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      passwordResetToken: {
        findUnique: vi.fn()
          .mockResolvedValueOnce({ tenantId: 'tenant-a' })
          .mockResolvedValueOnce({
            id: 'reset-id',
            tenantId: 'tenant-a',
            userId: 'user-a',
            expiresAt: new Date('2026-03-01T11:00:00.000Z'),
            usedAt: null,
            revokedAt: null,
          }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      user: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      authSession: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    sharedPrisma.$transaction.mockImplementation(
      async (operation: (tx: typeof transaction) => Promise<unknown>) => operation(transaction),
    );
    const service = new PrismaService(new TenantContext());

    await expect(
      service.completePasswordReset({ tokenHash, passwordHash: 'new-hash', now }),
    ).resolves.toBe(true);

    expect(sharedPrisma.$transaction).toHaveBeenCalledOnce();
    expect(transaction.$queryRaw).toHaveBeenCalledTimes(2);
    expect(transaction.passwordResetToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'reset-id',
          usedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        }),
      }),
    );
    expect(transaction.user.updateMany).toHaveBeenCalledOnce();
    expect(transaction.authSession.updateMany).toHaveBeenCalledOnce();
  });

  it('does not change a password when conditional reset-token consumption loses a race', async () => {
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      passwordResetToken: {
        findUnique: vi.fn()
          .mockResolvedValueOnce({ tenantId: 'tenant-a' })
          .mockResolvedValueOnce({
            id: 'reset-id',
            tenantId: 'tenant-a',
            userId: 'user-a',
            expiresAt: new Date('2026-03-01T11:00:00.000Z'),
            usedAt: null,
            revokedAt: null,
          }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      user: { updateMany: vi.fn() },
      authSession: { updateMany: vi.fn() },
    };
    sharedPrisma.$transaction.mockImplementation(
      async (operation: (tx: typeof transaction) => Promise<unknown>) => operation(transaction),
    );
    const service = new PrismaService(new TenantContext());

    await expect(
      service.completePasswordReset({
        tokenHash: 'reset-token-hash',
        passwordHash: 'new-hash',
        now: new Date('2026-03-01T10:00:00.000Z'),
      }),
    ).resolves.toBe(false);

    expect(transaction.user.updateMany).not.toHaveBeenCalled();
    expect(transaction.authSession.updateMany).not.toHaveBeenCalled();
  });

  it('rotates a refresh token atomically under its token-derived tenant', async () => {
    const now = new Date('2026-03-01T10:00:00.000Z');
    const tokenHash = 'old-refresh-hash';
    const nextTokenHash = 'new-refresh-hash';
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      refreshToken: {
        findUnique: vi.fn()
          .mockResolvedValueOnce({ tenantId: 'tenant-a' })
          .mockResolvedValueOnce({
            id: 'refresh-id',
            tenantId: 'tenant-a',
            sessionId: 'session-id',
            expiresAt: new Date('2026-04-01T10:00:00.000Z'),
            usedAt: null,
            session: {
              id: 'session-id',
              expiresAt: new Date('2026-04-01T10:00:00.000Z'),
              revokedAt: null,
              user: {
                id: 'user-a',
                tenantId: 'tenant-a',
                role: 'ADMIN',
                name: 'Agency Admin',
                isActive: true,
                archivedAt: null,
                tenant: { status: 'ACTIVE', archivedAt: null },
              },
            },
          }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockResolvedValue({}),
      },
      authSession: {
        updateMany: vi.fn(),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    sharedPrisma.$transaction.mockImplementation(
      async (operation: (tx: typeof transaction) => Promise<unknown>) => operation(transaction),
    );
    const service = new PrismaService(new TenantContext());

    await expect(
      service.rotateRefreshToken({ tokenHash, nextTokenHash, now }),
    ).resolves.toEqual({
      sessionId: 'session-id',
      user: { id: 'user-a', tenantId: 'tenant-a', role: 'ADMIN', name: 'Agency Admin' },
    });

    expect(sharedPrisma.$transaction).toHaveBeenCalledOnce();
    expect(transaction.$queryRaw).toHaveBeenCalledTimes(2);
    expect(transaction.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { id: 'refresh-id', usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    expect(transaction.refreshToken.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-a',
        sessionId: 'session-id',
        tokenHash: nextTokenHash,
        expiresAt: new Date('2026-04-01T10:00:00.000Z'),
      },
    });
  });
});
