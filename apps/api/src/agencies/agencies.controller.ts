import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import type { Prisma } from '@rihal/database';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentTenantId } from '../auth/auth.decorators';
import { Roles } from '../auth/auth.decorators';
import { AgenciesService } from './agencies.service';
import { CreateAgencySubscriptionDto } from './dto/create-agency-subscription.dto';
import { UpdateAgencySubscriptionDto } from './dto/update-agency-subscription.dto';

type SubscriptionWithPlan = Prisma.AgencySubscriptionGetPayload<{ include: { plan: true } }>;

@ApiTags('Agencies')
@Controller('agencies/subscription')
export class AgenciesController {
  constructor(private readonly agencies: AgenciesService) {}

  @Get()
  @Roles('ADMIN', 'SUPERVISOR', 'OPERATOR', 'VIEWER')
  @ApiOperation({ summary: 'Get the current active agency subscription' })
  @ApiResponse({ status: 200, description: 'Current subscription or null' })
  getCurrentSubscription(
    @CurrentTenantId() tenantId: string,
  ): Promise<SubscriptionWithPlan | null> {
    return this.agencies.getCurrentSubscription(tenantId);
  }

  @Get('list')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'List all agency subscriptions for the tenant' })
  @ApiResponse({ status: 200, description: 'List of subscriptions' })
  listSubscriptions(
    @CurrentTenantId() tenantId: string,
  ): Promise<SubscriptionWithPlan[]> {
    return this.agencies.listSubscriptions(tenantId);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new agency subscription (trial)' })
  @ApiResponse({ status: 201, description: 'Created subscription' })
  @ApiResponse({ status: 404, description: 'Subscription plan not available' })
  createSubscription(
    @CurrentTenantId() tenantId: string,
    @Body() input: CreateAgencySubscriptionDto,
  ): Promise<SubscriptionWithPlan> {
    return this.agencies.createSubscription(tenantId, input);
  }

  @Patch(':subscriptionId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update an agency subscription (e.g. cancel at period end)' })
  @ApiResponse({ status: 200, description: 'Updated subscription' })
  @ApiResponse({ status: 404, description: 'Active subscription not found' })
  updateSubscription(
    @CurrentTenantId() tenantId: string,
    @Param('subscriptionId') subscriptionId: string,
    @Body() input: UpdateAgencySubscriptionDto,
  ): Promise<SubscriptionWithPlan> {
    return this.agencies.updateSubscription(tenantId, subscriptionId, input);
  }
}
