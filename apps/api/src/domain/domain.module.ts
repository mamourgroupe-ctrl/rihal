import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DatabaseModule } from '../database/database.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DomainExceptionFilter } from './domain-exception.filter';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { NotificationsController } from './notifications.controller';
import { PilgrimsController } from './pilgrims.controller';
import { PilgrimsService } from './pilgrims.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [DatabaseModule],
  controllers: [
    PilgrimsController,
    GroupsController,
    DocumentsController,
    InvoicesController,
    UsersController,
    NotificationsController,
  ],
  providers: [
    PilgrimsService,
    GroupsService,
    DocumentsService,
    InvoicesService,
    UsersService,
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
  exports: [PilgrimsService, GroupsService, DocumentsService, InvoicesService, UsersService],
})
export class DomainModule {}
