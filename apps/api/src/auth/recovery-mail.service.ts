import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

@Injectable()
export class RecoveryMailService {
  private readonly logger = new Logger(RecoveryMailService.name);
  private transporter?: Transporter;

  constructor(private readonly config: ConfigService) {}

  async deliver(email: string, resetUrl: string): Promise<boolean> {
    const smtpUrl = this.config.get<string>('SMTP_URL');
    const from = this.config.get<string>('SMTP_FROM');
    if (!smtpUrl || !from) {
      return false;
    }

    try {
      this.transporter ??= this.createSmtpTransport(smtpUrl);
      await this.transporter.sendMail({
        from,
        to: email,
        subject: 'Reset your Rihal account password',
        text: [
          'A password reset was requested for your Rihal account.',
          'Use the one-time link below within 15 minutes:',
          resetUrl,
          'If you did not request this change, you can ignore this email.',
        ].join('\n\n'),
      });
      return true;
    } catch {
      // Keep the encrypted outbox record pending; never log reset URLs or provider errors.
      this.logger.warn('Password recovery email delivery failed; the encrypted notification remains pending.');
      return false;
    }
  }

  private createSmtpTransport(smtpUrl: string): Transporter {
    const url = new URL(smtpUrl);
    const secure = url.protocol === 'smtps:';
    const configuredPort = Number(url.port || (secure ? 465 : 587));
    const username = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);

    return createTransport({
      host: url.hostname,
      port: configuredPort,
      secure,
      requireTLS: this.config.get<string>('NODE_ENV') === 'production' && !secure,
      ...(username || password ? { auth: { user: username, pass: password } } : {}),
    });
  }
}
