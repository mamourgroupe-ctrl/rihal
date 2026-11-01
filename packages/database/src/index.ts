import type { PrismaClient } from '@prisma/client';
import { createPrismaClient } from './client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Creates the shared client on first use.
 *
 * The client is built lazily because the connection string comes from the
 * process environment, which frameworks (NestJS `ConfigModule`, Prisma CLI,
 * test runners) load after the module graph is imported.
 */
function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient({
      // Query logs include bound parameters (such as passport numbers); never emit them.
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }

  return globalForPrisma.prisma;
}

/** Lazily initialised shared Prisma Client. */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property, client) as unknown;
    return typeof value === 'function' ? value.bind(client) : value;
  },
  has(_target, property) {
    return property in getPrismaClient();
  },
  set(_target, property, value) {
    return Reflect.set(getPrismaClient(), property, value);
  },
});

export * from './client';
export * from '@prisma/client';
