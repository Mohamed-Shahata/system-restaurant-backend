import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../../shared/cloudinary/cloudinary.module';
import { AddonsModule } from '../addons/addons.module';
import { SizesModule } from '../sizes/sizes.module';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { MenuRepository } from './repositories/menu.repository';

@Module({
  imports: [CloudinaryModule, SizesModule, AddonsModule],
  controllers: [MenuController],
  providers: [MenuService, MenuRepository],
  exports: [MenuService],
})
export class MenuModule {}
