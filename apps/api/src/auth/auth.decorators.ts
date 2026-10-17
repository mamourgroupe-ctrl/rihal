import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { AuthenticatedUser, Role } from '../domain/types';

export const IS_PUBLIC_KEY = 'rihal:isPublic';
export const ROLES_KEY = 'rihal:roles';

/** Marks a route as reachable without a bearer token. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Restricts a route to the given roles (global RolesGuard enforces it). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthenticatedUser;
}

/** Injects the authenticated user resolved by the global JwtAuthGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user as AuthenticatedUser;
  },
);
