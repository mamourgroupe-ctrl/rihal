import { createParamDecorator, ExecutionContext, SetMetadata, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedRequest, AuthenticatedUser, AuthRole } from './auth.types';

export const IS_PUBLIC_KEY = 'auth:is-public';
export const REQUIRED_ROLES_KEY = 'auth:required-roles';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const Roles = (...roles: AuthRole[]) => SetMetadata(REQUIRED_ROLES_KEY, roles);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().auth;
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  },
);

export const CurrentTenantId = createParamDecorator((_data: unknown, context: ExecutionContext): string => {
  const tenantId = context.switchToHttp().getRequest<AuthenticatedRequest>().auth?.tenantId;
  if (!tenantId) {
    throw new UnauthorizedException();
  }
  return tenantId;
});
