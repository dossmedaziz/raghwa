import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogModule } from '../catalog/catalog.module';
import { GarageHours } from './entities/garage-hours.entity';
import { Garage } from './entities/garage.entity';
import { GarageOwnershipGuard } from './garage-ownership.guard';
import { GaragesService } from './garages.service';

@Module({
  imports: [TypeOrmModule.forFeature([Garage, GarageHours]), CatalogModule],
  providers: [GaragesService, GarageOwnershipGuard],
  exports: [GaragesService, GarageOwnershipGuard],
})
export class GaragesModule {}
