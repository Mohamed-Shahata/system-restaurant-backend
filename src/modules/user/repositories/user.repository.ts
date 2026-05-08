import { Injectable } from '@nestjs/common';
import { User, VerificationCode } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service.js';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── User Queries ────────────────────────────────────────────────────────────

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { phonePrimary: phone } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gt: new Date() },
      },
    });
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
    });
  }

  async updateAvatar(
    userId: string,
    avatarUrl: string,
    avatarPublicId: string,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl, avatarPublicId },
    });
  }

  async setResetPasswordToken(
    userId: string,
    token: string,
    expires: Date,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { resetPasswordToken: token, resetPasswordExpires: expires },
    });
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });
  }

  // ─── Verification Code Queries ───────────────────────────────────────────────

  async createVerificationCode(
    userId: string,
    code: string,
    expiresAt: Date,
  ): Promise<VerificationCode> {
    return this.prisma.verificationCode.create({
      data: { userId, code, expiresAt },
    });
  }

  async findVerificationCode(
    userId: string,
    code: string,
  ): Promise<VerificationCode | null> {
    return this.prisma.verificationCode.findFirst({
      where: {
        userId,
        code,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findLatestVerificationCode(
    userId: string,
  ): Promise<VerificationCode | null> {
    return this.prisma.verificationCode.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteVerificationCodes(userId: string): Promise<void> {
    await this.prisma.verificationCode.deleteMany({ where: { userId } });
  }
}
