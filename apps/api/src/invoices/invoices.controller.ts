import { Controller, Get, Post, Body } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}
  @Get() findAll() { return { data: this.service.findAll() }; }
  @Get('stats') stats() { return this.service.stats(); }
  @Post() create(@Body() body: any) { return this.service.create(body); }
}
