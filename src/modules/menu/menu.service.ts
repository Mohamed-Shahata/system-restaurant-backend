import { Injectable, NotFoundException } from '@nestjs/common';
import { CloudinaryService } from '../../shared/cloudinary/cloudinary.service.js';
import { CreateMenuItemDto } from './dto/create-menu-item.dto.js';
import { QueryMenuItemsDto } from './dto/query-menu-items.dto.js';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto.js';
import { IMenuItem, IPaginatedMenuItems } from './interfaces/menu.interface.js';
import { MenuRepository } from './repositories/menu.repository.js';

@Injectable()
export class MenuService {
  constructor(
    private readonly menuRepository: MenuRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(
    dto: CreateMenuItemDto,
    imageFiles: Express.Multer.File[] = [],
  ): Promise<IMenuItem> {
    const item = await this.menuRepository.create({
      name: dto.name,
      description: dto.description,
      price: dto.price,
      category: dto.category,
      isAvailable: dto.isAvailable ?? true,
    });

    if (imageFiles.length > 0) {
      const uploaded = await this.cloudinaryService.uploadImages(
        imageFiles.map((f) => f.buffer),
        'restaurant/menu-items',
      );
      await this.menuRepository.addImages(
        item.id,
        uploaded.map(({ url, publicId }, i) => ({ url, publicId, order: i })),
      );
    }

    const full = await this.menuRepository.findById(item.id);
    return { ...full!, price: Number(full!.price) };
  }

  async findAll(query: QueryMenuItemsDto): Promise<IPaginatedMenuItems> {
    return this.menuRepository.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      category: query.category,
      isAvailable: query.isAvailable,
      search: query.search,
    });
  }

  async findOne(id: string): Promise<IMenuItem> {
    const item = await this.menuRepository.findById(id);
    if (!item) throw new NotFoundException(`Menu item ${id} not found`);
    return { ...item, price: Number(item.price) };
  }

  async update(
    id: string,
    dto: UpdateMenuItemDto,
    imageFiles: Express.Multer.File[] = [],
  ): Promise<IMenuItem> {
    const existing = await this.menuRepository.findById(id);
    if (!existing) throw new NotFoundException(`Menu item ${id} not found`);

    await this.menuRepository.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.price !== undefined && { price: dto.price }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.isAvailable !== undefined && { isAvailable: dto.isAvailable }),
    });

    if (imageFiles.length > 0) {
      const uploaded = await this.cloudinaryService.uploadImages(
        imageFiles.map((f) => f.buffer),
        'restaurant/menu-items',
      );
      await this.menuRepository.addImages(
        id,
        uploaded.map(({ url, publicId }, i) => ({
          url,
          publicId,
          order: existing.images.length + i,
        })),
      );
    }

    const full = await this.menuRepository.findById(id);
    return { ...full!, price: Number(full!.price) };
  }

  async removeImage(menuItemId: string, imageId: string): Promise<IMenuItem> {
    const item = await this.menuRepository.findById(menuItemId);
    if (!item) throw new NotFoundException(`Menu item ${menuItemId} not found`);

    const image = item.images.find((img) => img.id === imageId);
    if (!image) throw new NotFoundException(`Image ${imageId} not found`);

    await this.cloudinaryService.deleteImage(image.publicId);
    await this.menuRepository.deleteImage(imageId);

    const full = await this.menuRepository.findById(menuItemId);
    return { ...full!, price: Number(full!.price) };
  }

  async removeAllImages(menuItemId: string): Promise<IMenuItem> {
    const item = await this.menuRepository.findById(menuItemId);
    if (!item) throw new NotFoundException(`Menu item ${menuItemId} not found`);

    await Promise.all(
      item.images.map((img) =>
        this.cloudinaryService.deleteImage(img.publicId),
      ),
    );
    await this.menuRepository.deleteAllImages(menuItemId);

    const full = await this.menuRepository.findById(menuItemId);
    return { ...full!, price: Number(full!.price) };
  }

  async remove(id: string): Promise<void> {
    const existing = await this.menuRepository.findById(id);
    if (!existing) throw new NotFoundException(`Menu item ${id} not found`);

    await Promise.all(
      existing.images.map((img) =>
        this.cloudinaryService.deleteImage(img.publicId),
      ),
    );

    await this.menuRepository.delete(id);
  }
}
