import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service.js';

@Injectable()
export class CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.CategoryCreateInput) {
    return this.prisma.category.create({ data });
  }

  findAll() {
    return this.prisma.category.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.category.findUnique({ where: { id } });
  }

  findBySlug(slug: string) {
    return this.prisma.category.findUnique({ where: { slug } });
  }

  countMenuItems(id: string) {
    return this.prisma.menuItem.count({ where: { categoryId: id } });
  }

  update(id: string, data: Prisma.CategoryUpdateInput) {
    return this.prisma.category.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.prisma.category.delete({ where: { id } });
  }
}
