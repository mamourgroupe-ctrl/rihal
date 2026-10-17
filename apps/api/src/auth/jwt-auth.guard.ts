import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { DataService } from '../domain/data.service';
import { AuthenticatedRequest, IS_PUBLIC_KEY } from './auth.decorators';

interface JwtPayload {
  sub: string;
  tenantId: string;
  role: string;
  email: string;
  name: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly data: DataService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers?.authorization;
    const raw = Array.isArray(header) ? header[0] : header;

    if (!raw || !raw.startsWith('Bearer ')) {
      throw new UnauthorizedException('مطلوب تسجيل الدخول');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(raw.slice(7).trim());
    } catch {
      throw new UnauthorizedException('الجلسة غير صالحة أو منتهية');
    }

    // Re-resolve the identity so deactivated users / suspended tenants lose
    // access immediately even while their token is still valid.
    const identity = await this.data.findIdentity(payload.sub);
    if (!identity || identity.tenantId !== payload.tenantId) {
      throw new UnauthorizedException('الحساب غير نشط');
    }

    request.user = identity;
    return true;
  }
}
