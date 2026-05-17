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
import { JwtPayload } from './interfaces/jwt-payload.interface.js';
import { RegisterDto } from './dto/register.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { ResendCodeDto } from './dto/resend-code.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';

const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_MINUTES = 5;
const RESET_TOKEN_EXPIRY_MINUTES = 30;
const SALT_ROUNDS = 10;

/**
 * Service responsible for authentication operations including user registration,
 * email verification, login, password management, and JWT token handling.
 *
 * @class AuthService
 * @Injectable
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Registers a new user account.
   *
   * @param {RegisterDto} dto - The registration data containing user information
   * @returns {Promise<{ message: string }>} Success message with verification instructions
   * @throws {ConflictException} When email or phone number is already in use
   *
   * @example
   * const result = await authService.register({
   *   firstName: 'John',
   *   lastName: 'Doe',
   *   email: 'john@example.com',
   *   password: 'SecurePass123!',
   *   phone_primary: '+1234567890',
   *   phone_secondary: '+0987654321'
   * });
   */
  public async register(dto: RegisterDto) {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const existingByPhonePrimary = await this.userRepository.findByPhone(
      dto.phone_primary,
    );
    if (existingByPhonePrimary)
      throw new ConflictException('Phone number already in use');

    if (dto.phone_secondary) {
      const existingByPhoneSecondary = await this.userRepository.findByPhone(
        dto.phone_secondary,
      );
      if (existingByPhoneSecondary)
        throw new ConflictException('Secondary phone number already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const code = this.generateOtpCode();
    const codeExpiresAt = this.getExpiryDate(OTP_EXPIRY_MINUTES);

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

  /**
   * Verifies a user's email address using a verification code.
   *
   * @param {VerifyEmailDto} dto - The verification data containing email and code
   * @returns {Promise<{ message: string; access_token: string; user: Partial<User> }>}
   *          Success message, JWT access token, and sanitized user data
   * @throws {NotFoundException} When user is not found
   * @throws {BadRequestException} When email is already verified or code is invalid/expired
   *
   * @example
   * const result = await authService.verifyEmail({
   *   email: 'john@example.com',
   *   code: '123456'
   * });
   * console.log(result.access_token);
   */
  public async verifyEmail(dto: VerifyEmailDto) {
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

  /**
   * Resends a verification code to the user's email address.
   *
   * @param {ResendCodeDto} dto - The resend request data containing email
   * @returns {Promise<{ message: string }>} Success message confirming code was sent
   * @throws {NotFoundException} When user is not found
   * @throws {BadRequestException} When email is already verified or cooldown period hasn't elapsed
   *
   * @remarks
   * Resend requests are rate-limited by `RESEND_COOLDOWN_MINUTES` (default 5 minutes).
   *
   * @example
   * const result = await authService.resendCode({
   *   email: 'john@example.com'
   * });
   */
  public async resendCode(dto: ResendCodeDto) {
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
        throw new BadRequestException({
          message: `Please wait ${waitSeconds} seconds before requesting a new code`,
          waitSeconds,
          error: 'OTP_RATE_LIMIT',
        });
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

  /**
   * Authenticates a user with email and password.
   *
   * @param {LoginDto} dto - The login credentials containing email and password
   * @returns {Promise<{ message: string; access_token: string; user: Partial<User> }>}
   *          Success message, JWT access token, and sanitized user data
   * @throws {UnauthorizedException} When credentials are invalid or email is not verified
   *
   * @remarks
   * Users must have their email verified before they can log in.
   *
   * @example
   * const result = await authService.login({
   *   email: 'john@example.com',
   *   password: 'SecurePass123!'
   * });
   * // Use result.access_token for authenticated requests
   */
  public async login(dto: LoginDto) {
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

  /**
   * Initiates the password reset process by sending a reset token to the user's email.
   *
   * @param {ForgotPasswordDto} dto - The forgot password request containing email
   * @returns {Promise<{ message: string }>} Uniform success message for security purposes
   *
   * @remarks
   * This method always returns the same message whether the email exists or not,
   * to prevent email enumeration attacks. Reset tokens expire after
   * `RESET_TOKEN_EXPIRY_MINUTES` (default 30 minutes).
   *
   * @example
   * const result = await authService.forgotPassword({
   *   email: 'john@example.com'
   * });
   * // User receives reset link via email if account exists
   */
  public async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) throw new BadRequestException('email not found');

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

  /**
   * Resets a user's password using a valid reset token.
   *
   * @param {ResetPasswordDto} dto - The reset password data containing token and new password
   * @returns {Promise<{ message: string }>} Success message confirming password reset
   * @throws {BadRequestException} When reset token is invalid or expired
   *
   * @remarks
   * The new password is hashed using bcrypt with SALT_ROUNDS (default 10) before storage.
   *
   * @example
   * const result = await authService.resetPassword({
   *   token: '550e8400-e29b-41d4-a716-446655440000',
   *   new_password: 'NewSecurePass456!'
   * });
   */
  public async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepository.findByResetToken(dto.token);
    if (!user) throw new BadRequestException('Invalid or expired reset token');

    const hashed = await bcrypt.hash(dto.new_password, SALT_ROUNDS);
    await this.userRepository.updatePassword(user.id, hashed);

    return { message: 'Password reset successfully. You can now log in.' };
  }

  /**
   * Generates a 6-digit OTP (One-Time Password) code.
   *
   * @private
   * @returns {string} A 6-digit numeric string between 100000 and 999999
   *
   * @example
   * const code = this.generateOtpCode(); // Returns '483721'
   */
  private generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Calculates a future expiry date based on the specified number of minutes.
   *
   * @private
   * @param {number} minutes - Number of minutes from now until expiry
   * @returns {Date} The calculated expiry date
   *
   * @example
   * const expiryDate = this.getExpiryDate(10); // 10 minutes from now
   */
  private getExpiryDate(minutes: number): Date {
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  /**
   * Calculates the number of minutes elapsed since a given date.
   *
   * @private
   * @param {Date} date - The starting date
   * @returns {number} Minutes elapsed since the specified date
   *
   * @example
   * const minutesElapsed = this.minutesSince(previousTimestamp);
   */
  private minutesSince(date: Date): number {
    return (Date.now() - new Date(date).getTime()) / (1000 * 60);
  }

  /**
   * Generates a JWT (JSON Web Token) for authenticated users.
   *
   * @private
   * @param {string} userId - The user's unique identifier
   * @param {string} email - The user's email address
   * @param {UserRole} role - The user's role (e.g., ADMIN, USER)
   * @returns {string} Signed JWT token
   *
   * @remarks
   * Uses the JWT configuration from the config service (secret and expiration).
   * Default expiration is '7d' if not specified in config.
   *
   * @example
   * const token = this.generateJwt(user.id, user.email, user.role);
   * // Token can be used for Bearer authentication
   */
  private generateJwt(userId: string, email: string, role: UserRole): string {
    const payload: JwtPayload = { sub: userId, email, role };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: (this.configService.get<string>('jwt.expiresIn') ??
        '7d') as any,
    });
  }

  /**
   * Removes sensitive fields from a user object before sending to the client.
   *
   * @private
   * @param {User} user - The full user object from database
   * @returns {Partial<User>} Sanitized user object without sensitive fields
   *
   * @remarks
   * Removes the following fields: password, resetPasswordToken, resetPasswordExpires
   *
   * @example
   * const safeUser = this.sanitizeUser(userFromDb);
   * // safeUser contains all user fields except sensitive ones
   */
  private sanitizeUser(user: User) {
    const { password, resetPasswordToken, resetPasswordExpires, ...safe } =
      user;
    return safe;
  }
}
