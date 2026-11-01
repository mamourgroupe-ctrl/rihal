import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaClientConstructor, adapterConstructor } = vi.hoisted(() => ({
  prismaClientConstructor: vi.fn(),
  adapterConstructor: vi.fn(),
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: class PrismaClientMock {
    constructor(options: unknown) {
      prismaClientConstructor(options);
    }
  },
}));

vi.mock('@prisma/adapter-pg', () => ({
  PrismaPg: class PrismaPgMock {
    readonly options: unknown;

    constructor(options: unknown) {
      this.options = options;
      adapterConstructor(options);
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
    adapterConstructor.mockClear();
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DATABASE_URL', 'postgresql://rihal_app@localhost:5432/rihal?schema=public');
  });

  afterEach(() => {
    prismaGlobal.prisma = undefined;
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('uses the pg driver adapter with development query logging', async () => {
    const { prisma } = await import('../src/index');
    // The client is created lazily on first use, after the environment is loaded.
    expect(() => prisma.$connect).not.toThrow();
    expect(adapterConstructor).toHaveBeenCalledWith({
      connectionString: 'postgresql://rihal_app@localhost:5432/rihal?schema=public',
    });
    expect(prismaClientConstructor).toHaveBeenCalledOnce();
    const [options] = prismaClientConstructor.mock.calls[0] as [{ adapter: unknown; log: string[] }];
    expect(options.adapter).toBeDefined();
    expect(options.log).toEqual(['error', 'warn']);
  });

  it('creates a single client across lazy accesses and imports', async () => {
    const firstImport = await import('../src/index');
    void firstImport.prisma.$connect;
    expect(prismaClientConstructor).toHaveBeenCalledOnce();


    vi.resetModules();
    const secondImport = await import('../src/index');
    void secondImport.prisma.$connect;

    expect(prismaClientConstructor).toHaveBeenCalledOnce();
    expect(adapterConstructor).toHaveBeenCalledOnce();
  });

  it('rejects a missing connection string', async () => {
    vi.stubEnv('DATABASE_URL', '');
    const { prisma } = await import('../src/index');

    expect(() => prisma.$connect).toThrow(/connection string/i);
  });
});
