import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../../shared/cloudinary/cloudinary.module';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { OffersRepository } from './repositories/offers.repository';

@Module({
  imports: [CloudinaryModule],
  controllers: [OffersController],
  providers: [OffersService, OffersRepository],
  exports: [OffersService],
})
export class OffersModule {}
