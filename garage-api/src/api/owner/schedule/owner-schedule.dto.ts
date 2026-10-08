import { ApiProperty } from '@nestjs/swagger';
import type { DayBlock, BlockReason } from '../../../core/scheduling/entities/day-block.entity';
import type { SlotBlock } from '../../../core/scheduling/entities/slot-block.entity';
import { BLOCK_REASONS } from '../../shared/schedule.dto';

export class DayBlockDto {
  @ApiProperty({ example: '2026-10-27' }) date: string;
  @ApiProperty({ enum: BLOCK_REASONS }) reason: BlockReason;

  static from(b: DayBlock): DayBlockDto {
    return { date: b.date, reason: b.reason };
  }
}

export class SlotBlockDto {
  @ApiProperty({ example: '2026-10-23' }) date: string;
  @ApiProperty({ example: '17:30' }) time: string;
  @ApiProperty({ enum: BLOCK_REASONS }) reason: BlockReason;

  static from(b: SlotBlock): SlotBlockDto {
    return { date: b.date, time: b.time, reason: b.reason };
  }
}

export class BlocksDto {
  @ApiProperty({ type: [DayBlockDto] }) days: DayBlockDto[];
  @ApiProperty({ type: [SlotBlockDto] }) slots: SlotBlockDto[];
}
