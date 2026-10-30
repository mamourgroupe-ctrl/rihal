import { Body, Controller, Get, Post } from '@nestjs/common';
import type { Prisma } from '@rihal/database';
import { CurrentTenantId } from '../auth/auth.decorators';
import { AgenciesService } from './agencies.service';
import { CreateAgencySubscriptionDto } from './dto/create-agency-subscription.dto';

type SubscriptionWithPlan = Prisma.AgencySubscriptionGetPayload<{ include: { plan: true } }>;

@Controller('agencies/subscription')
export class AgenciesController {
  constructor(private readonly agencies: AgenciesService) {}

  @Get()
  getCurrentSubscription(
    @CurrentTenantId() tenantId: string,
  ): Promise<SubscriptionWithPlan | null> {
    return this.agencies.getCurrentSubscription(tenantId);
  }

  @Post()
  createSubscription(
    @CurrentTenantId() tenantId: string,
    @Body() input: CreateAgencySubscriptionDto,
  ): Promise<SubscriptionWithPlan> {
    return this.agencies.createSubscription(tenantId, input);
  }
}
