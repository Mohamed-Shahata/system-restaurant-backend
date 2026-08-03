import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../../shared/cloudinary/cloudinary.module';
import { SizesModule } from '../sizes/sizes.module';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { MenuRepository } from './repositories/menu.repository';

@Module({
  imports: [CloudinaryModule, SizesModule],
  controllers: [MenuController],
  providers: [MenuService, MenuRepository],
  exports: [MenuService],
})
export class MenuModule {}
