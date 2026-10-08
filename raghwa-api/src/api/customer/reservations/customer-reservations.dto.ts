import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsIn, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { PageMetaDto, PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { DateField, TimeField, Trim } from '../../../common/validation/decorators';
import type { FullReservation } from '../../../core/reservations/reservations.service';
import { ReservationBaseDto, reservationBase } from '../../shared/reservation.dto';
import { LocationDto } from '../../shared/schedule.dto';

export class CarInputDto {
  @ApiPropertyOptional({ example: 'Volkswagen', maxLength: 40 })
  @IsOptional() @Trim() @IsString() @MaxLength(40)
  brand?: string;

  @ApiPropertyOptional({ example: 'Polo', maxLength: 40 })
  @IsOptional() @Trim() @IsString() @MaxLength(40)
  model?: string;

  @ApiPropertyOptional({ example: '225 TU 6431', maxLength: 20 })
  @IsOptional() @Trim() @IsString() @MaxLength(20)
  plate?: string;
}

export class BookReservationDto {
  @ApiProperty() @IsUUID()
  garageId: string;

  @DateField({ example: '2026-10-22' }) date: string;
  @TimeField({ description: 'One of the slot times returned by GET /v1/garages/{id}/availability.' }) time: string;

  @ApiProperty({ type: [String], minItems: 1, maxItems: 10, description: 'Ids of the garage’s active services.' })
  @IsUUID('all', { each: true }) @ArrayMinSize(1) @ArrayMaxSize(10)
  serviceIds: string[];

  @ApiPropertyOptional({ type: CarInputDto })
  @IsOptional() @ValidateNested() @Type(() => CarInputDto)
  car?: CarInputDto;
}

export class RescheduleDto {
  @DateField({ example: '2026-10-23' }) date: string;
  @TimeField() time: string;
}

export class CustomerReservationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['upcoming', 'past'], default: 'upcoming' })
  @IsOptional() @IsIn(['upcoming', 'past'])
  scope: 'upcoming' | 'past' = 'upcoming';
}

export class ReservationGarageDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() phone: string;
  @ApiProperty() address: string;
  @ApiProperty() area: string;
  @ApiProperty() city: string;
  @ApiPropertyOptional({ type: LocationDto, nullable: true }) location: LocationDto | null;
}

export class CustomerReservationDto extends ReservationBaseDto {
  @ApiProperty({ type: ReservationGarageDto }) garage: ReservationGarageDto;

  static from(r: FullReservation): CustomerReservationDto {
    const g = r.garage;
    return {
      ...reservationBase(r),
      garage: { id: g.id, name: g.name, phone: g.phone, address: g.address, area: g.area, city: g.city, location: LocationDto.from(g) },
    };
  }
}

export class CustomerReservationPageDto {
  @ApiProperty({ type: [CustomerReservationDto] }) items: CustomerReservationDto[];
  @ApiProperty({ type: PageMetaDto }) meta: PageMetaDto;
}
