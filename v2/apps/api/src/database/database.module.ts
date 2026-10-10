import { Module } from '@nestjs/common';
import { TenantInterceptor } from '../common/interceptors/tenant.interceptor';
import { DATABASE_URL, DatabaseService } from './database.service';

@Module({
  providers: [
    {
      provide: DATABASE_URL,
      useFactory: () => {
        const url = process.env.DATABASE_URL;
        if (!url) throw new Error('DATABASE_URL must be configured for the v2 API.');
        return url;
      },
    },
    DatabaseService,
    TenantInterceptor,
  ],
  exports: [DatabaseService, TenantInterceptor],
})
export class TenantDatabaseModule {}
