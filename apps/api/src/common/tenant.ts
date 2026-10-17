import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

export const DEMO_TENANT_ID = 'tenant_demo';
export const TENANT_HEADER = 'x-tenant-id';

const TENANT_ID_PATTERN = /^[a-zA-Z0-9_-]{3,64}$/;

/**
 * Resolves the active tenant for every request.
 *
 * For now the tenant is read from the `x-tenant-id` header (defaulting to the
 * demo tenant) — a stand-in until Auth.js sessions land. All downstream
 * queries are scoped by the resolved id, and the Prisma path is additionally
 * protected by PostgreSQL RLS using `app.current_tenant`.
 */
export interface TenantRequest {
  tenantId?: string;
  headers: Record<string, string | string[] | undefined>;
}

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const raw = request.headers?.[TENANT_HEADER];
    const header = Array.isArray(raw) ? raw[0] : raw;
    const tenantId = (header ?? DEMO_TENANT_ID).trim();

    if (!TENANT_ID_PATTERN.test(tenantId)) {
      throw new UnauthorizedException(
        'معرّف الوكالة غير صالح (3-64 حرفاً: أحرف، أرقام، - أو _)',
      );
    }

    request.tenantId = tenantId;
    return true;
  }
}

export const Tenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    return request.tenantId ?? DEMO_TENANT_ID;
  },
);
