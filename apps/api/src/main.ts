import { Logger } from '@nestjs/common';
import { bootstrap } from './app.factory';

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start the Rihal API', error);
  process.exit(1);
});
