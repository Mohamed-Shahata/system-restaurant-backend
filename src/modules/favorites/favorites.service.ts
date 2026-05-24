import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ok,
  paginated,
  ApiResponse,
  PaginatedApiResponse,
} from '../../shared/response/api-response';
import { QueryFavoritesDto } from './dto/query-favorites.dto';
import { IFavorite } from './interfaces/favorites.interface';
import { FavoritesRepository } from './repositories/favorites.repository';

@Injectable()
export class FavoritesService {
  constructor(private readonly favoritesRepository: FavoritesRepository) {}

  async add(
    userId: string,
    menuItemId: string,
  ): Promise<ApiResponse<IFavorite>> {
    const itemExists =
      await this.favoritesRepository.menuItemExists(menuItemId);
    if (!itemExists)
      throw new NotFoundException(`Menu item ${menuItemId} not found`);

    const alreadySaved = await this.favoritesRepository.exists(
      userId,
      menuItemId,
    );
    if (alreadySaved)
      throw new ConflictException('Item is already in your favorites');

    const favorite = await this.favoritesRepository.create(userId, menuItemId);
    return ok(favorite, 'Item added to favorites');
  }

  async findAll(
    userId: string,
    query: QueryFavoritesDto,
  ): Promise<PaginatedApiResponse<IFavorite>> {
    const result = await this.favoritesRepository.findAll({
      userId,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      search: query.search,
    });
    return paginated(
      result.data,
      result.meta,
      'Favorites retrieved successfully',
    );
  }

  async isFavorite(
    userId: string,
    menuItemId: string,
  ): Promise<ApiResponse<{ isFavorite: boolean }>> {
    const itemExists =
      await this.favoritesRepository.menuItemExists(menuItemId);
    if (!itemExists)
      throw new NotFoundException(`Menu item ${menuItemId} not found`);

    const isFavorite = await this.favoritesRepository.exists(
      userId,
      menuItemId,
    );
    return ok({ isFavorite }, 'Status retrieved successfully');
  }

  async remove(userId: string, menuItemId: string): Promise<ApiResponse<null>> {
    const exists = await this.favoritesRepository.exists(userId, menuItemId);
    if (!exists)
      throw new NotFoundException('Item not found in your favorites');

    await this.favoritesRepository.delete(userId, menuItemId);
    return ok(null, 'Item removed from favorites');
  }

  async removeAll(userId: string): Promise<ApiResponse<null>> {
    await this.favoritesRepository.deleteAll(userId);
    return ok(null, 'All favorites cleared');
  }
}
