import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataService } from './domain/data.service';
import { LANDING_HTML } from './landing.page';

/**
 * Builds the fully configured Nest application (prefix, validation, CORS,
 * landing page). Shared by `main.ts` and the e2e tests.
 */
export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      stopAtFirstError: true,
    }),
  );

  const server = app.getHttpAdapter().getInstance();
  server.get('/', (_req: unknown, res: any) => {
    res.type('html').send(LANDING_HTML);
  });

  app.enableShutdownHooks();
  return app;
}

export async function bootstrap(): Promise<void> {
  const app = await createApp();
  const port = Number(process.env.PORT) || 4000;
  await app.listen(port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`Rihal API is running on: http://0.0.0.0:${port}/api`);
  logger.log(`Persistence backend: ${app.get(DataService).backend}`);
}
