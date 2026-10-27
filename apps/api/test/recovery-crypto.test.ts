import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { RecoveryCryptoService } from '../src/auth/recovery-crypto.service';

describe('password recovery notification encryption', () => {
  it('encrypts reset links for the notification outbox and decrypts them for delivery', () => {
    const service = new RecoveryCryptoService({
      getOrThrow: () => 'test-auth-secret-with-enough-entropy-for-ci',
    } as unknown as ConfigService);
    const resetUrl = 'https://app.example.invalid/reset-password?token=synthetic-one-time-token';

    const payload = service.encryptRecoveryUrl(resetUrl);

    expect(JSON.stringify(payload)).not.toContain('synthetic-one-time-token');
    expect(service.decryptRecoveryUrl(payload)).toBe(resetUrl);
  });

  it('rejects a tampered notification payload', () => {
    const service = new RecoveryCryptoService({
      getOrThrow: () => 'test-auth-secret-with-enough-entropy-for-ci',
    } as unknown as ConfigService);
    const payload = service.encryptRecoveryUrl('https://app.example.invalid/reset-password');

    expect(() =>
      service.decryptRecoveryUrl({ ...payload, ciphertext: `${payload.ciphertext}tampered` }),
    ).toThrow();
  });
});
