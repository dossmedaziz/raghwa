import { ApiProperty } from '@nestjs/swagger';
import { OwnerReservationDto } from '../reservations/owner-reservations.dto';

export class DayCountDto {
  @ApiProperty({ example: '2026-10-21' }) date: string;
  @ApiProperty({ example: 14 }) count: number;
}

export class OwnerDashboardDto {
  @ApiProperty({ example: '2026-10-21', description: 'Today in the garage’s time zone.' }) today: string;
  @ApiProperty({ description: 'Non-cancelled reservations today.' }) todayTotal: number;
  @ApiProperty({ description: 'Of which still to come.' }) todayUpcoming: number;
  @ApiProperty({ description: 'Upcoming from today through Sunday.' }) upcomingThisWeek: number;
  @ApiProperty() doneThisMonth: number;
  @ApiProperty({ example: 2890, description: 'Expected revenue this month in TND (non-cancelled bookings).' })
  revenueThisMonth: number;
  @ApiProperty({ type: [DayCountDto], description: 'Bookings per day, oldest first, ending today.' }) last7Days: DayCountDto[];
  @ApiProperty({ type: [OwnerReservationDto], description: 'The next 5 upcoming reservations.' })
  nextReservations: OwnerReservationDto[];
}
