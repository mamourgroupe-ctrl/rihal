import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import type { Prisma } from '@rihal/database';
import { PrismaService } from '../database/prisma.service';
import { RecoveryCryptoService } from './recovery-crypto.service';
import { RecoveryMailService } from './recovery-mail.service';
import type {
  AuthRole,
  AuthenticatedUser,
  AuthTokenPair,
  AuthTokenUser,
} from './auth.types';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;
const BCRYPT_COST = 12;
const GENERIC_RECOVERY_MESSAGE =
  'If the account is eligible, password recovery instructions will be sent.';

interface LoginInput {
  tenantSlug: string;
  email: string;
  password: string;
}

interface PasswordResetRequestInput {
  tenantSlug: string;
  email: string;
}

interface PasswordResetInput {
  token: string;
  newPassword: string;
}

@Injectable()
export class AuthService {
  private dummyPasswordHash?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly recoveryCrypto: RecoveryCryptoService,
    private readonly recoveryMail: RecoveryMailService,
  ) {}

  async login(input: LoginInput): Promise<AuthTokenPair> {
    const tenant = await this.prisma.client.tenant.findFirst({
      where: { slug: input.tenantSlug, status: 'ACTIVE', archivedAt: null },
      select: { id: true },
    });
    const user = tenant
      ? await this.prisma.client.user.findFirst({
          where: {
            tenantId: tenant.id,
            email: input.email,
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
        })
      : null;

    const hashToCheck = user?.passwordHash ?? (await this.getDummyPasswordHash());
    const passwordMatches = await this.comparePassword(input.password, hashToCheck);
    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const now = new Date();
    const sessionExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);
    const refreshToken = this.createOpaqueToken();
    const session = await this.prisma.client.$transaction(async (tx) => {
      const created = await tx.authSession.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          expiresAt: sessionExpiresAt,
          refreshTokens: {
            create: {
              tokenHash: this.hashToken(refreshToken),
              expiresAt: sessionExpiresAt,
            },
          },
        },
        select: { id: true },
      });
      await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: now } });
      return created;
    });

    return this.createTokenPair(
      {
        id: user.id,
        tenantId: user.tenantId,
        role: user.role as AuthRole,
        name: user.name,
      },
      session.id,
      refreshToken,
    );
  }

  async rotateRefreshToken(rawToken: string): Promise<AuthTokenPair> {
    if (!rawToken || rawToken.length > 128) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const now = new Date();
    const nextRefreshToken = this.createOpaqueToken();
    const result = await this.prisma.client.$transaction(async (tx) => {
      const stored = await tx.refreshToken.findUnique({
        where: { tokenHash: this.hashToken(rawToken) },
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
        return { kind: 'invalid' as const };
      }

      if (stored.usedAt) {
        await tx.authSession.updateMany({
          where: { id: stored.sessionId, revokedAt: null },
          data: { revokedAt: now },
        });
        return { kind: 'invalid' as const };
      }

      const session = stored.session;
      const user = session.user;
      const userIsActive =
        user.isActive &&
        user.archivedAt === null &&
        user.tenant.status === 'ACTIVE' &&
        user.tenant.archivedAt === null;

      if (
        stored.expiresAt <= now ||
        session.expiresAt <= now ||
        session.revokedAt !== null ||
        !userIsActive
      ) {
        if (!userIsActive) {
          await tx.authSession.updateMany({
            where: { id: session.id, revokedAt: null },
            data: { revokedAt: now },
          });
        }
        return { kind: 'invalid' as const };
      }

      const consumed = await tx.refreshToken.updateMany({
        where: { id: stored.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (consumed.count !== 1) {
        await tx.authSession.updateMany({
          where: { id: session.id, revokedAt: null },
          data: { revokedAt: now },
        });
        return { kind: 'invalid' as const };
      }

      await tx.refreshToken.create({
        data: {
          sessionId: session.id,
          tokenHash: this.hashToken(nextRefreshToken),
          expiresAt: session.expiresAt,
        },
      });
      await tx.authSession.update({
        where: { id: session.id },
        data: { lastUsedAt: now },
      });

      return {
        kind: 'ok' as const,
        sessionId: session.id,
        user: {
          id: user.id,
          tenantId: user.tenantId,
          role: user.role as AuthRole,
          name: user.name,
        },
      };
    });

    if (result.kind !== 'ok') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.createTokenPair(result.user, result.sessionId, nextRefreshToken);
  }

  async logout(rawToken?: string): Promise<void> {
    if (!rawToken || rawToken.length > 128) {
      return;
    }
    const stored = await this.prisma.client.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
      select: { sessionId: true },
    });
    if (stored) {
      await this.prisma.client.authSession.updateMany({
        where: { id: stored.sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }

  async isAccessSessionActive(user: AuthenticatedUser): Promise<boolean> {
    const session = await this.prisma.client.authSession.findFirst({
      where: {
        id: user.sid,
        tenantId: user.tenantId,
        userId: user.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
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
    });

    return Boolean(
      session &&
        session.user.isActive &&
        session.user.archivedAt === null &&
        session.user.role === user.role &&
        session.user.tenant.status === 'ACTIVE' &&
        session.user.tenant.archivedAt === null,
    );
  }

  async requestPasswordReset(input: PasswordResetRequestInput): Promise<{ message: string }> {
    const tenant = await this.prisma.client.tenant.findFirst({
      where: { slug: input.tenantSlug, status: 'ACTIVE', archivedAt: null },
      select: { id: true },
    });
    const user = tenant
      ? await this.prisma.client.user.findFirst({
          where: {
            tenantId: tenant.id,
            email: input.email,
            isActive: true,
            archivedAt: null,
          },
          select: { id: true, tenantId: true, email: true },
        })
      : null;

    await this.comparePassword('recovery-request-probe', await this.getDummyPasswordHash());

    if (user) {
      const rawToken = this.createOpaqueToken();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TTL_MS);
      const recoveryUrl = new URL(
        '/reset-password',
        this.config.get<string>('AUTH_URL', 'http://localhost:3000'),
      );
      recoveryUrl.hash = new URLSearchParams({ token: rawToken }).toString();
      const encryptedPayload = this.recoveryCrypto.encryptRecoveryUrl(recoveryUrl.toString());

      const notificationId = await this.prisma.client.$transaction(async (tx) => {
        await tx.passwordResetToken.updateMany({
          where: {
            tenantId: user.tenantId,
            userId: user.id,
            usedAt: null,
            revokedAt: null,
          },
          data: { revokedAt: now },
        });
        await tx.passwordResetToken.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            tokenHash: this.hashToken(rawToken),
            expiresAt,
          },
        });
        const notification = await tx.notification.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            channel: 'EMAIL',
            template: 'password-reset',
            payload: encryptedPayload as Prisma.InputJsonValue,
          },
          select: { id: true },
        });
        return notification.id;
      });

      void this.deliverRecoveryEmail(notificationId, user.email, recoveryUrl.toString());
    }

    return { message: GENERIC_RECOVERY_MESSAGE };
  }

  async resetPassword(input: PasswordResetInput): Promise<void> {
    const now = new Date();
    const token = await this.prisma.client.passwordResetToken.findUnique({
      where: { tokenHash: this.hashToken(input.token) },
      select: { id: true, tenantId: true, userId: true, expiresAt: true, usedAt: true, revokedAt: true },
    });
    if (!token || token.usedAt || token.revokedAt || token.expiresAt <= now) {
      throw new BadRequestException('Invalid or expired recovery token');
    }

    const passwordHash = await hash(input.newPassword, BCRYPT_COST);
    const changed = await this.prisma.client.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.updateMany({
        where: {
          id: token.id,
          usedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
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
        data: { passwordHash },
      });
      if (updatedUser.count !== 1) {
        throw new BadRequestException('Invalid or expired recovery token');
      }

      await tx.authSession.updateMany({
        where: { tenantId: token.tenantId, userId: token.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.passwordResetToken.updateMany({
        where: {
          tenantId: token.tenantId,
          userId: token.userId,
          id: { not: token.id },
          usedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });
      return true;
    });

    if (!changed) {
      throw new BadRequestException('Invalid or expired recovery token');
    }
  }

  private async deliverRecoveryEmail(
    notificationId: string,
    email: string,
    recoveryUrl: string,
  ): Promise<void> {
    try {
      if (await this.recoveryMail.deliver(email, recoveryUrl)) {
        await this.prisma.client.notification.updateMany({
          where: { id: notificationId, status: 'PENDING' },
          data: { status: 'SENT', sentAt: new Date() },
        });
      }
    } catch {
      // Keep the encrypted outbox record pending for recovery by a later worker.
    }
  }

  private async createTokenPair(
    user: AuthTokenUser,
    sessionId: string,
    refreshToken: string,
  ): Promise<AuthTokenPair> {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      sid: sessionId,
    });
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      user,
    };
  }

  private createOpaqueToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  private async getDummyPasswordHash(): Promise<string> {
    this.dummyPasswordHash ??= hash('not-a-real-account-password', BCRYPT_COST);
    return this.dummyPasswordHash;
  }

  private async comparePassword(password: string, passwordHash: string): Promise<boolean> {
    try {
      return await compare(password, passwordHash);
    } catch {
      return false;
    }
  }
}
