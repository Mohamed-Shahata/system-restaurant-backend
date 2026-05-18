import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../../shared/cloudinary/cloudinary.module.js';
import { MenuController } from './menu.controller.js';
import { MenuService } from './menu.service.js';
import { MenuRepository } from './repositories/menu.repository.js';

@Module({
  imports: [CloudinaryModule],
  controllers: [MenuController],
  providers: [MenuService, MenuRepository],
  exports: [MenuService],
})
export class MenuModule {}
