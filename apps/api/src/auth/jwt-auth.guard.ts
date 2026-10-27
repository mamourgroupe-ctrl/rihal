import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { IS_PUBLIC_KEY } from './auth.decorators';
import { AUTH_ROLES, type AuthenticatedRequest, type AuthenticatedUser } from './auth.types';

const accessTokenClaimsSchema = z.object({
  sub: z.string().min(1),
  tenantId: z.string().min(1),
  role: z.enum(AUTH_ROLES),
  sid: z.string().min(1),
  iat: z.number().int(),
  exp: z.number().int(),
});

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token, extra] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token || extra) {
      throw new UnauthorizedException();
    }

    let rawClaims: unknown;
    try {
      rawClaims = await this.jwt.verifyAsync(token, {
        algorithms: ['HS256'],
        issuer: 'rihal-api',
        audience: 'rihal-client',
      });
    } catch {
      throw new UnauthorizedException();
    }

    const parsedClaims = accessTokenClaimsSchema.safeParse(rawClaims);
    if (!parsedClaims.success) {
      throw new UnauthorizedException();
    }

    const claims: AuthenticatedUser = {
      sub: parsedClaims.data.sub,
      tenantId: parsedClaims.data.tenantId,
      role: parsedClaims.data.role,
      sid: parsedClaims.data.sid,
    };
    if (!(await this.auth.isAccessSessionActive(claims))) {
      throw new UnauthorizedException();
    }

    request.auth = claims;
    return true;
  }
}
