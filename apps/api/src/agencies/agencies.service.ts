import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { BillingInterval, Prisma } from '@rihal/database';
import { PrismaService } from '../database/prisma.service';
import { CreateAgencySubscriptionDto } from './dto/create-agency-subscription.dto';
import { UpdateAgencySubscriptionDto } from './dto/update-agency-subscription.dto';

const activeSubscriptionStatuses = ['TRIALING', 'ACTIVE', 'PAST_DUE'] as const;
type SubscriptionWithPlan = Prisma.AgencySubscriptionGetPayload<{ include: { plan: true } }>;

@Injectable()
export class AgenciesService {
  constructor(private readonly prisma: PrismaService) {}

  async listSubscriptions(tenantId: string): Promise<SubscriptionWithPlan[]> {
    return this.prisma.withRequestTenant(tenantId, (tx) =>
      tx.agencySubscription.findMany({
        where: { tenantId },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  async createSubscription(
    tenantId: string,
    input: CreateAgencySubscriptionDto,
  ): Promise<SubscriptionWithPlan> {
    const dto = await this.validateDto(CreateAgencySubscriptionDto, input);

    return this.prisma.withRequestTenant(tenantId, async (tx) => {
      const plan = await tx.subscriptionPlan.findFirst({
        where: { id: dto.subscriptionPlanId, isActive: true },
        select: { id: true, billingInterval: true, price: true, currency: true },
      });
      if (!plan) {
        throw new NotFoundException('The requested subscription plan is not available.');
      }

      const now = new Date();
      const periodEnd = addBillingPeriod(now, plan.billingInterval);
      return tx.agencySubscription.create({
        data: {
          tenantId,
          subscriptionPlanId: plan.id,
          status: 'TRIALING',
          startsAt: now,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          trialEndsAt: periodEnd,
          price: plan.price,
          currency: plan.currency,
        },
        include: { plan: true },
      });
    });
  }

  async updateSubscription(
    tenantId: string,
    subscriptionId: string,
    input: UpdateAgencySubscriptionDto,
  ): Promise<SubscriptionWithPlan> {
    const dto = await this.validateDto(UpdateAgencySubscriptionDto, input);

    return this.prisma.withRequestTenant(tenantId, async (tx) => {
      const result = await tx.agencySubscription.updateMany({
        where: {
          id: subscriptionId,
          tenantId,
          status: { in: [...activeSubscriptionStatuses] },
          currentPeriodEnd: { gt: new Date() },
        },
        data: { cancelAtPeriodEnd: dto.cancelAtPeriodEnd },
      });
      if (result.count !== 1) {
        throw new NotFoundException('An active subscription for this agency was not found.');
      }

      return tx.agencySubscription.findUniqueOrThrow({
        where: { tenantId_id: { tenantId, id: subscriptionId } },
        include: { plan: true },
      });
    });
  }

  private async validateDto<T extends object>(
    dtoType: new () => T,
    input: T,
  ): Promise<T> {
    const dto = plainToInstance(dtoType, input);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    });
    if (errors.length > 0) {
      throw new BadRequestException('Invalid subscription data.');
    }
    return dto;
  }
}

function addBillingPeriod(start: Date, interval: BillingInterval): Date {
  const end = new Date(start);
  const originalDay = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + (interval === 'MONTHLY' ? 1 : 12));
  const lastDayOfTargetMonth = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0),
  ).getUTCDate();
  end.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
  return end;
}
