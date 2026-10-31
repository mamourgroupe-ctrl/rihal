import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from './auth/auth.decorators';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly config: ConfigService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'API root information' })
  @ApiResponse({ status: 200, description: 'API metadata' })
  getRoot() {
    return {
      name: 'Rihal API',
      version: '0.0.1',
      status: 'running',
      message: 'مرحباً بك في API رحال',
    };
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: this.config.get<string>('NODE_ENV', 'development'),
    };
  }
}