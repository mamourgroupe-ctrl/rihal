import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentTenantId, CurrentUser, Public } from './auth.decorators';
import {
  loginSchema,
  parseAuthBody,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from './auth.validation';
import type { AuthenticatedUser, AuthTokenResponse } from './auth.types';

const REFRESH_COOKIE_NAME = 'rihal_refresh';
const REFRESH_COOKIE_PATH = '/api/auth';
const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthTokenResponse> {
    const input = parseAuthBody(loginSchema, body);
    const { refreshToken, ...publicTokens } = await this.auth.login(input);
    this.setRefreshCookie(response, refreshToken);
    return publicTokens;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthTokenResponse> {
    const token = this.readRefreshCookie(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    const { refreshToken, ...publicTokens } = await this.auth.rotateRefreshToken(token);
    this.setRefreshCookie(response, refreshToken);
    return publicTokens;
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(this.readRefreshCookie(request));
    this.clearRefreshCookie(response);
    return { status: 'ok' };
  }

  @Public()
  @Post('password/forgot')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  requestPasswordReset(@Body() body: unknown) {
    return this.auth.requestPasswordReset(parseAuthBody(requestPasswordResetSchema, body));
  }

  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async resetPassword(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.resetPassword(parseAuthBody(resetPasswordSchema, body));
    this.clearRefreshCookie(response);
    return { message: 'Password updated successfully.' };
  }

  @Get('me')
  @Header('Cache-Control', 'no-store')
  getCurrentUser(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenantId() tenantId: string,
  ) {
    return { id: user.sub, tenantId, role: user.role };
  }

  private setRefreshCookie(response: Response, token: string): void {
    response.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    });
  }

  private clearRefreshCookie(response: Response): void {
    response.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
    });
  }

  private readRefreshCookie(request: Request): string | undefined {
    const rawCookies = request.headers.cookie;
    if (!rawCookies) {
      return undefined;
    }

    for (const part of rawCookies.split(';')) {
      const separator = part.indexOf('=');
      if (separator < 0 || part.slice(0, separator).trim() !== REFRESH_COOKIE_NAME) {
        continue;
      }
      const encodedToken = part.slice(separator + 1).trim();
      try {
        return decodeURIComponent(encodedToken);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
}
