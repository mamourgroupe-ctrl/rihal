import {
  Inject, Injectable, RequestTimeoutException, UnauthorizedException,
  type CallHandler, type ExecutionContext, type NestInterceptor,
} from '@nestjs/common';
import {
  lastValueFrom, mergeMap, Observable, takeUntil, throwError, timer,
} from 'rxjs';
import { assertTenantId } from '@rihal-v2/database';
import { DatabaseService } from '../../database/database.service';

interface AuthenticatedRequest {
  // Must be populated by a verified authentication/authorization guard.
  user?: { tenantId?: unknown } | null;
}

const HANDLER_TIMEOUT_MS = 10_000; // Below the interactive transaction's 15s cap.

class TenantRequestAbortedError extends Error {
  constructor() {
    super('Tenant request subscription was cancelled.');
    this.name = 'TenantRequestAbortedError';
  }
}

function cancellation(signal: AbortSignal): Observable<never> {
  return new Observable((subscriber) => {
    const abort = () => subscriber.error(new TenantRequestAbortedError());
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    return () => signal.removeEventListener('abort', abort);
  });
}

/**
 * Opt-in, finite HTTP handlers only. Authentication guards run before interceptors.
 * Downstream services MUST use DatabaseService.client to share this transaction.
 * Public/auth/platform-admin endpoints must not use this tenant interceptor.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      throw new Error('TenantInterceptor only supports finite HTTP handlers.');
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const tenantId = request.user?.tenantId;
    try {
      assertTenantId(tenantId);
    } catch {
      throw new UnauthorizedException('An authenticated tenant is required.');
    }

    // Start only on subscription. Buffer the response until COMMIT succeeds;
    // otherwise an error/failed commit could reach the client after success.
    return new Observable((subscriber) => {
      const controller = new AbortController();
      const transaction = this.database.runInTenantTransaction(tenantId, async () => {
        if (controller.signal.aborted) throw new TenantRequestAbortedError();
        // DatabaseService executes SET LOCAL app.current_tenant_id on the exact
        // Prisma transaction connection before this callback. It is NOT SET at
        // session scope, so pooled connections cannot retain another tenant.
        const deadline = timer(HANDLER_TIMEOUT_MS).pipe(
          mergeMap(() => throwError(() => new RequestTimeoutException('Tenant handler exceeded its transaction deadline.'))),
        );
        return lastValueFrom(next.handle().pipe(
          takeUntil(cancellation(controller.signal)),
          takeUntil(deadline),
        ), { defaultValue: undefined });
      });

      void transaction.then(
        (value) => {
          if (!subscriber.closed) {
            subscriber.next(value);
            subscriber.complete();
          }
        },
        (error: unknown) => {
          if (!subscriber.closed) subscriber.error(error);
        },
      );
      // Observable cancellation causes callback rejection and transaction rollback.
      return () => controller.abort();
    });
  }
}
