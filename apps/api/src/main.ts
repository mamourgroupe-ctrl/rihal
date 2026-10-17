import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LANDING_HTML } from './landing.page';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS: explicit allow-list via CORS_ORIGINS (comma separated), otherwise
  // reflect the request origin (handy for local dev and hosted previews).
  const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  });

  app.setGlobalPrefix('api');

  // Root landing page (status dashboard). API routes stay under /api.
  const server = app.getHttpAdapter().getInstance();
  server.get('/', (_req: unknown, res: any) => {
    res.type('html').send(LANDING_HTML);
  });

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Rihal API is running on: http://0.0.0.0:${port}/api`);
}

bootstrap();