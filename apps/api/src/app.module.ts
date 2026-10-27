import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'node:path';
import { z } from 'zod';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { DomainModule } from './domain/domain.module';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().url().optional(),
  DIRECT_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  AUTH_URL: z.string().url().optional(),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, '../../.env'),
      validate: (config) => {
        const result = envSchema.safeParse(config);
        if (!result.success) {
          const issues = result.error.issues
            .map(({ path, message }) => `${path.join('.')}: ${message}`)
            .join('; ');
          throw new Error(`Invalid environment configuration: ${issues}`);
        }
        return result.data;
      },
    }),
    DatabaseModule,
    DomainModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
