import { ForbiddenException, Injectable, OnModuleDestroy } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@rihal/database';
import { prisma } from '@rihal/database';
import { TenantContext } from './tenant-context';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly client: PrismaClient = prisma;

  constructor(private readonly tenantContext: TenantContext) {}

  async withTenant<T>(
    tenantId: string,
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    if (!tenantId) {
      throw new ForbiddenException('A verified tenant context is required.');
    }

    const requestTenantId = this.tenantContext.getTenantId();
    if (requestTenantId && requestTenantId !== tenantId) {
      throw new ForbiddenException('The requested tenant does not match the authenticated identity.');
    }

    return this.client.$transaction(async (transaction) => {
      await this.setLocalTenant(transaction, tenantId);
      return operation(transaction);
    });
  }

  async withRefreshTokenLookup<T>(
    tokenHash: string,
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT set_config('app.refresh_token_hash', ${tokenHash}, true)
      `;
      return operation(transaction);
    });
  }

  async withPasswordResetTokenLookup<T>(
    tokenHash: string,
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT set_config('app.password_reset_token_hash', ${tokenHash}, true)
      `;
      return operation(transaction);
    });
  }

  async setLocalTenant(transaction: Prisma.TransactionClient, tenantId: string): Promise<void> {
    if (!tenantId) {
      throw new ForbiddenException('A verified tenant context is required.');
    }
    const requestTenantId = this.tenantContext.getTenantId();
    if (requestTenantId && requestTenantId !== tenantId) {
      throw new ForbiddenException('The requested tenant does not match the authenticated identity.');
    }
    await transaction.$queryRaw`
      SELECT set_config('app.current_tenant_id', ${tenantId}, true)
    `;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
