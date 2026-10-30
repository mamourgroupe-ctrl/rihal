import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'node:path';
import { z } from 'zod';
import { AuthModule } from './auth/auth.module';
import { AgenciesModule } from './agencies/agencies.module';
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
  AUTH_SECRET: z
    .string()
    .min(32)
    .refine(
      (secret) => !secret.toLowerCase().includes('change-me-in-production'),
      'Replace the example secret with a private value',
    ),
  AUTH_URL: z.string().url().optional(),
  SMTP_URL: z
    .string()
    .url()
    .refine((url) => url.startsWith('smtp://') || url.startsWith('smtps://'))
    .optional(),
  SMTP_FROM: z.string().min(3).optional(),
}).superRefine((config, context) => {
  if (config.NODE_ENV === 'production' && !config.AUTH_URL) {
    context.addIssue({ code: 'custom', path: ['AUTH_URL'], message: 'Required in production' });
  }
  if (config.NODE_ENV === 'production' && config.AUTH_URL && !config.AUTH_URL.startsWith('https://')) {
    context.addIssue({ code: 'custom', path: ['AUTH_URL'], message: 'Must use HTTPS in production' });
  }
  if (config.NODE_ENV === 'production' && !config.SMTP_URL) {
    context.addIssue({ code: 'custom', path: ['SMTP_URL'], message: 'Required in production for account recovery' });
  }
  if (config.NODE_ENV === 'production' && !config.SMTP_FROM) {
    context.addIssue({ code: 'custom', path: ['SMTP_FROM'], message: 'Required in production for account recovery' });
  }
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, '../../../.env'),
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
    AgenciesModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
