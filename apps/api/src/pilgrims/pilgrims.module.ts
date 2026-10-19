import { Module } from '@nestjs/common';
import { PilgrimsService } from './pilgrims.service';
import { PilgrimsController } from './pilgrims.controller';

@Module({
  controllers: [PilgrimsController],
  providers: [PilgrimsService],
  exports: [PilgrimsService],
})
export class PilgrimsModule {}
