import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Tenant, TenantGuard } from '../common/tenant';
import { DataService } from '../domain/data.service';
import { CreatePilgrimDto, ListPilgrimsQueryDto, UpdatePilgrimDto } from './dto';
import { PilgrimsService } from './pilgrims.service';

@Controller('pilgrims')
@UseGuards(TenantGuard)
export class PilgrimsController {
  constructor(
    private readonly pilgrims: PilgrimsService,
    private readonly data: DataService,
  ) {}

  /** GET /api/pilgrims — paginated, searchable, filterable by status. */
  @Get()
  list(@Tenant() tenantId: string, @Query() query: ListPilgrimsQueryDto) {
    return this.pilgrims.list(tenantId, {
      search: query.search,
      status: query.status,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }

  /** GET /api/pilgrims/stats — aggregates used by the dashboard. */
  @Get('stats')
  stats(@Tenant() tenantId: string) {
    return this.data.stats(tenantId);
  }

  /** GET /api/pilgrims/:id */
  @Get(':id')
  findOne(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.pilgrims.findOne(tenantId, id);
  }

  /** POST /api/pilgrims */
  @Post()
  create(@Tenant() tenantId: string, @Body() body: CreatePilgrimDto) {
    return this.pilgrims.create(tenantId, body);
  }

  /** PATCH /api/pilgrims/:id */
  @Patch(':id')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: UpdatePilgrimDto,
  ) {
    return this.pilgrims.update(tenantId, id, body);
  }

  /** DELETE /api/pilgrims/:id */
  @Delete(':id')
  @HttpCode(204)
  async remove(@Tenant() tenantId: string, @Param('id') id: string) {
    await this.pilgrims.remove(tenantId, id);
  }
}
