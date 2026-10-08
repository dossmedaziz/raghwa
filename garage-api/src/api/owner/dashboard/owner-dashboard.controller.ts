import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ClockService } from '../../../common/clock/clock.service';
import { ErrorResponseDto } from '../../../common/dto/error.dto';
import { toTnd } from '../../../common/money';
import { OwnerAuthGuard } from '../../../core/auth/guards/access-token.guard';
import { GarageOwnershipGuard } from '../../../core/garages/garage-ownership.guard';
import { ReservationStatsService } from '../../../core/reservations/reservation-stats.service';
import { ReservationsService } from '../../../core/reservations/reservations.service';
import { OwnerReservationDto } from '../reservations/owner-reservations.dto';
import { OwnerDashboardDto } from './owner-dashboard.dto';

@ApiTags('Owner · Dashboard')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto, description: '`GARAGE_NOT_FOUND`' })
@UseGuards(OwnerAuthGuard, GarageOwnershipGuard)
@Controller('v1/owner/garages/:garageId/dashboard')
export class OwnerDashboardController {
  constructor(
    private readonly stats: ReservationStatsService,
    private readonly reservations: ReservationsService,
    private readonly clock: ClockService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'KPIs, 7-day chart and next reservations', description: 'Use GET …/schedule for today’s slot timeline.' })
  @ApiOkResponse({ type: OwnerDashboardDto })
  async get(@Param('garageId') garageId: string): Promise<OwnerDashboardDto> {
    const s = await this.stats.dashboard(garageId);
    const next = await this.reservations.listForGarage(garageId, {
      status: 'upcoming', from: this.clock.today(), order: 'asc', skip: 0, take: 5,
    });
    return {
      today: s.today,
      todayTotal: s.todayTotal,
      todayUpcoming: s.todayUpcoming,
      upcomingThisWeek: s.upcomingThisWeek,
      doneThisMonth: s.doneThisMonth,
      revenueThisMonth: toTnd(s.revenueThisMonthMillimes),
      last7Days: s.last7Days,
      nextReservations: next.items.map(OwnerReservationDto.from),
    };
  }
}
