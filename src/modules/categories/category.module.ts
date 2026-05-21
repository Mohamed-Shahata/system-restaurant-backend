import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller.js';
import { CategoryService } from './category.service.js';
import { CategoryRepository } from './repositories/category.repository.js';

@Module({
  controllers: [CategoryController],
  providers: [CategoryService, CategoryRepository],
  exports: [CategoryService],
})
export class CategoryModule {}
