import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AgenciesService } from './agencies.service';

@Module({
  imports: [DatabaseModule],
  providers: [AgenciesService],
  exports: [AgenciesService],
})
export class AgenciesModule {}
