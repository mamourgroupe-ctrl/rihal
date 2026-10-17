import { Controller, Get, UseGuards } from '@nestjs/common';
import { Tenant, TenantGuard } from '../common/tenant';
import { DataService } from '../domain/data.service';

@Controller('dashboard')
@UseGuards(TenantGuard)
export class DashboardController {
  constructor(private readonly data: DataService) {}

  /** GET /api/dashboard — tenant-scoped KPIs for the overview screen. */
  @Get()
  overview(@Tenant() tenantId: string) {
    return this.data.stats(tenantId);
  }
}
