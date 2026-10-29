import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TenantContext {
  private readonly storage = new AsyncLocalStorage<string | undefined>();

  getTenantId(): string | undefined {
    return this.storage.getStore();
  }

  run<T>(tenantId: string | undefined, callback: () => T): T {
    return this.storage.run(tenantId, callback);
  }
}
