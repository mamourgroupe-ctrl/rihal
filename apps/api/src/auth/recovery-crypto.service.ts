import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import { z } from 'zod';

const recoveryPayloadSchema = z.object({
  version: z.literal(1),
  iv: z.string().min(1),
  tag: z.string().min(1),
  ciphertext: z.string().min(1),
});

export type EncryptedRecoveryPayload = z.infer<typeof recoveryPayloadSchema>;

@Injectable()
export class RecoveryCryptoService {
  constructor(private readonly config: ConfigService) {}

  encryptRecoveryUrl(url: string): EncryptedRecoveryPayload {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    cipher.setAAD(Buffer.from('rihal-password-reset-notification-v1', 'utf8'));
    const ciphertext = Buffer.concat([cipher.update(url, 'utf8'), cipher.final()]);

    return {
      version: 1,
      iv: iv.toString('base64url'),
      tag: cipher.getAuthTag().toString('base64url'),
      ciphertext: ciphertext.toString('base64url'),
    };
  }

  decryptRecoveryUrl(payload: unknown): string {
    const parsed = recoveryPayloadSchema.parse(payload);
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key(),
      Buffer.from(parsed.iv, 'base64url'),
    );
    decipher.setAAD(Buffer.from('rihal-password-reset-notification-v1', 'utf8'));
    decipher.setAuthTag(Buffer.from(parsed.tag, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(parsed.ciphertext, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  private key(): Buffer {
    const secret = this.config.getOrThrow<string>('AUTH_SECRET');
    return Buffer.from(
      hkdfSync('sha256', Buffer.from(secret, 'utf8'), 'rihal-auth-v1', 'recovery-outbox', 32),
    );
  }
}
