import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaClientConstructor } = vi.hoisted(() => ({
  prismaClientConstructor: vi.fn(),
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: class PrismaClientMock {
    constructor(options: unknown) {
      prismaClientConstructor(options);
    }
  },
}));

type PrismaGlobal = typeof globalThis & { prisma?: unknown };
const prismaGlobal = globalThis as PrismaGlobal;

describe('database client', () => {
  beforeEach(() => {
    vi.resetModules();
    prismaGlobal.prisma = undefined;
    prismaClientConstructor.mockClear();
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    prismaGlobal.prisma = undefined;
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('configures development query logging and reuses the global client', async () => {
    const firstImport = await import('../src/index');

    expect(prismaClientConstructor).toHaveBeenCalledOnce();
    expect(prismaClientConstructor).toHaveBeenCalledWith({
      log: ['query', 'error', 'warn'],
    });

    vi.resetModules();
    const secondImport = await import('../src/index');

    expect(secondImport.prisma).toBe(firstImport.prisma);
    expect(prismaClientConstructor).toHaveBeenCalledOnce();
  });
});
