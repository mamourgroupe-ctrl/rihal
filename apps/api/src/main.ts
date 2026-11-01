import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { assertRuntimeRoleSafe } from './config/preflight';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const nodeEnv = config.get<string>('NODE_ENV', 'development');

  // Preflight: never start with an unsafe runtime database role in production.
  await assertRuntimeRoleSafe(config);

  const rawOrigins = config.get<string>('CORS_ORIGINS');
  let origins: string[];
  if (rawOrigins) {
    origins = rawOrigins
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    if (
      origins.length === 0 ||
      origins.some((origin) => origin === '*' || (nodeEnv === 'production' && !origin.startsWith('https://')))
    ) {
      throw new Error('CORS_ORIGINS must be a comma-separated HTTPS allowlist without wildcards in production.');
    }
  } else if (nodeEnv !== 'production') {
    origins = ['http://localhost:3000'];
  } else {
    throw new Error('CORS_ORIGINS is required in production.');
  }

  app.enableCors({
    origin: origins,
    credentials: true,
  });

  const trustProxyHops = config.get<number>('TRUST_PROXY_HOPS', 0);
  if (trustProxyHops > 0) {
    app.getHttpAdapter().getInstance().set('trust proxy', trustProxyHops);
  }

  app.enableShutdownHooks();

  app.setGlobalPrefix('api');

  const port = config.get<number>('PORT', 4000);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Rihal API')
    .setDescription('Multi-tenant SaaS platform for Hajj and Umrah agency operations')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);

  console.log(`🚀 Rihal API is running on: http://localhost:${port}/api`);
  console.log(`📄 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();