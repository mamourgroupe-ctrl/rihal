import { Global, Module } from '@nestjs/common';
import { DataService } from './data.service';
import { MemoryStore } from './memory.store';
import { PrismaProvider } from './prisma.provider';

@Global()
@Module({
  providers: [MemoryStore, PrismaProvider, DataService],
  exports: [DataService],
})
export class DomainModule {}
