import { Injectable, NotFoundException } from '@nestjs/common';
import { CloudinaryService } from '../../shared/cloudinary/cloudinary.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { QueryMenuItemsDto } from './dto/query-menu-items.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { IMenuItem, IPaginatedMenuItems } from './interfaces/menu.interface';
import {
  MenuItemWithRelations,
  MenuRepository,
} from './repositories/menu.repository';
import { SizesRepository } from '../sizes/repositories/sizes.repository';
import { AddonsRepository } from '../addons/repositories/addons.repository';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class MenuService {
  constructor(
    private readonly menuRepository: MenuRepository,
    private readonly cloudinaryService: CloudinaryService,
    private readonly sizesRepository: SizesRepository,
    private readonly addonsRepository: AddonsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateMenuItemDto,
    imageFiles: Express.Multer.File[] = [],
  ): Promise<IMenuItem> {
    const hasDiscount =
      dto.hasDiscount ??
      Boolean(dto.discountPercentage && dto.discountPercentage > 0);

    let uploadedImages: { url: string; publicId: string }[] = [];
    if (imageFiles.length > 0) {
      uploadedImages = await this.cloudinaryService.uploadImages(
        imageFiles.map((f) => f.buffer),
        'restaurant/menu-items',
      );
    }

    try {
      const itemId = await this.prisma.$transaction(async (tx) => {
        const item = await this.menuRepository.create(
          {
            name: dto.name,
            description: dto.description,
            category: { connect: { id: dto.categoryId } },
            isAvailable: dto.isAvailable ?? true,
            hasDiscount,
            discountPercentage: hasDiscount
              ? (dto.discountPercentage ?? 0)
              : null,
            rating: dto.rating ?? 0,
          },
          tx,
        );

        for (const size of dto.sizes) {
          await this.sizesRepository.create(
            {
              menuItem: { connect: { id: item.id } },
              label: size.label,
              price: size.price,
              slug: size.slug,
              isAvailable: size.isAvailable ?? true,
              createdAt: new Date(),
            },
            tx,
          );
        }

        if (dto.addons && dto.addons.length > 0) {
          for (const addon of dto.addons) {
            await this.addonsRepository.create(
              {
                menuItem: { connect: { id: item.id } },
                name: addon.name,
                price: addon.price,
              },
              tx,
            );
          }
        }

        if (uploadedImages.length > 0) {
          await this.menuRepository.addImages(
            item.id,
            uploadedImages.map(({ url, publicId }, i) => ({
              url,
              publicId,
              order: i,
            })),
            tx,
          );
        }

        return item.id;
      });

      const full = await this.menuRepository.findById(itemId);
      return this.toMenuItem(full!);
    } catch (error) {
      // لو الـ DB transaction فشلت، امسح أي صور اترفعت على Cloudinary
      // عشان منسيبش orphan files هناك
      if (uploadedImages.length > 0) {
        await Promise.all(
          uploadedImages.map((img) =>
            this.cloudinaryService.deleteImage(img.publicId),
          ),
        );
      }
      throw error;
    }
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
    return this.toMenuItem(item);
  }

  async update(
    id: string,
    dto: UpdateMenuItemDto,
    imageFiles: Express.Multer.File[] = [],
  ): Promise<IMenuItem> {
    const existing = await this.menuRepository.findById(id);
    if (!existing) throw new NotFoundException(`Menu item ${id} not found`);

    const hasDiscount =
      dto.hasDiscount ??
      Boolean(dto.discountPercentage && dto.discountPercentage > 0);

    await this.menuRepository.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.categoryId !== undefined && {
        category: { connect: { id: dto.categoryId } },
      }),
      ...(dto.isAvailable !== undefined && { isAvailable: dto.isAvailable }),
      ...(dto.hasDiscount !== undefined && { hasDiscount: dto.hasDiscount }),
      ...(dto.hasDiscount === false && { discountPercentage: null }),
      ...(dto.hasDiscount !== false &&
        dto.discountPercentage !== undefined && {
          hasDiscount,
          discountPercentage: dto.discountPercentage,
        }),
      ...(dto.rating !== undefined && { rating: dto.rating }),
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
    return this.toMenuItem(full!);
  }

  async removeImage(menuItemId: string, imageId: string): Promise<IMenuItem> {
    const item = await this.menuRepository.findById(menuItemId);
    if (!item) throw new NotFoundException(`Menu item ${menuItemId} not found`);

    const image = item.images.find((img) => img.id === imageId);
    if (!image) throw new NotFoundException(`Image ${imageId} not found`);

    await this.cloudinaryService.deleteImage(image.publicId);
    await this.menuRepository.deleteImage(imageId);

    const full = await this.menuRepository.findById(menuItemId);
    return this.toMenuItem(full!);
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
    return this.toMenuItem(full!);
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

  private toMenuItem(item: MenuItemWithRelations): IMenuItem {
    return {
      ...item,
      discountPercentage:
        item.discountPercentage === null
          ? null
          : Number(item.discountPercentage),
      rating: Number(item.rating),
      addons: (item.addons ?? []).map((a) => ({
        ...a,
        price: Number(a.price),
      })),
      sizes: (item.sizes ?? []).map((s) => ({ ...s, price: Number(s.price) })),
    };
  }
}
