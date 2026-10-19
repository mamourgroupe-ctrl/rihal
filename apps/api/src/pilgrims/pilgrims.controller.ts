import { Controller, Get, Post, Patch, Delete, Param, Query, Body } from '@nestjs/common';
import { PilgrimsService } from './pilgrims.service';

@Controller('pilgrims')
export class PilgrimsController {
  constructor(private readonly service: PilgrimsService) {}

  @Get()
  findAll(@Query('status') status?: string, @Query('search') search?: string) {
    return { data: this.service.findAll({ status, search }), total: this.service.findAll({ status, search }).length };
  }

  @Get('stats')
  stats() { return this.service.stats(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() body: any) { return this.service.create(body); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
