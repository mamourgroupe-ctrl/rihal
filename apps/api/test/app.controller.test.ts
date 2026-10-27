import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import { AppController } from '../src/app.controller';

describe('AppController', () => {
  const configService = {
    get: vi.fn(() => 'test'),
  } as unknown as ConfigService;
  const controller = new AppController(configService);

  it('returns the Rihal API identity', () => {
    expect(controller.getRoot()).toEqual({
      name: 'Rihal API',
      version: '0.0.1',
      status: 'running',
      message: 'مرحباً بك في API رحال',
    });
  });

  it('reports health and the configured environment', () => {
    const health = controller.getHealth();

    expect(health.status).toBe('ok');
    expect(health.environment).toBe('test');
    expect(Number.isNaN(Date.parse(health.timestamp))).toBe(false);
    expect(health.uptime).toBeGreaterThanOrEqual(0);
    expect(configService.get).toHaveBeenCalledWith('NODE_ENV', 'development');
  });
});
