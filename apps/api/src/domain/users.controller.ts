import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import { CurrentTenantId, CurrentUser, Roles } from '../auth/auth.decorators';
import { AUTH_ROLES, type AuthenticatedUser } from '../auth/auth.types';
import { UsersService } from './users.service';

const ROLES = ['ADMIN', 'OPERATOR', 'SUPERVISOR', 'VIEWER'] as const;

const createSchema = z
  .object({
    email: z.string().trim().email().max(254),
    name: z.string().trim().min(2).max(120),
    role: z.enum(ROLES),
    password: z.string().min(12).max(72),
    phone: z.string().trim().max(32).optional(),
  })
  .strict();

const updateSchema = z
  .object({
    role: z.enum(ROLES).optional(),
    isActive: z.boolean().optional(),
    name: z.string().trim().min(2).max(120).optional(),
    phone: z.string().trim().max(32).nullable().optional(),
  })
  .strict();

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

/** Team management. Every route is tenant-scoped and restricted to admins. */
@Controller('users')
@Roles(...AUTH_ROLES)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@CurrentTenantId() tenantId: string) {
    return this.users.list(tenantId);
  }

  @Post()
  @Roles('ADMIN')
  create(@CurrentTenantId() tenantId: string, @Body() body: unknown) {
    return this.users.create(tenantId, parse(createSchema, body, 'Invalid user data.'));
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @CurrentTenantId() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = parse(updateSchema, body, 'Invalid user update.');
    if (actor.sub === id && input.isActive === false) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'INVALID_INPUT',
        message: 'You cannot deactivate your own account.',
      });
    }
    return this.users.update(tenantId, id, input);
  }
}
