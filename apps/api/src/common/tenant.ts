import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/auth.decorators';

/**
 * Injects the tenant of the authenticated user.
 *
 * The identity is resolved from the signed JWT by the global JwtAuthGuard, so
 * a client can never select another agency by sending a header.
 */
export const Tenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user!.tenantId;
  },
);
