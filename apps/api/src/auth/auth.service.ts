import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
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
    const user = await this.prisma.findLoginAccount(input.tenantSlug, input.email);

    const hashToCheck = user?.passwordHash ?? (await this.getDummyPasswordHash());
    const passwordMatches = await this.comparePassword(input.password, hashToCheck);
    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const now = new Date();
    const sessionExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);
    const refreshToken = this.createOpaqueToken();
    const session = await this.prisma.createLoginSession({
      userId: user.id,
      tenantId: user.tenantId,
      passwordHash: user.passwordHash,
      expiresAt: sessionExpiresAt,
      refreshTokenHash: this.hashToken(refreshToken),
      now,
    });
    if (!session) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.createTokenPair(
      { ...session.user, role: session.user.role as AuthRole },
      session.sessionId,
      refreshToken,
    );
  }

  async rotateRefreshToken(rawToken: string): Promise<AuthTokenPair> {
    if (!rawToken || rawToken.length > 128) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const now = new Date();
    const nextRefreshToken = this.createOpaqueToken();
    const tokenHash = this.hashToken(rawToken);
    const result = await this.prisma.rotateRefreshToken({
      tokenHash,
      nextTokenHash: this.hashToken(nextRefreshToken),
      now,
    });

    if (!result) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.createTokenPair(
      { ...result.user, role: result.user.role as AuthRole },
      result.sessionId,
      nextRefreshToken,
    );
  }

  async logout(rawToken?: string): Promise<void> {
    if (!rawToken || rawToken.length > 128) {
      return;
    }
    await this.prisma.revokeSessionForRefreshToken(this.hashToken(rawToken), new Date());
  }

  async isAccessSessionActive(user: AuthenticatedUser): Promise<boolean> {
    return this.prisma.isAccessSessionActive({
      tenantId: user.tenantId,
      userId: user.sub,
      sessionId: user.sid,
      role: user.role,
      now: new Date(),
    });
  }

  async requestPasswordReset(input: PasswordResetRequestInput): Promise<{ message: string }> {
    const rawToken = this.createOpaqueToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TTL_MS);
    const recoveryUrl = new URL(
      '/reset-password',
      this.config.get<string>('AUTH_URL', 'http://localhost:3000'),
    );
    recoveryUrl.hash = new URLSearchParams({ token: rawToken }).toString();
    const recovery = await this.prisma.preparePasswordRecovery({
      tenantSlug: input.tenantSlug,
      email: input.email,
      tokenHash: this.hashToken(rawToken),
      expiresAt,
      payload: this.recoveryCrypto.encryptRecoveryUrl(recoveryUrl.toString()),
      now,
    });

    await this.comparePassword('recovery-request-probe', await this.getDummyPasswordHash());

    if (recovery) {
      void this.deliverRecoveryEmail(
        recovery.notificationId,
        recovery.email,
        this.hashToken(rawToken),
        recoveryUrl.toString(),
      );
    }

    return { message: GENERIC_RECOVERY_MESSAGE };
  }

  async resetPassword(input: PasswordResetInput): Promise<void> {
    const now = new Date();
    const tokenHash = this.hashToken(input.token);
    const passwordHash = await hash(input.newPassword, BCRYPT_COST);
    const changed = await this.prisma.completePasswordReset({
      tokenHash,
      passwordHash,
      now,
    });

    if (!changed) {
      throw new BadRequestException('Invalid or expired recovery token');
    }
  }

  private async deliverRecoveryEmail(
    notificationId: string,
    email: string,
    tokenHash: string,
    recoveryUrl: string,
  ): Promise<void> {
    try {
      if (await this.recoveryMail.deliver(email, recoveryUrl)) {
        await this.prisma.markRecoveryNotificationSent(tokenHash, notificationId, new Date());
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
