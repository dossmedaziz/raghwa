import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogService } from './catalog.service';
import { WashService } from './wash-service.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WashService])],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
