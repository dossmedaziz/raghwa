import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth, ApiConflictResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/dto/error.dto';
import { PageMetaDto } from '../../../common/dto/pagination.dto';
import { OwnerAuthGuard } from '../../../core/auth/guards/access-token.guard';
import { GarageOwnershipGuard } from '../../../core/garages/garage-ownership.guard';
import { ReservationsService } from '../../../core/reservations/reservations.service';
import { OwnerReservationDto, OwnerReservationPageDto, OwnerReservationQueryDto } from './owner-reservations.dto';

@ApiTags('Owner · Reservations')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto, description: '`GARAGE_NOT_FOUND`, `RESERVATION_NOT_FOUND`' })
@UseGuards(OwnerAuthGuard, GarageOwnershipGuard)
@Controller('v1/owner/garages/:garageId/reservations')
export class OwnerReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Get()
  @ApiOperation({ summary: 'Search the garage’s reservations', description: 'Filters combine; newest first by default.' })
  @ApiOkResponse({ type: OwnerReservationPageDto })
  async list(@Param('garageId') garageId: string, @Query() q: OwnerReservationQueryDto): Promise<OwnerReservationPageDto> {
    const { items, total } = await this.reservations.listForGarage(garageId, {
      status: q.status, q: q.q, serviceId: q.serviceId, from: q.from, to: q.to, order: q.order, skip: q.skip, take: q.limit,
    });
    return { items: items.map(OwnerReservationDto.from), meta: PageMetaDto.of(q, total) };
  }

  @Get(':reservationId')
  @ApiOperation({ summary: 'Reservation details with history' })
  @ApiOkResponse({ type: OwnerReservationDto })
  async get(
    @Param('garageId') garageId: string,
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
  ): Promise<OwnerReservationDto> {
    return OwnerReservationDto.from(await this.reservations.getForGarage(garageId, reservationId));
  }

  @Post(':reservationId/done')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark as done (the wash is finished)' })
  @ApiOkResponse({ type: OwnerReservationDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: '`RESERVATION_NOT_UPCOMING`' })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto, description: '`RESERVATION_IN_FUTURE`' })
  async done(
    @Param('garageId') garageId: string,
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
  ): Promise<OwnerReservationDto> {
    return OwnerReservationDto.from(await this.reservations.markDone(garageId, reservationId));
  }

  @Post(':reservationId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel on behalf of the garage', description: 'The customer is notified by SMS.' })
  @ApiOkResponse({ type: OwnerReservationDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: '`RESERVATION_NOT_UPCOMING`' })
  async cancel(
    @Param('garageId') garageId: string,
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
  ): Promise<OwnerReservationDto> {
    return OwnerReservationDto.from(await this.reservations.cancelByGarage(garageId, reservationId));
  }
}
