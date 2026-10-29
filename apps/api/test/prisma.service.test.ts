import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sharedPrisma } = vi.hoisted(() => ({
  sharedPrisma: {
    $disconnect: vi.fn(),
    $transaction: vi.fn(),
  },
}));

vi.mock('@rihal/database', () => ({ prisma: sharedPrisma }));

import { prisma } from '@rihal/database';
import { PrismaService } from '../src/database/prisma.service';
import { TenantContext } from '../src/database/tenant-context';

describe('PrismaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the shared database package client and disconnects on shutdown', async () => {
    const service = new PrismaService(new TenantContext());

    expect(service.client).toBe(prisma);

    await service.onModuleDestroy();

    expect(sharedPrisma.$disconnect).toHaveBeenCalledOnce();
  });

  it('sets the authenticated tenant transaction-locally before running a database operation', async () => {
    const queryRaw = vi.fn().mockResolvedValue([]);
    const transaction = { $queryRaw: queryRaw };
    sharedPrisma.$transaction.mockImplementation(async (operation: (tx: typeof transaction) => Promise<unknown>) =>
      operation(transaction),
    );
    const service = new PrismaService(new TenantContext());

    await expect(service.withTenant('tenant-from-verified-claims', async () => 'complete')).resolves.toBe('complete');

    expect(sharedPrisma.$transaction).toHaveBeenCalledOnce();
    expect(queryRaw).toHaveBeenCalledOnce();
  });

  it('rejects a service tenant that differs from the request identity', async () => {
    const tenantContext = new TenantContext();
    const service = new PrismaService(tenantContext);

    await expect(
      tenantContext.run('verified-tenant', () => service.withTenant('client-supplied-tenant', async () => undefined)),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(sharedPrisma.$transaction).not.toHaveBeenCalled();
  });
});
