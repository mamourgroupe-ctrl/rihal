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
  Res,
} from '@nestjs/common';
import { Roles } from '../auth/auth.decorators';
import { Tenant } from '../common/tenant';
import { CreateInvoiceDto, ListInvoicesQueryDto } from './dto';
import { InvoicesService } from './invoices.service';
import * as QRCode from 'qrcode';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  /** GET /api/invoices?status=ISSUED&page=1 */
  @Get()
  list(@Tenant() tenantId: string, @Query() query: ListInvoicesQueryDto) {
    return this.invoices.list(tenantId, {
      status: query.status,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }

  /** GET /api/invoices/stats — billing KPIs. */
  @Get('stats')
  stats(@Tenant() tenantId: string) {
    return this.invoices.stats(tenantId);
  }

  /** POST /api/invoices — creates a DRAFT. */
  @Roles('ADMIN', 'OPERATOR', 'SUPERVISOR')
  @Post()
  create(@Tenant() tenantId: string, @Body() body: CreateInvoiceDto) {
    return this.invoices.create(tenantId, body);
  }

  /** GET /api/invoices/:id */
  @Get(':id')
  findOne(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.invoices.findOne(tenantId, id);
  }

  /** POST /api/invoices/:id/issue — assigns number, UUID, QR and hash chain. */
  @Roles('ADMIN', 'OPERATOR')
  @Post(':id/issue')
  issue(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.invoices.issue(tenantId, id);
  }

  /** POST /api/invoices/:id/pay */
  @Roles('ADMIN', 'OPERATOR')
  @Post(':id/pay')
  pay(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.invoices.markPaid(tenantId, id);
  }

  /** POST /api/invoices/:id/cancel */
  @Roles('ADMIN')
  @Post(':id/cancel')
  cancel(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.invoices.cancel(tenantId, id);
  }

  /** DELETE /api/invoices/:id — drafts and cancelled invoices only. */
  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(204)
  async remove(@Tenant() tenantId: string, @Param('id') id: string) {
    await this.invoices.remove(tenantId, id);
  }

  /** GET /api/invoices/:id/qr — decoded TLV fields. */
  @Get(':id/qr')
  qr(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.invoices.qr(tenantId, id);
  }

  /** GET /api/invoices/:id/qr.svg — scannable QR for the printed invoice. */
  @Get(':id/qr.svg')
  async qrSvg(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Res() res: any,
  ) {
    const { base64 } = await this.invoices.qr(tenantId, id);
    const svg = await QRCode.toString(base64, {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'M',
    });
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.end(svg);
  }

  /** GET /api/invoices/:id/xml — UBL 2.1 (simplified tax invoice). */
  @Get(':id/xml')
  async xml(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Res() res: any,
  ) {
    const { invoice, xml } = await this.invoices.xml(tenantId, id);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${invoice.invoiceNumber ?? invoice.id}.xml"`,
    );
    res.end(xml);
  }
}
