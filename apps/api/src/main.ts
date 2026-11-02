import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { configureApiApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableShutdownHooks();

  const config = app.get(ConfigService);

  // Comma-separated list of browser origins allowed to call the API.
  // Defaults keep the local Next.js frontend and the API origin working.
  const configuredOrigins = config
    .get<string>('APP_ORIGINS', '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins = configuredOrigins.length > 0
    ? configuredOrigins
    : ['http://localhost:3000', `http://localhost:${config.get<number>('PORT', 4000)}`];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // The live preview opens at `/`, so the operations dashboard is the index.
  // The health/status page stays available at `/status.html`.
  app.useStaticAssets(join(__dirname, '..', 'public'), { index: 'dashboard.html' });

  configureApiApp(app);

  const port = config.get<number>('PORT', 4000);
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Rihal API is running on: http://localhost:${port}/api`);
}

bootstrap();
