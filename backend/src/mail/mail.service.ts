import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Envía correos por SMTP. Sin SMTP_HOST (desarrollo) solo los escribe en el log,
 * así se puede copiar el enlace de recuperación sin configurar nada.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const port = config.get<number>('SMTP_PORT', 587);
    const user = config.get<string>('SMTP_USER');
    this.from = config.get<string>('SMTP_FROM') ?? user ?? 'Pulsso <no-reply@localhost>';
    this.transporter = host
      ? createTransport({
          host,
          port,
          secure: port === 465,
          auth: user ? { user, pass: config.get<string>('SMTP_PASS') } : undefined,
        })
      : null;
  }

  async send(mail: Mail) {
    if (!this.transporter) {
      this.logger.warn(
        `SMTP sin configurar. Correo para ${mail.to}: ${mail.subject}\n${mail.text}`,
      );
      return;
    }
    await this.transporter.sendMail({ from: this.from, ...mail });
  }
}
