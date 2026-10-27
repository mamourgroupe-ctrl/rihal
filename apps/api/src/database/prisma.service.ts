import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { prisma, type PrismaClient } from '@rihal/database';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly client: PrismaClient = prisma;

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
