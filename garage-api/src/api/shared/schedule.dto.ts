import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsBoolean, IsIn, ValidateNested } from 'class-validator';
import { DateField, TimeField } from '../../common/validation/decorators';
import type { GarageHours } from '../../core/garages/entities/garage-hours.entity';
import type { DaySchedule } from '../../core/scheduling/day-schedule';
import type { BlockReason } from '../../core/scheduling/entities/day-block.entity';

export const BLOCK_REASONS: BlockReason[] = ['holiday', 'maintenance', 'other'];

/** One day of opening hours in a PUT hours request; the weekday comes from the position in the array. */
export class DayHoursInputDto {
  @ApiProperty() @IsBoolean() isOpen: boolean;
  @TimeField({ example: '08:00' }) opensAt: string;
  @TimeField({ example: '19:00' }) closesAt: string;
  @ApiProperty() @IsBoolean() hasBreak: boolean;
  @TimeField({ example: '13:00' }) breakStart: string;
  @TimeField({ example: '14:00' }) breakEnd: string;
}

export class DayHoursDto extends DayHoursInputDto {
  @ApiProperty({ minimum: 0, maximum: 6, description: '0 = Monday … 6 = Sunday.' })
  dayOfWeek: number;

  static from(h: GarageHours): DayHoursDto {
    return {
      dayOfWeek: h.dayOfWeek, isOpen: h.isOpen, opensAt: h.opensAt, closesAt: h.closesAt,
      hasBreak: h.hasBreak, breakStart: h.breakStart, breakEnd: h.breakEnd,
    };
  }
}

export class WeekHoursDto {
  @ApiProperty({ type: [DayHoursInputDto], minItems: 7, maxItems: 7, description: 'Exactly 7 days, Monday first.' })
  @ValidateNested({ each: true })
  @Type(() => DayHoursInputDto)
  @ArrayMinSize(7) @ArrayMaxSize(7)
  days: DayHoursInputDto[];
}

export class BlockReasonDto {
  @ApiProperty({ enum: BLOCK_REASONS })
  @IsIn(BLOCK_REASONS)
  reason: BlockReason;
}

export class DateRangeQueryDto {
  @DateField({ description: 'First day (inclusive).' }) from: string;
  @DateField({ description: 'Last day (inclusive). At most 31 days after `from`.', example: '2026-10-27' }) to: string;
}

export class SlotStateDto {
  @ApiProperty({ example: '09:30' }) time: string;
  @ApiProperty({ description: 'Active bookings starting in this slot.' }) booked: number;
  @ApiProperty() capacity: number;
  @ApiProperty({ description: 'Places still bookable (0 if blocked, past or full).' }) available: number;
  @ApiPropertyOptional({ enum: BLOCK_REASONS, nullable: true, type: String }) blockedReason: BlockReason | null;
  @ApiProperty() isPast: boolean;
}

export class DayScheduleDto {
  @ApiProperty({ example: '2026-10-21' }) date: string;
  @ApiProperty({ description: 'False when the garage is closed that weekday.' }) isOpen: boolean;
  @ApiPropertyOptional({ enum: BLOCK_REASONS, nullable: true, type: String }) blockedReason: BlockReason | null;
  @ApiProperty({ type: [SlotStateDto] }) slots: SlotStateDto[];

  static from(d: DaySchedule): DayScheduleDto {
    return { date: d.date, isOpen: d.isOpen, blockedReason: d.blockedReason, slots: d.slots.map((s) => ({ ...s })) };
  }
}

export class LocationDto {
  @ApiProperty({ example: 36.8782 }) latitude: number;
  @ApiProperty({ example: 10.3247 }) longitude: number;

  static from(g: { latitude: number | null; longitude: number | null }): LocationDto | null {
    return g.latitude === null || g.longitude === null ? null : { latitude: g.latitude, longitude: g.longitude };
  }
}
