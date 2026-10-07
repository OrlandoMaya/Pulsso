import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly users: Model<User>) {}

  findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.users.findOne({ email: email.toLowerCase() }).select('+passwordHash').exec();
  }

  findById(id: string): Promise<UserDocument | null> {
    return this.users.findById(id).exec();
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.users.findOne({ email: email.toLowerCase() }).exec();
  }

  async setResetToken(userId: string, tokenHash: string, expires: Date): Promise<void> {
    await this.users
      .updateOne({ _id: userId }, { resetTokenHash: tokenHash, resetTokenExpires: expires })
      .exec();
  }

  /** Cambia la contraseña y gasta el token en una sola operación (no se puede usar dos veces) */
  resetPassword(tokenHash: string, passwordHash: string): Promise<UserDocument | null> {
    return this.users
      .findOneAndUpdate(
        { resetTokenHash: tokenHash, resetTokenExpires: { $gt: new Date() } },
        { $set: { passwordHash }, $unset: { resetTokenHash: 1, resetTokenExpires: 1 } },
        { new: true },
      )
      .exec();
  }

  create(data: { name: string; email: string; passwordHash: string }): Promise<UserDocument> {
    return this.users.create(data);
  }
}
