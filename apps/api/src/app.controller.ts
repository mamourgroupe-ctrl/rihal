import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller()
export class AppController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  getRoot() {
    return {
      name: 'Rihal API',
      version: '0.0.1',
      status: 'running',
      message: 'مرحباً بك في API رحال',
    };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: this.config.get<string>('NODE_ENV', 'development'),
    };
  }
}