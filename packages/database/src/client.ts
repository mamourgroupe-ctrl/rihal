import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

export type PrismaLogLevel = 'query' | 'info' | 'warn' | 'error';

export interface CreatePrismaClientOptions {
  /** Connection string to use. Defaults to `DATABASE_URL`. */
  url?: string;
  log?: PrismaLogLevel[];
  /** Pool size forwarded to the `pg` pool created by the driver adapter. */
  connectionLimit?: number;
}

/**
 * Builds a Prisma Client that runs without a native query engine binary.
 *
 * The client is generated with `engineType = "client"`, so queries are planned
 * by the WASM query compiler shipped inside `@prisma/client` and executed by
 * the `pg` driver adapter. This keeps local development, CI and serverless
 * deployments free of platform-specific engine downloads.
 */
export function createPrismaClient(options: CreatePrismaClientOptions = {}): PrismaClient {
  const connectionString = options.url ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('A PostgreSQL connection string is required to create the Prisma Client.');
  }

  const adapter = new PrismaPg({
    connectionString,
    ...(options.connectionLimit ? { max: options.connectionLimit } : {}),
  });

  return new PrismaClient({
    adapter,
    ...(options.log ? { log: options.log } : {}),
  });
}
