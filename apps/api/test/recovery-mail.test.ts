import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock('nodemailer', () => ({ createTransport: mocks.createTransport }));

import { RecoveryMailService } from '../src/auth/recovery-mail.service';

function config(values: Record<string, string | undefined>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

describe('password recovery email delivery', () => {
  beforeEach(() => {
    mocks.createTransport.mockReset();
    mocks.sendMail.mockReset();
    mocks.sendMail.mockResolvedValue({ messageId: 'synthetic-message-id' });
    mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail });
  });

  it('sends the one-time link through the configured SMTP transport', async () => {
    const service = new RecoveryMailService(
      config({
        SMTP_URL: 'smtp://synthetic-user:synthetic-password@mail.example.invalid:587',
        SMTP_FROM: 'noreply@example.invalid',
      }),
    );
    const resetUrl = 'https://app.example.invalid/reset-password?token=synthetic-token';

    await expect(service.deliver('user@example.invalid', resetUrl)).resolves.toBe(true);

    expect(mocks.createTransport).toHaveBeenCalledWith({
      host: 'mail.example.invalid',
      port: 587,
      secure: false,
      requireTLS: false,
      auth: { user: 'synthetic-user', pass: 'synthetic-password' },
    });
    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'noreply@example.invalid',
        to: 'user@example.invalid',
        text: expect.stringContaining(resetUrl),
      }),
    );
  });

  it('requires TLS for SMTP in production', async () => {
    const service = new RecoveryMailService(
      config({
        NODE_ENV: 'production',
        SMTP_URL: 'smtp://synthetic-user:synthetic-password@mail.example.invalid:587',
        SMTP_FROM: 'noreply@example.invalid',
      }),
    );

    await expect(
      service.deliver('user@example.invalid', 'https://app.example.invalid/reset-password'),
    ).resolves.toBe(true);
    expect(mocks.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ secure: false, requireTLS: true }),
    );
  });

  it('leaves recovery delivery pending when SMTP is not configured', async () => {
    const service = new RecoveryMailService(config({}));

    await expect(
      service.deliver('user@example.invalid', 'https://app.example.invalid/reset-password'),
    ).resolves.toBe(false);
    expect(mocks.createTransport).not.toHaveBeenCalled();
  });
});
