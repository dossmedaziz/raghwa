import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';
import { toTnd } from '../../../common/money';
import { Trim } from '../../../common/validation/decorators';
import type { WashService } from '../../../core/catalog/wash-service.entity';

export class CreateServiceDto {
  @ApiProperty({ example: 'غسيل كامل', maxLength: 80 })
  @Trim() @IsString() @Length(1, 80)
  nameAr: string;

  @ApiProperty({ example: 'Lavage complet', maxLength: 80 })
  @Trim() @IsString() @Length(1, 80)
  nameFr: string;

  @ApiPropertyOptional({ example: 'برّا وداخل، والجنط زادة', maxLength: 300 })
  @IsOptional() @Trim() @IsString() @MaxLength(300)
  descriptionAr?: string;

  @ApiPropertyOptional({ example: 'Extérieur + intérieur, jantes incluses', maxLength: 300 })
  @IsOptional() @Trim() @IsString() @MaxLength(300)
  descriptionFr?: string;

  @ApiProperty({ example: 20, description: 'TND, up to 3 decimals (millimes).', minimum: 0, maximum: 10000 })
  @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) @Max(10000)
  price: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class UpdateServiceDto extends PartialType(CreateServiceDto) {}

export class OwnerServiceDto {
  @ApiProperty() id: string;
  @ApiProperty() nameAr: string;
  @ApiProperty() nameFr: string;
  @ApiProperty() descriptionAr: string;
  @ApiProperty() descriptionFr: string;
  @ApiProperty({ example: 20, description: 'TND' }) price: number;
  @ApiProperty() isActive: boolean;

  static from(s: WashService): OwnerServiceDto {
    return {
      id: s.id, nameAr: s.nameAr, nameFr: s.nameFr, descriptionAr: s.descriptionAr, descriptionFr: s.descriptionFr,
      price: toTnd(s.priceMillimes), isActive: s.isActive,
    };
  }
}
