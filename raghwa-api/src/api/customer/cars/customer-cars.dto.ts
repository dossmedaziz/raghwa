import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';
import { Trim } from '../../../common/validation/decorators';
import type { CustomerCar } from '../../../core/customers/customer-car.entity';

export class CreateCarDto {
  @ApiProperty({ example: 'Volkswagen', maxLength: 40 })
  @Trim() @IsString() @Length(1, 40)
  brand: string;

  @ApiProperty({ example: 'Polo', maxLength: 40 })
  @Trim() @IsString() @Length(1, 40)
  model: string;

  @ApiProperty({ example: '215 TU 4521', maxLength: 20 })
  @Trim() @IsString() @Length(1, 20)
  plate: string;

  @ApiPropertyOptional({ description: 'Make it the default car (the first car always is).' })
  @IsOptional() @IsBoolean()
  isDefault?: boolean;
}

export class UpdateCarDto extends PartialType(CreateCarDto) {}

export class CarDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'Volkswagen' }) brand: string;
  @ApiProperty({ example: 'Polo' }) model: string;
  @ApiProperty({ example: '215 TU 4521' }) plate: string;
  @ApiProperty() isDefault: boolean;

  static from(c: CustomerCar): CarDto {
    return { id: c.id, brand: c.brand, model: c.model, plate: c.plate, isDefault: c.isDefault };
  }
}
