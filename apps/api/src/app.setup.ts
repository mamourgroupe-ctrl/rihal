import type { INestApplication } from '@nestjs/common';

/** Global route prefix shared by the runtime server and the HTTP test harness. */
export const API_GLOBAL_PREFIX = 'api';

/**
 * Applies the configuration that must be identical in `main.ts` and in tests
 * that boot the Nest application directly (otherwise routes drift from the
 * ones the real server exposes).
 */
export function configureApiApp(app: INestApplication): void {
  app.setGlobalPrefix(API_GLOBAL_PREFIX);
}
