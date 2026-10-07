import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { CalendarsService } from '../calendars/calendars.service';
import { MailService } from '../mail/mail.service';
import { UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 60 * 60_000;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly calendars: CalendarsService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    if (await this.users.findByEmailWithPassword(dto.email)) {
      throw new ConflictException('Ya existe una cuenta con ese correo');
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.users.create({ name: dto.name, email: dto.email, passwordHash });
    await this.calendars.createDefaults(user.id);
    return this.session(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmailWithPassword(dto.email);
    const ok = user ? await bcrypt.compare(dto.password, user.passwordHash) : false;
    if (!user || !ok) throw new UnauthorizedException('Correo o contraseña incorrectos');
    return this.session(user);
  }

  async me(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    return user;
  }

  /** Siempre responde lo mismo para no revelar qué correos tienen cuenta */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.users.findByEmail(dto.email);
    if (user) {
      const token = randomBytes(32).toString('hex');
      await this.users.setResetToken(
        user.id,
        sha256(token),
        new Date(Date.now() + RESET_TOKEN_TTL_MS),
      );
      // Sin await: el tiempo de respuesta no delata si la cuenta existe
      this.sendResetMail(user, token).catch((e: Error) =>
        this.logger.error(`No se pudo enviar el correo de recuperación: ${e.message}`),
      );
    }
    return { ok: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.users.resetPassword(sha256(dto.token), passwordHash);
    if (!user) throw new BadRequestException('El enlace no es válido o ya caducó. Pide uno nuevo.');
    return this.session(user);
  }

  private sendResetMail(user: UserDocument, token: string) {
    const url = `${this.appUrl()}/restablecer?token=${token}`;
    return this.mail.send({
      to: user.email,
      subject: 'Restablece tu contraseña de Pulsso',
      text:
        `Hola ${user.name}:\n\n` +
        `Para elegir una contraseña nueva abre este enlace (vale 1 hora):\n${url}\n\n` +
        'Si no lo pediste tú, ignora este correo; tu contraseña no cambia.',
      html: `
        <p>Hola ${escapeHtml(user.name)}:</p>
        <p>Para elegir una contraseña nueva pulsa el botón. El enlace vale 1 hora.</p>
        <p><a href="${url}" style="display:inline-block;padding:10px 18px;background:#18181b;color:#fafafa;border-radius:8px;text-decoration:none">Restablecer contraseña</a></p>
        <p style="color:#71717a;font-size:13px">Si no lo pediste tú, ignora este correo; tu contraseña no cambia.</p>`,
    });
  }

  private appUrl() {
    const url =
      this.config.get<string>('APP_URL') ??
      this.config.get<string>('CORS_ORIGIN', 'http://localhost:4040').split(',')[0];
    return url.trim().replace(/\/+$/, '');
  }

  private async session(user: UserDocument) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return { accessToken, user: user.toJSON() };
  }
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}
