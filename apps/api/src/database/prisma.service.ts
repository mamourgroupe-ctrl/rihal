import { BadRequestException, ForbiddenException, Injectable, OnModuleDestroy } from '@nestjs/common';
import type { Prisma, PrismaClient, Role } from '@rihal/database';
import { prisma } from '@rihal/database';
import { TenantContext } from './tenant-context';

interface LoginAccount {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
}

interface TokenUser {
  id: string;
  tenantId: string;
  role: Role;
  name: string;
}

@Injectable()
export class PrismaService implements OnModuleDestroy {
  private readonly client: PrismaClient = prisma;

  constructor(private readonly tenantContext: TenantContext) {}

  async withRequestTenant<T>(
    tenantId: string,
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    if (!tenantId) {
      throw new ForbiddenException('A verified tenant context is required.');
    }

    const requestTenantId = this.tenantContext.getTenantId();
    if (!requestTenantId || requestTenantId !== tenantId) {
      throw new ForbiddenException('A matching authenticated tenant context is required.');
    }

    return this.withTenantTransaction(tenantId, operation);
  }

  async findLoginAccount(tenantSlug: string, email: string): Promise<LoginAccount | null> {
    const tenant = await this.client.tenant.findFirst({
      where: { slug: tenantSlug, status: 'ACTIVE', archivedAt: null },
      select: { id: true },
    });
    if (!tenant) {
      return null;
    }

    return this.withTenantTransaction(tenant.id, (tx) =>
      tx.user.findFirst({
        where: {
          tenantId: tenant.id,
          email,
          isActive: true,
          archivedAt: null,
        },
        select: {
          id: true,
          tenantId: true,
          email: true,
          name: true,
          role: true,
          passwordHash: true,
        },
      }),
    );
  }

  async createLoginSession(input: {
    userId: string;
    tenantId: string;
    passwordHash: string;
    expiresAt: Date;
    refreshTokenHash: string;
    now: Date;
  }): Promise<{ sessionId: string; user: TokenUser } | null> {
    return this.withTenantTransaction(input.tenantId, async (tx) => {
      const user = await tx.user.findFirst({
        where: {
          id: input.userId,
          tenantId: input.tenantId,
          passwordHash: input.passwordHash,
          isActive: true,
          archivedAt: null,
          tenant: { status: 'ACTIVE', archivedAt: null },
        },
        select: { id: true, tenantId: true, role: true, name: true },
      });
      if (!user) {
        return null;
      }

      const session = await tx.authSession.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          expiresAt: input.expiresAt,
          refreshTokens: {
            create: {
              tokenHash: input.refreshTokenHash,
              expiresAt: input.expiresAt,
            },
          },
        },
        select: { id: true },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: input.now },
      });

      return { sessionId: session.id, user };
    });
  }

  async isAccessSessionActive(input: {
    tenantId: string;
    userId: string;
    sessionId: string;
    role: Role;
    now: Date;
  }): Promise<boolean> {
    const session = await this.withTenantTransaction(input.tenantId, (tx) =>
      tx.authSession.findFirst({
        where: {
          id: input.sessionId,
          tenantId: input.tenantId,
          userId: input.userId,
          revokedAt: null,
          expiresAt: { gt: input.now },
        },
        select: {
          user: {
            select: {
              isActive: true,
              archivedAt: true,
              role: true,
              tenant: { select: { status: true, archivedAt: true } },
            },
          },
        },
      }),
    );

    return Boolean(
      session &&
        session.user.isActive &&
        session.user.archivedAt === null &&
        session.user.role === input.role &&
        session.user.tenant.status === 'ACTIVE' &&
        session.user.tenant.archivedAt === null,
    );
  }

  async preparePasswordRecovery(input: {
    tenantSlug: string;
    email: string;
    tokenHash: string;
    expiresAt: Date;
    payload: Prisma.InputJsonValue;
    now: Date;
  }): Promise<{ email: string; notificationId: string } | null> {
    const tenant = await this.client.tenant.findFirst({
      where: { slug: input.tenantSlug, status: 'ACTIVE', archivedAt: null },
      select: { id: true },
    });
    if (!tenant) {
      return null;
    }

    return this.withTenantTransaction(tenant.id, async (tx) => {
      const user = await tx.user.findFirst({
        where: {
          tenantId: tenant.id,
          email: input.email,
          isActive: true,
          archivedAt: null,
        },
        select: { id: true, email: true },
      });
      if (!user) {
        return null;
      }

      await tx.passwordResetToken.updateMany({
        where: {
          tenantId: tenant.id,
          userId: user.id,
          usedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: input.now },
      });
      await tx.passwordResetToken.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
        },
      });
      const notification = await tx.notification.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          channel: 'EMAIL',
          template: 'password-reset',
          payload: input.payload,
        },
        select: { id: true },
      });
      return { email: user.email, notificationId: notification.id };
    });
  }

  async rotateRefreshToken(input: {
    tokenHash: string;
    nextTokenHash: string;
    now: Date;
  }): Promise<{ sessionId: string; user: TokenUser } | null> {
    return this.client.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT set_config('app.refresh_token_hash', ${input.tokenHash}, true)
      `;
      const identity = await tx.refreshToken.findUnique({
        where: { tokenHash: input.tokenHash },
        select: { tenantId: true },
      });
      if (!identity) {
        return null;
      }
      await this.setLocalTenant(tx, identity.tenantId);

      const stored = await tx.refreshToken.findUnique({
        where: { tokenHash: input.tokenHash },
        include: {
          session: {
            include: {
              user: {
                select: {
                  id: true,
                  tenantId: true,
                  role: true,
                  name: true,
                  isActive: true,
                  archivedAt: true,
                  tenant: { select: { status: true, archivedAt: true } },
                },
              },
            },
          },
        },
      });
      if (!stored) {
        return null;
      }

      const session = stored.session;
      const user = session.user;
      const userIsActive =
        user.isActive &&
        user.archivedAt === null &&
        user.tenant.status === 'ACTIVE' &&
        user.tenant.archivedAt === null;

      if (stored.usedAt) {
        await tx.authSession.updateMany({
          where: { id: stored.sessionId, revokedAt: null },
          data: { revokedAt: input.now },
        });
        return null;
      }

      if (
        stored.expiresAt <= input.now ||
        session.expiresAt <= input.now ||
        session.revokedAt !== null ||
        !userIsActive
      ) {
        if (!userIsActive) {
          await tx.authSession.updateMany({
            where: { id: session.id, revokedAt: null },
            data: { revokedAt: input.now },
          });
        }
        return null;
      }

      const consumed = await tx.refreshToken.updateMany({
        where: { id: stored.id, usedAt: null, expiresAt: { gt: input.now } },
        data: { usedAt: input.now },
      });
      if (consumed.count !== 1) {
        await tx.authSession.updateMany({
          where: { id: session.id, revokedAt: null },
          data: { revokedAt: input.now },
        });
        return null;
      }

      await tx.refreshToken.create({
        data: {
          tenantId: user.tenantId,
          sessionId: session.id,
          tokenHash: input.nextTokenHash,
          expiresAt: session.expiresAt,
        },
      });
      await tx.authSession.update({
        where: { id: session.id },
        data: { lastUsedAt: input.now },
      });

      return {
        sessionId: session.id,
        user: { id: user.id, tenantId: user.tenantId, role: user.role, name: user.name },
      };
    });
  }

  async revokeSessionForRefreshToken(tokenHash: string, now: Date): Promise<void> {
    await this.client.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT set_config('app.refresh_token_hash', ${tokenHash}, true)
      `;
      const stored = await tx.refreshToken.findUnique({
        where: { tokenHash },
        select: { tenantId: true, sessionId: true },
      });
      if (!stored) {
        return;
      }
      await this.setLocalTenant(tx, stored.tenantId);
      await tx.authSession.updateMany({
        where: { id: stored.sessionId, revokedAt: null },
        data: { revokedAt: now },
      });
    });
  }

  async completePasswordReset(input: {
    tokenHash: string;
    passwordHash: string;
    now: Date;
  }): Promise<boolean> {
    return this.client.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT set_config('app.password_reset_token_hash', ${input.tokenHash}, true)
      `;
      const tokenIdentity = await tx.passwordResetToken.findUnique({
        where: { tokenHash: input.tokenHash },
        select: { tenantId: true },
      });
      if (!tokenIdentity) {
        return false;
      }
      await this.setLocalTenant(tx, tokenIdentity.tenantId);
      const token = await tx.passwordResetToken.findUnique({
        where: { tokenHash: input.tokenHash },
        select: { id: true, tenantId: true, userId: true, expiresAt: true, usedAt: true, revokedAt: true },
      });
      if (!token || token.usedAt || token.revokedAt || token.expiresAt <= input.now) {
        return false;
      }

      const consumed = await tx.passwordResetToken.updateMany({
        where: {
          id: token.id,
          usedAt: null,
          revokedAt: null,
          expiresAt: { gt: input.now },
        },
        data: { usedAt: input.now },
      });
      if (consumed.count !== 1) {
        return false;
      }

      const updatedUser = await tx.user.updateMany({
        where: {
          id: token.userId,
          tenantId: token.tenantId,
          isActive: true,
          archivedAt: null,
        },
        data: { passwordHash: input.passwordHash },
      });
      if (updatedUser.count !== 1) {
        throw new BadRequestException('Invalid or expired recovery token');
      }

      await tx.authSession.updateMany({
        where: { tenantId: token.tenantId, userId: token.userId, revokedAt: null },
        data: { revokedAt: input.now },
      });
      await tx.passwordResetToken.updateMany({
        where: {
          tenantId: token.tenantId,
          userId: token.userId,
          id: { not: token.id },
          usedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: input.now },
      });
      return true;
    });
  }

  async markRecoveryNotificationSent(
    tokenHash: string,
    notificationId: string,
    sentAt: Date,
  ): Promise<void> {
    await this.client.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT set_config('app.password_reset_token_hash', ${tokenHash}, true)
      `;
      const token = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
        select: { tenantId: true, userId: true },
      });
      if (!token) {
        return;
      }
      await this.setLocalTenant(tx, token.tenantId);
      await tx.notification.updateMany({
        where: {
          id: notificationId,
          tenantId: token.tenantId,
          userId: token.userId,
          status: 'PENDING',
        },
        data: { status: 'SENT', sentAt },
      });
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }

  private async withTenantTransaction<T>(
    tenantId: string,
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    if (!tenantId) {
      throw new ForbiddenException('A verified tenant context is required.');
    }
    return this.client.$transaction(async (transaction) => {
      await this.setLocalTenant(transaction, tenantId);
      return operation(transaction);
    });
  }

  private async setLocalTenant(transaction: Prisma.TransactionClient, tenantId: string): Promise<void> {
    if (!tenantId) {
      throw new ForbiddenException('A verified tenant context is required.');
    }
    await transaction.$queryRaw`
      SELECT set_config('app.current_tenant_id', ${tenantId}, true)
    `;
  }
}
