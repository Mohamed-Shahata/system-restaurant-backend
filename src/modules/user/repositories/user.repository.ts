import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import {
  IUser,
  IUserRepository,
  IVerificationCode,
  UserRole,
} from '../interfaces/user.interface';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(raw: any): IUser {
    return {
      id: raw.id,
      firstName: raw.firstName,
      lastName: raw.lastName,
      email: raw.email,
      password: raw.password,
      phonePrimary: raw.phonePrimary,
      phoneSecondary: raw.phoneSecondary ?? null,
      address: raw.address ?? null,
      avatarUrl: raw.avatarUrl ?? null,
      avatarPublicId: raw.avatarPublicId ?? null,
      role: raw.role as UserRole,
      isVerified: raw.isVerified,
      resetPasswordToken: raw.resetPasswordToken ?? null,
      resetPasswordExpires: raw.resetPasswordExpires ?? null,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  private mapCode(raw: any): IVerificationCode {
    return {
      id: raw.id,
      userId: raw.userId,
      code: raw.code,
      expiresAt: raw.expiresAt,
      lastSentAt: raw.lastSentAt,
      createdAt: raw.createdAt,
    };
  }

  // ─── User Queries ─────────────────────────────────────────────────────────

  async findAll(): Promise<IUser[]> {
    const rows = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.map(r));
  }

  async findById(id: string): Promise<IUser | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? this.map(row) : null;
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row ? this.map(row) : null;
  }

  async findByPhone(phone: string): Promise<IUser | null> {
    const row = await this.prisma.user.findFirst({
      where: {
        OR: [{ phonePrimary: phone }, { phoneSecondary: phone }],
      },
    });
    return row ? this.map(row) : null;
  }

  async findByResetToken(token: string): Promise<IUser | null> {
    const row = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gt: new Date() },
      },
    });
    return row ? this.map(row) : null;
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

  async removeAvatar(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null, avatarPublicId: null },
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

  async updateUserData(userId: string, data: UpdateUserDto) {
    const { firstName, lastName, address, phonePrimary, phoneSecondary } = data;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(address !== undefined && { address }),
        ...(phonePrimary !== undefined && { phonePrimary }),
        ...(phoneSecondary !== undefined && { phoneSecondary }),
      },
    });
  }

  async updateEmail(userId: string, email: string): Promise<IUser> {
    const row = await this.prisma.user.update({
      where: { id: userId },
      data: { email, isVerified: true },
    });
    return this.map(row);
  }

  async deleteUserAfterAvatar(userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.verificationCode.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });
  }

  // ─── Verification Code Queries ────────────────────────────────────────────

  async createVerificationCode(
    userId: string,
    code: string,
    expiresAt: Date,
  ): Promise<IVerificationCode> {
    const row = await this.prisma.verificationCode.create({
      data: { userId, code, expiresAt },
    });
    return this.mapCode(row);
  }

  async findVerificationCode(
    userId: string,
    code: string,
  ): Promise<IVerificationCode | null> {
    const row = await this.prisma.verificationCode.findFirst({
      where: { userId, code, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    return row ? this.mapCode(row) : null;
  }

  async findLatestVerificationCode(
    userId: string,
  ): Promise<IVerificationCode | null> {
    const row = await this.prisma.verificationCode.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return row ? this.mapCode(row) : null;
  }

  async deleteVerificationCodes(userId: string): Promise<void> {
    await this.prisma.verificationCode.deleteMany({ where: { userId } });
  }
}
