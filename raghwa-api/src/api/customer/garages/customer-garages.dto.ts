import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { PaginationQueryDto, PageMetaDto } from '../../../common/dto/pagination.dto';
import { toTnd } from '../../../common/money';
import { DateField, Trim } from '../../../common/validation/decorators';
import type { WashService } from '../../../core/catalog/wash-service.entity';
import type { Garage } from '../../../core/garages/entities/garage.entity';
import type { GarageWithHours } from '../../../core/garages/garages.service';
import type { DaySchedule } from '../../../core/scheduling/day-schedule';
import { DayHoursDto, LocationDto } from '../../shared/schedule.dto';

export class GarageSearchQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Name, area or address.', example: 'marsa' })
  @IsOptional() @Trim() @IsString() @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ example: 'Tunis' })
  @IsOptional() @Trim() @IsString() @MaxLength(60)
  city?: string;

  @ApiPropertyOptional({ example: 36.8782, description: 'With `lng`: only garages within `radiusKm`, nearest first.' })
  @ValidateIf((o: GarageSearchQueryDto) => o.lat !== undefined || o.lng !== undefined)
  @Type(() => Number) @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({ example: 10.3247 })
  @ValidateIf((o: GarageSearchQueryDto) => o.lat !== undefined || o.lng !== undefined)
  @Type(() => Number) @IsLongitude()
  lng?: number;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(100)
  radiusKm = 10;
}

export class GarageCardDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() area: string;
  @ApiProperty() city: string;
  @ApiProperty() address: string;
  @ApiPropertyOptional({ type: LocationDto, nullable: true }) location: LocationDto | null;
  @ApiPropertyOptional({ nullable: true, type: Number, example: 1.4, description: 'Only when searching by position.' })
  distanceKm: number | null;
  @ApiPropertyOptional({ nullable: true, type: Number, example: 10, description: 'Cheapest active service, TND.' })
  fromPrice: number | null;

  static from(g: Garage, distanceMeters: number | null, minPriceMillimes: number | undefined): GarageCardDto {
    return {
      id: g.id, name: g.name, area: g.area, city: g.city, address: g.address, location: LocationDto.from(g),
      distanceKm: distanceMeters === null ? null : Math.round(distanceMeters / 100) / 10,
      fromPrice: minPriceMillimes === undefined ? null : toTnd(minPriceMillimes),
    };
  }
}

export class GarageCardPageDto {
  @ApiProperty({ type: [GarageCardDto] }) items: GarageCardDto[];
  @ApiProperty({ type: PageMetaDto }) meta: PageMetaDto;
}

export class PublicServiceDto {
  @ApiProperty() id: string;
  @ApiProperty() nameAr: string;
  @ApiProperty() nameFr: string;
  @ApiProperty() descriptionAr: string;
  @ApiProperty() descriptionFr: string;
  @ApiProperty({ example: 20, description: 'TND' }) price: number;

  static from(s: WashService): PublicServiceDto {
    return { id: s.id, nameAr: s.nameAr, nameFr: s.nameFr, descriptionAr: s.descriptionAr, descriptionFr: s.descriptionFr, price: toTnd(s.priceMillimes) };
  }
}

export class GarageDetailDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() description: string;
  @ApiProperty() phone: string;
  @ApiProperty() address: string;
  @ApiProperty() area: string;
  @ApiProperty() city: string;
  @ApiPropertyOptional({ type: LocationDto, nullable: true }) location: LocationDto | null;
  @ApiProperty() slotDurationMinutes: number;
  @ApiProperty({ type: [DayHoursDto] }) hours: DayHoursDto[];
  @ApiProperty({ type: [PublicServiceDto], description: 'Active services only.' }) services: PublicServiceDto[];

  static from(g: GarageWithHours, services: WashService[]): GarageDetailDto {
    return {
      id: g.id, name: g.name, description: g.description, phone: g.phone, address: g.address, area: g.area, city: g.city,
      location: LocationDto.from(g), slotDurationMinutes: g.slotDurationMinutes,
      hours: g.hours.map(DayHoursDto.from), services: services.map(PublicServiceDto.from),
    };
  }
}

export class AvailabilityQueryDto {
  @DateField() date: string;
}

export class AvailableSlotDto {
  @ApiProperty({ example: '09:30' }) time: string;
  @ApiProperty({ description: 'Places left; 0 = full or unavailable (show it greyed out).' }) available: number;
}

export class AvailabilityDto {
  @ApiProperty({ example: '2026-10-22' }) date: string;
  @ApiProperty({ description: 'False if the garage is closed or not taking bookings that day.' }) isOpen: boolean;
  @ApiProperty({ type: [AvailableSlotDto], description: 'Slots that have not started yet.' }) slots: AvailableSlotDto[];

  /** Customers see places left, never why a slot is blocked. */
  static from(d: DaySchedule): AvailabilityDto {
    const open = d.isOpen && !d.blockedReason;
    return {
      date: d.date,
      isOpen: open,
      slots: open ? d.slots.filter((s) => !s.isPast).map((s) => ({ time: s.time, available: s.available })) : [],
    };
  }
}
