import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IUser, IUserPublic, UserRole } from '../interfaces/user.interface.js';

export class UserPublicDto implements IUserPublic {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Ahmed' })
  firstName: string;

  @ApiProperty({ example: 'Mohamed' })
  lastName: string;

  @ApiProperty({ example: 'ahmed@example.com' })
  email: string;

  @ApiProperty({ example: '01012345678' })
  phonePrimary: string;

  @ApiPropertyOptional({ example: '01098765432', nullable: true })
  phoneSecondary: string | null;

  @ApiPropertyOptional({ example: '123 Main St, Cairo', nullable: true })
  address: string | null;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/...',
    nullable: true,
  })
  avatarUrl: string | null;

  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  role: UserRole;

  @ApiProperty({ example: true })
  isVerified: boolean;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-15T00:00:00.000Z' })
  updatedAt: Date;

  constructor(user: IUser) {
    this.id = user.id;
    this.firstName = user.firstName;
    this.lastName = user.lastName;
    this.email = user.email;
    this.phonePrimary = user.phonePrimary;
    this.phoneSecondary = user.phoneSecondary;
    this.address = user.address;
    this.avatarUrl = user.avatarUrl;
    this.role = user.role;
    this.isVerified = user.isVerified;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }

  static from(user: IUser): UserPublicDto {
    return new UserPublicDto(user);
  }

  static fromMany(users: IUser[]): UserPublicDto[] {
    return users.map((u) => new UserPublicDto(u));
  }
}
