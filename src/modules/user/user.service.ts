import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { UserPublicDto } from './dto/user-public.dto';
import { IUser } from './interfaces/user.interface';
import {
  ApiResponse,
  PaginatedApiResponse,
  ok,
  paginated,
} from '../../shared/response/api-response';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

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

  // ─── GET /users/:id ────────────────────────────────────────────────────────
  async findById(id: string): Promise<ApiResponse<UserPublicDto>> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException(`User with id "${id}" not found`);
    return ok(UserPublicDto.from(user), 'User retrieved successfully');
  }
}
