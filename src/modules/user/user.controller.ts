import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { UserService } from './user.service.js';
import { UserPublicDto } from './dto/user-public.dto.js';
import type { IUser } from './interfaces/user.interface.js';
import { UserRole } from './interfaces/user.interface.js';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../core/auth/guards/roles.guard.js';
import { Roles } from '../../core/auth/decorator/roles.decorator.js';
import { CurrentUser } from '../../core/auth/decorator/current-user.decorator.js';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ─── GET /users/me ──────────────────────────────────────────────────────────
  // لازم يجي قبل /:id عشان NestJS ميعتبرش "me" هو الـ UUID param
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
