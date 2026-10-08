import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PhoneField, Trim } from '../../../common/validation/decorators';
import type { Garage, GarageStatus } from '../../../core/garages/entities/garage.entity';
import type { MissingForPublish } from '../../../core/garages/garage-rules';
import type { GarageWithHours } from '../../../core/garages/garages.service';
import { DayHoursDto, LocationDto } from '../../shared/schedule.dto';

const MISSING: MissingForPublish[] = ['name', 'phone', 'address', 'area', 'location', 'hours', 'services'];

/** Every field is optional: drafts are filled in step by step (onboarding). */
export class GarageProfileDto {
  @ApiPropertyOptional({ example: 'Raghwa Wash La Marsa', maxLength: 120 })
  @IsOptional() @Trim() @IsString() @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional() @Trim() @IsString() @MaxLength(1000)
  description?: string;

  @PhoneField({ optional: true, description: 'Contact number shown to customers.' })
  phone?: string;

  @ApiPropertyOptional({ example: 'Avenue Habib Bourguiba', maxLength: 200 })
  @IsOptional() @Trim() @IsString() @MaxLength(200)
  address?: string;

  @ApiPropertyOptional({ example: 'La Marsa', maxLength: 120 })
  @IsOptional() @Trim() @IsString() @MaxLength(120)
  area?: string;

  @ApiPropertyOptional({ example: 'Tunis', maxLength: 60, description: 'Governorate.' })
  @IsOptional() @Trim() @IsString() @MaxLength(60)
  city?: string;

  @ApiPropertyOptional({ example: 36.8782, nullable: true, type: Number, description: 'Set together with longitude; null clears the pin.' })
  @IsOptional() @IsNumber() @Min(-90) @Max(90)
  latitude?: number | null;

  @ApiPropertyOptional({ example: 10.3247, nullable: true, type: Number })
  @IsOptional() @IsNumber() @Min(-180) @Max(180)
  longitude?: number | null;

  @ApiPropertyOptional({ example: 30, minimum: 10, maximum: 240 })
  @IsOptional() @IsInt() @Min(10) @Max(240)
  slotDurationMinutes?: number;

  @ApiPropertyOptional({ example: 3, minimum: 1, maximum: 12, description: 'Cars washed at the same time.' })
  @IsOptional() @IsInt() @Min(1) @Max(12)
  capacity?: number;
}

export class OwnerGarageDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: ['draft', 'published'] }) status: GarageStatus;
  @ApiPropertyOptional({ nullable: true, type: Date }) publishedAt: Date | null;
  @ApiProperty() name: string;
  @ApiProperty() description: string;
  @ApiProperty() phone: string;
  @ApiProperty() address: string;
  @ApiProperty() area: string;
  @ApiProperty() city: string;
  @ApiPropertyOptional({ type: LocationDto, nullable: true }) location: LocationDto | null;
  @ApiProperty() slotDurationMinutes: number;
  @ApiProperty() capacity: number;
  @ApiProperty({ type: [DayHoursDto] }) hours: DayHoursDto[];
  @ApiProperty({ enum: MISSING, isArray: true, description: 'What is still needed before publishing (empty = ready).' })
  missingForPublish: MissingForPublish[];

  static from(g: GarageWithHours, missingForPublish: MissingForPublish[]): OwnerGarageDto {
    return {
      id: g.id,
      status: g.status,
      publishedAt: g.publishedAt,
      name: g.name,
      description: g.description,
      phone: g.phone,
      address: g.address,
      area: g.area,
      city: g.city,
      location: LocationDto.from(g),
      slotDurationMinutes: g.slotDurationMinutes,
      capacity: g.capacity,
      hours: g.hours.map(DayHoursDto.from),
      missingForPublish,
    };
  }
}

/** One card of the garage picker shown after login. */
export class OwnerGarageSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: ['draft', 'published'] }) status: GarageStatus;
  @ApiProperty() name: string;
  @ApiProperty() area: string;
  @ApiProperty() city: string;
  @ApiProperty({ description: 'Non-cancelled reservations today.' }) todayReservations: number;
  @ApiProperty({ description: 'Upcoming reservations from today on.' }) upcomingReservations: number;

  static from(g: Garage, counts: { today: number; upcoming: number } | undefined): OwnerGarageSummaryDto {
    return {
      id: g.id, status: g.status, name: g.name, area: g.area, city: g.city,
      todayReservations: counts?.today ?? 0, upcomingReservations: counts?.upcoming ?? 0,
    };
  }
}
