import { Module } from '@nestjs/common';
import { SizesController } from './sizes.controller';
import { SizesService } from './sizes.service';
import { SizesRepository } from './repositories/sizes.repository';

@Module({
  controllers: [SizesController],
  providers: [SizesService, SizesRepository],
  exports: [SizesService],
})
export class SizesModule {}
