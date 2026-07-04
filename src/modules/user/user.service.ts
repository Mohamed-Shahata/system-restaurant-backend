import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from './repositories/user.repository';
import { UserPublicDto } from './dto/user-public.dto';
import { IUser } from './interfaces/user.interface';
import {
  ApiResponse,
  PaginatedApiResponse,
  ok,
  paginated,
} from '../../shared/response/api-response';
import { UpdateUserDto } from './dto/update-user.dto';
import { RequestEmailChangeDto } from './dto/request-email-change.dto';
import { VerifyEmailChangeDto } from './dto/verify-email-change.dto';
import { MailService } from '../../shared/mail/mail.service';
import { CloudinaryService } from '../../shared/cloudinary/cloudinary.service';
import { JwtPayload } from '../../core/auth/interfaces/jwt-payload.interface';
import type { StringValue } from 'ms';

const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_MINUTES = 5;

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly mailService: MailService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ─── GET /users/me ─────────────────────────────────────────────────────────
  getMe(user: IUser): ApiResponse<UserPublicDto> {
    return ok(UserPublicDto.from(user), 'User profile retrieved successfully');
  }

  // ─── GET /users ────────────────────────────────────────────────────────────
  async findAll(): Promise<PaginatedApiResponse<UserPublicDto>> {
    const users = await this.userRepository.findAll();
    return paginated(
      UserPublicDto.fromMany(users),
      {
        total: users.length,
        page: 1,
        limit: users.length,
        totalPages: 1,
      },
      'Users retrieved successfully',
    );
  }

  async update(userId: string, dto: UpdateUserDto) {
    const userEgesting = await this.userRepository.findById(userId);

    if (!userEgesting) throw new BadRequestException('User not found');
    await this.ensurePhonesAreAvailable(userId, dto);

    await this.userRepository.updateUserData(userId, dto);

    return ok(null, 'Updated user successfully');
  }

  async requestEmailChange(userId: string, dto: RequestEmailChangeDto) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if (user.email === dto.email)
      throw new BadRequestException('New email must be different');

    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing && existing.id !== userId)
      throw new ConflictException('Email already in use');

    const latest = await this.userRepository.findLatestVerificationCode(userId);
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

    const code = this.generateOtpCode();
    await this.userRepository.deleteVerificationCodes(userId);
    await this.userRepository.createVerificationCode(
      userId,
      code,
      this.getExpiryDate(OTP_EXPIRY_MINUTES),
    );
    await this.mailService.sendVerificationCode(
      dto.email,
      user.firstName,
      code,
    );

    return ok(null, 'Verification code sent to the new email.');
  }

  async verifyEmailChange(userId: string, dto: VerifyEmailChangeDto) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing && existing.id !== userId)
      throw new ConflictException('Email already in use');

    const record = await this.userRepository.findVerificationCode(
      userId,
      dto.code,
    );
    if (!record)
      throw new BadRequestException('Invalid or expired verification code');

    const updated = await this.userRepository.updateEmail(userId, dto.email);
    await this.userRepository.deleteVerificationCodes(userId);
    const access_token = this.generateJwt(updated);

    return ok(
      { access_token, user: UserPublicDto.from(updated) },
      'Email updated successfully',
    );
  }

  async removeMe(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (user.avatarPublicId) {
      await this.cloudinaryService.deleteImage(user.avatarPublicId);
    }
    await this.userRepository.deleteUserAfterAvatar(userId);

    return ok(null, 'User deleted successfully');
  }

  // ─── GET /users/:id ────────────────────────────────────────────────────────
  async findById(id: string): Promise<ApiResponse<UserPublicDto>> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException(`User with id "${id}" not found`);
    return ok(UserPublicDto.from(user), 'User retrieved successfully');
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const user = await this.userRepository.findById(userId);
    if (!user)
      throw new NotFoundException(`User with id "${userId}" not found`);

    if (user.avatarPublicId)
      await this.cloudinaryService.deleteImage(user.avatarPublicId);

    const result = await this.cloudinaryService.uploadImage(file.buffer);

    await this.userRepository.updateAvatar(userId, result.url, result.publicId);

    return { message: 'upload avatar successfully' };
  }

  async removeAvatar(userId: string, publicId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user)
      throw new NotFoundException(`User with id "${userId}" not found`);

    if (!user.avatarPublicId)
      throw new NotFoundException(`There are no photos to delete.`);

    await this.cloudinaryService.deleteImage(publicId);

    await this.userRepository.removeAvatar(userId);

    return { message: 'remove avatar successfully' };
  }

  private async ensurePhonesAreAvailable(userId: string, dto: UpdateUserDto) {
    if (dto.phonePrimary) {
      const existing = await this.userRepository.findByPhone(dto.phonePrimary);
      if (existing && existing.id !== userId)
        throw new ConflictException('Phone number already in use');
    }
    if (dto.phoneSecondary) {
      const existing = await this.userRepository.findByPhone(
        dto.phoneSecondary,
      );
      if (existing && existing.id !== userId)
        throw new ConflictException('Secondary phone number already in use');
    }
  }

  private generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private getExpiryDate(minutes: number): Date {
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  private minutesSince(date: Date): number {
    return (Date.now() - new Date(date).getTime()) / (1000 * 60);
  }

  private generateJwt(user: IUser): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: this.configService.get<StringValue>('jwt.expiresIn'),
    });
  }
}
