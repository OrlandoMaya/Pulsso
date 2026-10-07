import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
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
export class MailService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;
  private readonly target: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const port = config.get<number>('SMTP_PORT', 587);
    const user = config.get<string>('SMTP_USER');
    this.from = config.get<string>('SMTP_FROM') ?? user ?? 'Pulsso <no-reply@localhost>';
    this.target = `${host}:${port}${user ? ` como ${user}` : ''}`;
    this.transporter = host
      ? createTransport({
          host,
          port,
          secure: port === 465,
          auth: user ? { user, pass: config.get<string>('SMTP_PASS') } : undefined,
          // Si el proveedor del servidor bloquea el puerto, fallar pronto en vez de colgarse
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
          socketTimeout: 20_000,
        })
      : null;
  }

  /** Comprueba el SMTP al arrancar para que los fallos se vean en el log desde el principio */
  onApplicationBootstrap() {
    if (!this.transporter) {
      this.logger.warn(
        'SMTP sin configurar (falta SMTP_HOST): los correos solo se escriben en el log',
      );
      return;
    }
    this.transporter
      .verify()
      .then(() => this.logger.log(`SMTP listo (${this.target})`))
      .catch((e: Error) => this.logger.error(`SMTP no funciona (${this.target}): ${e.message}`));
  }

  async send(mail: Mail) {
    if (!this.transporter) {
      this.logger.warn(
        `SMTP sin configurar. Correo para ${mail.to}: ${mail.subject}\n${mail.text}`,
      );
      return;
    }
    const info = await this.transporter.sendMail({ from: this.from, ...mail });
    this.logger.log(`Correo enviado a ${mail.to} (${info.response})`);
  }
}
