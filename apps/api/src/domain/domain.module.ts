import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { DocumentsService } from './documents.service';
import { GroupsService } from './groups.service';
import { InvoicesService } from './invoices.service';
import { PilgrimsService } from './pilgrims.service';

@Module({
  imports: [DatabaseModule],
  providers: [PilgrimsService, GroupsService, DocumentsService, InvoicesService],
  exports: [PilgrimsService, GroupsService, DocumentsService, InvoicesService],
})
export class DomainModule {}
