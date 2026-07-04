import {
  Controller,
  Body,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { UserService } from './user.service';
import { UserPublicDto } from './dto/user-public.dto';
import type { IUser } from './interfaces/user.interface';
import { UserRole } from './interfaces/user.interface';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorator/roles.decorator';
import { CurrentUser } from '../../core/auth/decorator/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { RequestEmailChangeDto } from './dto/request-email-change.dto';
import { VerifyEmailChangeDto } from './dto/verify-email-change.dto';
import { RemoveAvatarDto } from './dto/removeAvatar.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ─── GET /users/me ──────────────────────────────────────────────────────────
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'Returns current user data',
    schema: {
      example: {
        success: true,
        message: 'User profile retrieved successfully',
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          firstName: 'Ahmed',
          lastName: 'Mohamed',
          email: 'ahmed@example.com',
          phonePrimary: '01012345678',
          phoneSecondary: null,
          address: null,
          avatarUrl: null,
          role: 'user',
          isVerified: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMe(@CurrentUser() user: IUser) {
    return this.userService.getMe(user);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  updateMe(@CurrentUser() user: IUser, @Body() dto: UpdateUserDto) {
    return this.userService.update(user.id, dto);
  }

  @Post('me/email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to a new email before changing it' })
  @ApiResponse({ status: 200, description: 'Verification code sent' })
  requestEmailChange(
    @CurrentUser() user: IUser,
    @Body() dto: RequestEmailChangeDto,
  ) {
    return this.userService.requestEmailChange(user.id, dto);
  }

  @Patch('me/email')
  @ApiOperation({ summary: 'Verify OTP and update current user email' })
  @ApiResponse({ status: 200, description: 'Email updated successfully' })
  verifyEmailChange(
    @CurrentUser() user: IUser,
    @Body() dto: VerifyEmailChangeDto,
  ) {
    return this.userService.verifyEmailChange(user.id, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete current authenticated user account' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  removeMe(@CurrentUser() user: IUser) {
    return this.userService.removeMe(user.id);
  }

  // ─── POST /users/me/avatar ──────────────────────────────────────────────────
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload current user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar uploaded successfully',
    schema: {
      example: {
        success: true,
        message: 'Avatar uploaded successfully',
        data: {
          avatarUrl: 'https://res.cloudinary.com/demo/image/upload/avatar.jpg',
          publicId: 'users/avatar_abc123',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  uploadAvatar(
    @CurrentUser() user: IUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.userService.uploadAvatar(user.id, file);
  }

  // ─── DELETE /users/me/avatar ────────────────────────────────────────────────
  @Delete('me/avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete current user avatar' })
  @ApiBody({
    type: RemoveAvatarDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'Avatar deleted successfully',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid public ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  removeAvatar(@CurrentUser() user: IUser, @Body() dto: RemoveAvatarDto) {
    return this.userService.removeAvatar(user.id, dto.publicId);
  }

  // ─── GET /users ─────────────────────────────────────────────────────────────
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Get all users' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of all users',
    schema: {
      example: {
        success: true,
        message: 'Users retrieved successfully',
        data: [{ id: '...', firstName: 'Ahmed' }],
        meta: { total: 50, page: 1, limit: 50, totalPages: 1 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – admin only' })
  findAll() {
    return this.userService.findAll();
  }

  // ─── GET /users/:id ─────────────────────────────────────────────────────────
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Get a user by ID' })
  @ApiParam({
    name: 'id',
    description: 'UUID of the user',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the requested user',
    type: UserPublicDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – admin only' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.findById(id);
  }
}
