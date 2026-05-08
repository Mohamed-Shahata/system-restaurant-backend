import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '../prisma/prisma.service.js';
import { UserRepository } from '../../modules/user/repositories/user.repository.js';
import { MailService } from '../../shared/mail/mail.service.js';
import { CloudinaryService } from '../../shared/cloudinary/cloudinary.service.js';
import { JwtPayload } from './interfaces/jwt-payload.interface.js';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResendCodeDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/auth.dto.js';

const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_MINUTES = 5;
const RESET_TOKEN_EXPIRY_MINUTES = 30;
const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  // ─── Register ────────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const code = this.generateOtpCode();
    const codeExpiresAt = this.getExpiryDate(OTP_EXPIRY_MINUTES);

    // ── Transaction: user + verification_code atomically ─────────────────────
    // إذا فشل إرسال الإيميل → Rollback → مفيش user بدون كود في الـ DB
    let userId = '';

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          password: hashedPassword,
          phonePrimary: dto.phone_primary,
          phoneSecondary: dto.phone_secondary ?? null,
        },
      });

      userId = user.id;

      await tx.verificationCode.create({
        data: { userId: user.id, code, expiresAt: codeExpiresAt },
      });

      // الإيميل داخل الـ transaction — لو فشل → Rollback تلقائي
      await this.mailService.sendVerificationCode(
        dto.email,
        dto.firstName,
        code,
      );
    });

    return {
      message:
        'Registration successful. Please check your email for the verification code.',
    };
  }

  // ─── Verify Email ─────────────────────────────────────────────────────────────

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) throw new NotFoundException('User not found');
    if (user.isVerified)
      throw new BadRequestException('Email is already verified');

    const record = await this.userRepository.findVerificationCode(
      user.id,
      dto.code,
    );
    if (!record)
      throw new BadRequestException('Invalid or expired verification code');

    await this.userRepository.markEmailVerified(user.id);
    await this.userRepository.deleteVerificationCodes(user.id);

    const access_token = this.generateJwt(user.id, user.email, user.role);

    return {
      message: 'Email verified successfully',
      access_token,
      user: this.sanitizeUser(user),
    };
  }

  // ─── Resend Code ──────────────────────────────────────────────────────────────

  async resendCode(dto: ResendCodeDto) {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) throw new NotFoundException('User not found');
    if (user.isVerified)
      throw new BadRequestException('Email is already verified');

    const latest = await this.userRepository.findLatestVerificationCode(
      user.id,
    );

    if (latest) {
      const minutesSince = this.minutesSince(latest.lastSentAt);
      if (minutesSince < RESEND_COOLDOWN_MINUTES) {
        const waitSeconds = Math.ceil(
          (RESEND_COOLDOWN_MINUTES - minutesSince) * 60,
        );
        throw new BadRequestException(
          `Please wait ${waitSeconds} seconds before requesting a new code`,
        );
      }
    }

    await this.userRepository.deleteVerificationCodes(user.id);
    const newCode = this.generateOtpCode();
    await this.userRepository.createVerificationCode(
      user.id,
      newCode,
      this.getExpiryDate(OTP_EXPIRY_MINUTES),
    );
    await this.mailService.sendVerificationCode(
      user.email,
      user.firstName,
      newCode,
    );

    return { message: 'Verification code sent. Please check your email.' };
  }

  // ─── Login ────────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid email or password');

    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid) throw new UnauthorizedException('Invalid email or password');

    if (!user.isVerified) {
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );
    }

    const access_token = this.generateJwt(user.id, user.email, user.role);

    return {
      message: 'Login successful',
      access_token,
      user: this.sanitizeUser(user),
    };
  }

  // ─── Forgot Password ──────────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepository.findByEmail(dto.email);

    // نفس الـ response دايمًا — لمنع email enumeration
    if (!user)
      return { message: 'If this email exists, a reset link has been sent.' };

    const resetToken = uuidv4();
    const expiresAt = this.getExpiryDate(RESET_TOKEN_EXPIRY_MINUTES);

    await this.userRepository.setResetPasswordToken(
      user.id,
      resetToken,
      expiresAt,
    );
    await this.mailService.sendPasswordResetEmail(
      user.email,
      user.firstName,
      resetToken,
    );

    return { message: 'If this email exists, a reset link has been sent.' };
  }

  // ─── Reset Password ───────────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepository.findByResetToken(dto.token);
    if (!user) throw new BadRequestException('Invalid or expired reset token');

    const hashed = await bcrypt.hash(dto.new_password, SALT_ROUNDS);
    await this.userRepository.updatePassword(user.id, hashed);

    return { message: 'Password reset successfully. You can now log in.' };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  private generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private getExpiryDate(minutes: number): Date {
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  private minutesSince(date: Date): number {
    return (Date.now() - new Date(date).getTime()) / (1000 * 60);
  }

  private generateJwt(userId: string, email: string, role: UserRole): string {
    const payload: JwtPayload = { sub: userId, email, role };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: (this.configService.get<string>('jwt.expiresIn') ??
        '7d') as any,
    });
  }

  private sanitizeUser(user: User) {
    const { password, resetPasswordToken, resetPasswordExpires, ...safe } =
      user;
    return safe;
  }
}
