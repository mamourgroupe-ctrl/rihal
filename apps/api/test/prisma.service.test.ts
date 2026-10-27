import { describe, expect, it, vi } from 'vitest';

const { sharedPrisma } = vi.hoisted(() => ({
  sharedPrisma: {
    $disconnect: vi.fn(),
  },
}));

vi.mock('@rihal/database', () => ({ prisma: sharedPrisma }));

import { prisma } from '@rihal/database';
import { PrismaService } from '../src/database/prisma.service';

describe('PrismaService', () => {
  it('uses the shared database package client and disconnects on shutdown', async () => {
    const service = new PrismaService();

    expect(service.client).toBe(prisma);

    await service.onModuleDestroy();

    expect(sharedPrisma.$disconnect).toHaveBeenCalledOnce();
  });
});
