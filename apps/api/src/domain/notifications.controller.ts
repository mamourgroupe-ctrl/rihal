import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentTenantId, Roles } from '../auth/auth.decorators';
import { AUTH_ROLES } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';

const querySchema = z
  .object({
    status: z.enum(['PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED']).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();

/**
 * Read-only view of the notification outbox. Payloads may contain encrypted
 * recovery links, so they are never returned here.
 */
@Controller('notifications')
@Roles(...AUTH_ROLES)
export class NotificationsController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get()
  async list(@CurrentTenantId() tenantId: string, @Query() query: unknown) {
    const parsed = querySchema.safeParse(query ?? {});
    if (!parsed.success) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'INVALID_INPUT',
        message: 'Invalid notification filters.',
      });
    }
    const { status, limit } = parsed.data;

    return this.prismaService.withTenant(tenantId, (tx) =>
      tx.notification.findMany({
        where: { tenantId, archivedAt: null, ...(status ? { status } : {}) },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          channel: true,
          template: true,
          status: true,
          sentAt: true,
          error: true,
          createdAt: true,
        },
      }),
    );
  }
}
