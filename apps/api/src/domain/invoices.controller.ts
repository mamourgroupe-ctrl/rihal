import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import { CurrentTenantId, Roles } from '../auth/auth.decorators';
import { AUTH_ROLES } from '../auth/auth.types';
import type { Invoice } from '@rihal/database';
import type { InvoiceWithItems } from './invoices.service';
import { InvoicesService } from './invoices.service';

const INVOICE_STATUSES = ['DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'CANCELLED'] as const;
const WRITE_ROLES = ['ADMIN', 'OPERATOR', 'SUPERVISOR'] as const;

const isoDate = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
  .transform((value) => new Date(value));

const listQuerySchema = z
  .object({
    status: z.enum(INVOICE_STATUSES).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).max(100_000).default(0),
  })
  .strict();

const createSchema = z
  .object({
    invoiceNumber: z.string().trim().min(2).max(40),
    customerName: z.string().trim().max(160).optional(),
    pilgrimId: z.string().trim().min(1).optional(),
    currency: z.string().trim().length(3).default('SAR'),
    dueDate: isoDate.optional(),
    items: z
      .array(
        z
          .object({
            description: z.string().trim().min(2).max(200),
            quantity: z.number().int().min(1).max(999),
            unitPrice: z.string().trim().regex(/^\d{1,8}(?:\.\d{1,2})?$/),
          })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict();

const statusSchema = z.object({ status: z.enum(INVOICE_STATUSES) }).strict();

function parse<T>(schema: z.ZodType<T>, payload: unknown, message: string): T {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new BadRequestException({
      statusCode: 400,
      error: 'INVALID_INPUT',
      message,
      issues: result.error.issues.map(({ path, message: issue }) => `${path.join('.')}: ${issue}`),
    });
  }
  return result.data;
}

@Controller('invoices')
@Roles(...AUTH_ROLES)
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  async list(
    @CurrentTenantId() tenantId: string,
    @Query() query: unknown,
  ): Promise<{ items: InvoiceWithItems[]; total: number; limit: number; offset: number }> {
    const options = parse(listQuerySchema, query ?? {}, 'Invalid invoice filters.');
    const result = await this.invoices.list(tenantId, options);
    return { ...result, limit: options.limit, offset: options.offset };
  }

  @Post()
  @Roles(...WRITE_ROLES)
  create(@CurrentTenantId() tenantId: string, @Body() body: unknown) {
    return this.invoices.create(tenantId, parse(createSchema, body, 'Invalid invoice data.'));
  }

  @Patch(':id/status')
  @Roles(...WRITE_ROLES)
  transition(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<Invoice> {
    const { status } = parse(statusSchema, body, 'Invalid invoice status.');
    return this.invoices.transitionStatus(tenantId, id, status);
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  async archive(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    await this.invoices.archive(tenantId, id);
  }
}
