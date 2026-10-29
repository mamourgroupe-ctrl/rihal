import {
  Injectable,
  type ExecutionContext,
  type NestInterceptor,
  type CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContext } from './tenant-context';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly tenantContext: TenantContext) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      auth?: { tenantId?: unknown };
    }>();
    const claimTenantId = request.auth?.tenantId;
    const tenantId = typeof claimTenantId === 'string' ? claimTenantId : undefined;

    // Subscribe to the handler inside AsyncLocalStorage so asynchronous work
    // created by the request inherits only the already-verified JWT tenant.
    return new Observable((subscriber) => {
      const subscription = this.tenantContext.run(
        tenantId,
        () => next.handle().subscribe(subscriber),
      );
      return () => subscription.unsubscribe();
    });
  }
}
