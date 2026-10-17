import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/auth.decorators';
import { AppService } from './app.service';
import { DataService } from './domain/data.service';

@Public()
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly data: DataService,
  ) {}

  @Get()
  getRoot() {
    return {
      name: 'Rihal API',
      version: '0.2.0',
      status: 'running',
      message: 'مرحباً بك في API رحال',
      docs: '/api/health',
    };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      persistence: {
        backend: this.data.backend,
        fallbackReason: this.data.fallbackReason,
      },
    };
  }
}
