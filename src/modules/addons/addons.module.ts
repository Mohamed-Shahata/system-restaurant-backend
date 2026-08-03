import { Module } from '@nestjs/common';
import { AddonsController } from './addons.controller';
import { AddonsService } from './addons.service';
import { AddonsRepository } from './repositories/addons.repository';

@Module({
  controllers: [AddonsController],
  providers: [AddonsService, AddonsRepository],
  exports: [AddonsService, AddonsRepository],
})
export class AddonsModule {}
