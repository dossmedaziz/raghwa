import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Put, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags,
  ApiUnauthorizedResponse, ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/dto/error.dto';
import { ParseDatePipe, ParseTimePipe } from '../../../common/pipes/params.pipes';
import { OwnerAuthGuard } from '../../../core/auth/guards/access-token.guard';
import { GarageOwnershipGuard } from '../../../core/garages/garage-ownership.guard';
import { SchedulingService } from '../../../core/scheduling/scheduling.service';
import { BlockReasonDto, DateRangeQueryDto, DayScheduleDto } from '../../shared/schedule.dto';
import { BlocksDto, DayBlockDto, SlotBlockDto } from './owner-schedule.dto';

@ApiTags('Owner · Schedule')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto, description: '`GARAGE_NOT_FOUND`' })
@UseGuards(OwnerAuthGuard, GarageOwnershipGuard)
@Controller('v1/owner/garages/:garageId')
export class OwnerScheduleController {
  constructor(private readonly scheduling: SchedulingService) {}

  @Get('schedule')
  @ApiOperation({ summary: 'Slot occupancy per day', description: 'Every slot with bookings, capacity, blocks. Max 31 days.' })
  @ApiOkResponse({ type: [DayScheduleDto] })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto, description: '`INVALID_RANGE`, `RANGE_TOO_LONG`' })
  async schedule(@Param('garageId') garageId: string, @Query() q: DateRangeQueryDto): Promise<DayScheduleDto[]> {
    this.scheduling.assertRange(q.from, q.to);
    return (await this.scheduling.getSchedule(garageId, q.from, q.to)).map(DayScheduleDto.from);
  }

  @Get('blocks')
  @ApiOperation({ summary: 'Blocked days and slots in a date range' })
  @ApiOkResponse({ type: BlocksDto })
  async blocks(@Param('garageId') garageId: string, @Query() q: DateRangeQueryDto): Promise<BlocksDto> {
    this.scheduling.assertRange(q.from, q.to);
    const { days, slots } = await this.scheduling.listBlocks(garageId, q.from, q.to);
    return { days: days.map(DayBlockDto.from), slots: slots.map(SlotBlockDto.from) };
  }

  @Put('blocks/days/:date')
  @ApiOperation({ summary: 'Block a whole day', description: 'Idempotent. Existing bookings stay; call those customers.' })
  @ApiParam({ name: 'date', example: '2026-10-27' })
  @ApiOkResponse({ type: DayBlockDto })
  async blockDay(
    @Param('garageId') garageId: string,
    @Param('date', ParseDatePipe) date: string,
    @Body() dto: BlockReasonDto,
  ): Promise<DayBlockDto> {
    return DayBlockDto.from(await this.scheduling.blockDay(garageId, date, dto.reason));
  }

  @Delete('blocks/days/:date')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unblock a day' })
  @ApiParam({ name: 'date', example: '2026-10-27' })
  @ApiNoContentResponse()
  async unblockDay(@Param('garageId') garageId: string, @Param('date', ParseDatePipe) date: string): Promise<void> {
    await this.scheduling.unblockDay(garageId, date);
  }

  @Put('blocks/slots/:date/:time')
  @ApiOperation({ summary: 'Block one slot' })
  @ApiParam({ name: 'date', example: '2026-10-23' })
  @ApiParam({ name: 'time', example: '17:30' })
  @ApiOkResponse({ type: SlotBlockDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto, description: '`NOT_A_SLOT`' })
  async blockSlot(
    @Param('garageId') garageId: string,
    @Param('date', ParseDatePipe) date: string,
    @Param('time', ParseTimePipe) time: string,
    @Body() dto: BlockReasonDto,
  ): Promise<SlotBlockDto> {
    return SlotBlockDto.from(await this.scheduling.blockSlot(garageId, date, time, dto.reason));
  }

  @Delete('blocks/slots/:date/:time')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unblock one slot' })
  @ApiParam({ name: 'date', example: '2026-10-23' })
  @ApiParam({ name: 'time', example: '17:30' })
  @ApiNoContentResponse()
  async unblockSlot(
    @Param('garageId') garageId: string,
    @Param('date', ParseDatePipe) date: string,
    @Param('time', ParseTimePipe) time: string,
  ): Promise<void> {
    await this.scheduling.unblockSlot(garageId, date, time);
  }
}
