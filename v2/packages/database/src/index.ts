import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client';

export * from '../generated/client';
export { assertTenantId, setLocalTenantId } from './tenant-context';

/** Explicit connections only; there is no default/global unscoped client. */
export function createPrismaClient(connectionString: string): PrismaClient {
  if (!connectionString) {
    throw new TypeError('A database connection string is required.');
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}
