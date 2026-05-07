import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

// ─── Register ────────────────────────────────────────────────────────────────

export class RegisterDto {
  @ApiProperty({ example: 'Ahmed' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Mohamed' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'ahmed@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password@123', minLength: 8 })
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'password must contain at least one letter and one number',
  })
  password: string;

  @ApiProperty({ example: '01012345678' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\+201|01)[0-9]{9}$/, { message: 'Invalid Egyptian phone number' })
  phone_primary: string;

  @ApiPropertyOptional({ example: '01098765432' })
  @IsOptional()
  @IsString()
  @Matches(/^(\+201|01)[0-9]{9}$/, { message: 'Invalid Egyptian phone number' })
  phone_secondary?: string;

  @ApiPropertyOptional({ example: '5 شارع التحرير، القاهرة' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.user })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

// ─── Login ────────────────────────────────────────────────────────────────────

export class LoginDto {
  @ApiProperty({ example: 'ahmed@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password@123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

// ─── Verify Email ─────────────────────────────────────────────────────────────

export class VerifyEmailDto {
  @ApiProperty({ example: 'ahmed@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Code must contain digits only' })
  code: string;
}

// ─── Resend Code ──────────────────────────────────────────────────────────────

export class ResendCodeDto {
  @ApiProperty({ example: 'ahmed@example.com' })
  @IsEmail()
  email: string;
}

// ─── Forgot Password ──────────────────────────────────────────────────────────

export class ForgotPasswordDto {
  @ApiProperty({ example: 'ahmed@example.com' })
  @IsEmail()
  email: string;
}

// ─── Reset Password ───────────────────────────────────────────────────────────

export class ResetPasswordDto {
  @ApiProperty({ description: 'Reset token received via email' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NewPassword@456', minLength: 8 })
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'password must contain at least one letter and one number',
  })
  new_password: string;
}
