import { Module } from '@nestjs/common';
import { PilgrimsController } from './pilgrims.controller';
import { PilgrimsService } from './pilgrims.service';

@Module({
  controllers: [PilgrimsController],
  providers: [PilgrimsService],
  exports: [PilgrimsService],
})
export class PilgrimsModule {}
