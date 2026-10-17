import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DocumentsModule } from './documents/documents.module';
import { DomainModule } from './domain/domain.module';
import { GroupsModule } from './groups/groups.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PilgrimsModule } from './pilgrims/pilgrims.module';
import { TenantModule } from './tenant/tenant.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    DomainModule,
    AuthModule,
    PilgrimsModule,
    GroupsModule,
    DocumentsModule,
    InvoicesModule,
    TenantModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
