import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from '../database/database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RecoveryCryptoService } from './recovery-crypto.service';
import { RecoveryMailService } from './recovery-mail.service';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('AUTH_SECRET'),
        signOptions: {
          algorithm: 'HS256' as const,
          issuer: 'rihal-api',
          audience: 'rihal-client',
          expiresIn: 15 * 60,
        },
      }),
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    RecoveryCryptoService,
    RecoveryMailService,
    JwtAuthGuard,
    RolesGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService, RecoveryCryptoService],
})
export class AuthModule {}
