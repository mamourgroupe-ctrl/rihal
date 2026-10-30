import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../src/database/prisma.service';
import { TenantContext } from '../src/database/tenant-context';
import { AgenciesService } from '../src/agencies/agencies.service';
import { describe, expect, it, vi } from 'vitest';

function createService(planResult: unknown = {
  id: 'plan-monthly',
  billingInterval: 'MONTHLY',
  price: '25.00',
  currency: 'SAR',
}) {
  const transaction = {
    subscriptionPlan: { findFirst: vi.fn().mockResolvedValue(planResult) },
    agencySubscription: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'subscription-a' }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'subscription-a' }),
    },
  };
  const tenantContext = new TenantContext();
  const prisma = {
    withRequestTenant: vi.fn((tenantId: string, operation: (tx: typeof transaction) => Promise<unknown>) => {
      const requestTenantId = tenantContext.getTenantId();
      if (!requestTenantId || requestTenantId !== tenantId) {
        throw new ForbiddenException('A matching authenticated tenant context is required.');
      }
      return operation(transaction);
    }),
  } as unknown as PrismaService;

  return {
    service: new AgenciesService(prisma),
    tenantContext,
    prisma,
    transaction,
  };
}

describe('AgenciesService', () => {
  it('fails closed without a trusted tenant context', async () => {
    const { service, prisma, transaction } = createService();

    await expect(
      service.createSubscription('tenant-a', { subscriptionPlanId: 'plan-monthly' }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.withRequestTenant).toHaveBeenCalledOnce();
    expect(transaction.subscriptionPlan.findFirst).not.toHaveBeenCalled();
  });

  it('creates a trial using plan pricing and a clamped calendar-month period', async () => {
    const { service, tenantContext, transaction } = createService();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-31T12:30:00.000Z'));

    try {
      await tenantContext.run('tenant-a', () =>
        service.createSubscription('tenant-a', { subscriptionPlanId: 'plan-monthly' }),
      );
    } finally {
      vi.useRealTimers();
    }

    expect(transaction.subscriptionPlan.findFirst).toHaveBeenCalledWith({
      where: { id: 'plan-monthly', isActive: true },
      select: { id: true, billingInterval: true, price: true, currency: true },
    });
    expect(transaction.agencySubscription.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-a',
        subscriptionPlanId: 'plan-monthly',
        status: 'TRIALING',
        startsAt: new Date('2026-01-31T12:30:00.000Z'),
        currentPeriodStart: new Date('2026-01-31T12:30:00.000Z'),
        currentPeriodEnd: new Date('2026-02-28T12:30:00.000Z'),
        trialEndsAt: new Date('2026-02-28T12:30:00.000Z'),
        price: '25.00',
        currency: 'SAR',
      },
      include: { plan: true },
    });
  });

  it('rejects inactive or unknown subscription plans', async () => {
    const { service, tenantContext, transaction } = createService(null);

    await expect(
      tenantContext.run('tenant-a', () =>
        service.createSubscription('tenant-a', { subscriptionPlanId: 'disabled-plan' }),
      ),
    ).rejects.toMatchObject({ status: 404 });
    expect(transaction.agencySubscription.create).not.toHaveBeenCalled();
  });

  it('rejects DTO fields that could supply a tenant or client-controlled price', async () => {
    const { service, tenantContext, transaction } = createService();

    await expect(
      tenantContext.run('tenant-a', () =>
        service.createSubscription('tenant-a', {
          subscriptionPlanId: 'plan-monthly',
          tenantId: 'tenant-b',
          price: '0.01',
        } as never),
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(transaction.agencySubscription.create).not.toHaveBeenCalled();
  });

  it('updates cancellation only for a current-tenant subscription in a live state', async () => {
    const { service, tenantContext, transaction } = createService();

    await tenantContext.run('tenant-a', () =>
      service.updateSubscription('tenant-a', 'subscription-a', { cancelAtPeriodEnd: true }),
    );

    expect(transaction.agencySubscription.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'subscription-a',
        tenantId: 'tenant-a',
        status: { in: ['TRIALING', 'ACTIVE', 'PAST_DUE'] },
        currentPeriodEnd: { gt: expect.any(Date) },
      },
      data: { cancelAtPeriodEnd: true },
    });
    expect(transaction.agencySubscription.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { tenantId_id: { tenantId: 'tenant-a', id: 'subscription-a' } },
      include: { plan: true },
    });
  });
});
