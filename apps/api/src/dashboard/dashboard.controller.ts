import { BadRequestException, Controller, Get, Header, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentTenantId } from '../auth/auth.decorators';
import { Roles } from '../auth/auth.decorators';
import { AUTH_ROLES } from '../auth/auth.types';
import { DashboardService, PILGRIM_STATUSES, type DashboardOverview, type DashboardPilgrim } from './dashboard.service';

const pilgrimsQuerySchema = z.object({
  status: z.enum(PILGRIM_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

/**
 * Read-only, tenant-scoped aggregates for the operations dashboard.
 * The tenant always comes from verified JWT claims, never from the request.
 */
@Controller('dashboard')
@Roles(...AUTH_ROLES)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('overview')
  @Header('Cache-Control', 'no-store')
  getOverview(@CurrentTenantId() tenantId: string): Promise<DashboardOverview> {
    return this.dashboard.getOverview(tenantId);
  }

  @Get('pilgrims')
  @Header('Cache-Control', 'no-store')
  listPilgrims(
    @CurrentTenantId() tenantId: string,
    @Query() query: unknown,
  ): Promise<DashboardPilgrim[]> {
    const parsed = pilgrimsQuerySchema.safeParse(query ?? {});
    if (!parsed.success) {
      throw new BadRequestException('Invalid pilgrim filter.');
    }
    return this.dashboard.listPilgrims(tenantId, parsed.data);
  }
}
