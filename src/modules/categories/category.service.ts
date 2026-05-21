import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { CategoryRepository } from './repositories/category.repository.js';

@Injectable()
export class CategoryService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async create(dto: CreateCategoryDto) {
    const existing = await this.categoryRepository.findBySlug(dto.slug);
    if (existing) throw new ConflictException('Category slug already exists');

    return this.categoryRepository.create({
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      isActive: dto.isActive ?? true,
    });
  }

  findAll() {
    return this.categoryRepository.findAll();
  }

  async findOne(id: string) {
    const category = await this.categoryRepository.findById(id);
    if (!category) throw new NotFoundException(`Category ${id} not found`);
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);

    if (dto.slug !== undefined) {
      const existing = await this.categoryRepository.findBySlug(dto.slug);
      if (existing && existing.id !== id) {
        throw new ConflictException('Category slug already exists');
      }
    }

    return this.categoryRepository.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.slug !== undefined && { slug: dto.slug }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const menuItemsCount = await this.categoryRepository.countMenuItems(id);
    if (menuItemsCount > 0) {
      throw new BadRequestException('Cannot delete category with menu items');
    }

    await this.categoryRepository.delete(id);
  }
}
