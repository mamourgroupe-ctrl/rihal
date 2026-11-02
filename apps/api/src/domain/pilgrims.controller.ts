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
import { PilgrimsService } from './pilgrims.service';

const PILGRIM_STATUSES = [
  'DRAFT',
  'REGISTERED',
  'DOCUMENTS_UPLOADED',
  'READY_FOR_BOOKING',
  'BOOKED',
  'PERMIT_ISSUED',
  'COMPLETED',
  'CANCELLED',
] as const;

const WRITE_ROLES = ['ADMIN', 'OPERATOR', 'SUPERVISOR'] as const;

const isoDate = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
  .transform((value) => new Date(value));

const listQuerySchema = z
  .object({
    status: z.enum(PILGRIM_STATUSES).optional(),
    search: z.string().trim().min(1).max(80).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).max(100_000).default(0),
  })
  .strict();

const createSchema = z
  .object({
    fullNameAr: z.string().trim().min(2).max(120),
    fullNameEn: z.string().trim().min(2).max(120),
    passportNumber: z.string().trim().min(3).max(40),
    passportExpiry: isoDate,
    nationality: z.string().trim().length(2).transform((value) => value.toUpperCase()),
    dateOfBirth: isoDate.optional(),
    gender: z.enum(['MALE', 'FEMALE']).optional(),
    phone: z.string().trim().max(32).optional(),
    email: z.string().trim().email().max(254).optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();

const updateSchema = z
  .object({
    phone: z.string().trim().max(32).nullable().optional(),
    email: z.string().trim().email().max(254).nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
    passportExpiry: isoDate.optional(),
    nationality: z.string().trim().length(2).optional(),
  })
  .strict();

const statusSchema = z.object({ status: z.enum(PILGRIM_STATUSES) }).strict();

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

@Controller('pilgrims')
@Roles(...AUTH_ROLES)
export class PilgrimsController {
  constructor(private readonly pilgrims: PilgrimsService) {}

  @Get()
  async list(@CurrentTenantId() tenantId: string, @Query() query: unknown) {
    const options = parse(listQuerySchema, query ?? {}, 'Invalid pilgrim filters.');
    const result = await this.pilgrims.list(tenantId, options);
    return { ...result, limit: options.limit, offset: options.offset };
  }

  @Get(':id')
  findOne(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    return this.pilgrims.findOne(tenantId, id);
  }

  @Post()
  @Roles(...WRITE_ROLES)
  create(@CurrentTenantId() tenantId: string, @Body() body: unknown) {
    return this.pilgrims.create(tenantId, parse(createSchema, body, 'Invalid pilgrim data.'));
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  update(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.pilgrims.update(tenantId, id, parse(updateSchema, body, 'Invalid pilgrim update.'));
  }

  @Patch(':id/status')
  @Roles(...WRITE_ROLES)
  transition(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const { status } = parse(statusSchema, body, 'Invalid pilgrim status.');
    return this.pilgrims.transitionStatus(tenantId, id, status);
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  async archive(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    await this.pilgrims.archive(tenantId, id);
  }
}
