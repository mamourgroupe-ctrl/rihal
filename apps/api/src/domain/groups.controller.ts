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
import { GroupsService } from './groups.service';

const GROUP_STATUSES = ['DRAFT', 'READY', 'SUBMITTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const;
const WRITE_ROLES = ['ADMIN', 'OPERATOR', 'SUPERVISOR'] as const;

const isoDate = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
  .transform((value) => new Date(value));

const listQuerySchema = z
  .object({
    status: z.enum(GROUP_STATUSES).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).max(100_000).default(0),
  })
  .strict();

const createSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(500).optional(),
    maxSize: z.number().int().min(1).max(200).optional(),
    scheduledDate: isoDate.optional(),
  })
  .strict();

const memberSchema = z
  .object({
    pilgrimId: z.string().trim().min(1),
    isLeader: z.boolean().optional(),
  })
  .strict();

const statusSchema = z.object({ status: z.enum(GROUP_STATUSES) }).strict();

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

@Controller('groups')
@Roles(...AUTH_ROLES)
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  async list(@CurrentTenantId() tenantId: string, @Query() query: unknown) {
    const options = parse(listQuerySchema, query ?? {}, 'Invalid group filters.');
    const result = await this.groups.list(tenantId, options);
    return { ...result, limit: options.limit, offset: options.offset };
  }

  @Get(':id')
  findOne(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    return this.groups.findOne(tenantId, id);
  }

  @Post()
  @Roles(...WRITE_ROLES)
  create(@CurrentTenantId() tenantId: string, @Body() body: unknown) {
    return this.groups.create(tenantId, parse(createSchema, body, 'Invalid group data.'));
  }

  @Post(':id/members')
  @Roles(...WRITE_ROLES)
  addMember(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = parse(memberSchema, body, 'Invalid group member data.');
    return this.groups.addMember(tenantId, id, input.pilgrimId, input.isLeader ?? false);
  }

  @Delete(':id/members/:memberId')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    await this.groups.removeMember(tenantId, id, memberId);
  }

  @Patch(':id/status')
  @Roles(...WRITE_ROLES)
  transition(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const { status } = parse(statusSchema, body, 'Invalid group status.');
    return this.groups.transitionStatus(tenantId, id, status);
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  async archive(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    await this.groups.archive(tenantId, id);
  }
}
