import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { TenantContextInterceptor } from '../src/database/tenant-context.interceptor';
import { TenantContext } from '../src/database/tenant-context';

describe('TenantContextInterceptor', () => {
  it('takes tenant context from verified auth claims, never from the request body', async () => {
    const tenantContext = new TenantContext();
    const interceptor = new TenantContextInterceptor(tenantContext);
    let observedTenantId: string | undefined;
    const executionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          auth: { tenantId: 'verified-tenant' },
          body: { tenantId: 'client-supplied-tenant' },
        }),
      }),
    } as unknown as ExecutionContext;
    const handler = {
      handle: () => new Observable<string>((subscriber) => {
        observedTenantId = tenantContext.getTenantId();
        subscriber.next('handled');
        subscriber.complete();
      }),
    } as CallHandler<string>;

    await expect(
      new Promise<string>((resolve, reject) => {
        interceptor.intercept(executionContext, handler).subscribe({
          next: resolve,
          error: reject,
        });
      }),
    ).resolves.toBe('handled');
    expect(observedTenantId).toBe('verified-tenant');
  });

  it('leaves public requests without an authenticated tenant context', async () => {
    const tenantContext = new TenantContext();
    const interceptor = new TenantContextInterceptor(tenantContext);
    let observedTenantId: string | undefined = 'stale-value';
    const executionContext = {
      switchToHttp: () => ({ getRequest: () => ({ body: { tenantId: 'client-tenant' } }) }),
    } as unknown as ExecutionContext;
    const handler = {
      handle: () => new Observable<string>((subscriber) => {
        observedTenantId = tenantContext.getTenantId();
        subscriber.next('public');
        subscriber.complete();
      }),
    } as CallHandler<string>;

    await new Promise<string>((resolve, reject) => {
      interceptor.intercept(executionContext, handler).subscribe({ next: resolve, error: reject });
    });
    expect(observedTenantId).toBeUndefined();
  });
});
