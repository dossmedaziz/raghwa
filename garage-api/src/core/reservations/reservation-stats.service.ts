import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ClockService } from '../../common/clock/clock.service';
import { addDays, dayOfWeek } from '../../common/time/time.utils';
import { Reservation } from './entities/reservation.entity';

export interface GarageDashboardStats {
  today: string;
  todayTotal: number;
  todayUpcoming: number;
  upcomingThisWeek: number;
  doneThisMonth: number;
  /** Expected revenue this month (non-cancelled bookings), in millimes. */
  revenueThisMonthMillimes: number;
  last7Days: { date: string; count: number }[];
}

/** KPI tiles and the 7-day chart of the garage-web dashboard. */
@Injectable()
export class ReservationStatsService {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly clock: ClockService,
  ) {}

  async dashboard(garageId: string): Promise<GarageDashboardStats> {
    const today = this.clock.today();
    const weekEnd = addDays(today, 6 - dayOfWeek(today)); // through Sunday
    const monthStart = today.slice(0, 8) + '01';
    const nextMonthStart = addDays(monthStart, 31).slice(0, 8) + '01'; // day 1 + 31 always lands in the next month
    const chartStart = addDays(today, -6);

    const row = await this.db
      .createQueryBuilder(Reservation, 'r')
      .select(`COUNT(*) FILTER (WHERE r.date = :today AND r.status <> 'cancelled')`, 'todayTotal')
      .addSelect(`COUNT(*) FILTER (WHERE r.date = :today AND r.status = 'upcoming')`, 'todayUpcoming')
      .addSelect(`COUNT(*) FILTER (WHERE r.date BETWEEN :today AND :weekEnd AND r.status = 'upcoming')`, 'upcomingThisWeek')
      .addSelect(`COUNT(*) FILTER (WHERE r.date >= :monthStart AND r.date < :nextMonthStart AND r.status = 'done')`, 'doneThisMonth')
      .addSelect(
        `COALESCE(SUM(r.totalMillimes) FILTER (WHERE r.date >= :monthStart AND r.date < :nextMonthStart AND r.status <> 'cancelled'), 0)`,
        'revenue',
      )
      .where('r.garageId = :garageId', { garageId })
      .setParameters({ today, weekEnd, monthStart, nextMonthStart })
      .getRawOne<Record<'todayTotal' | 'todayUpcoming' | 'upcomingThisWeek' | 'doneThisMonth' | 'revenue', string>>();

    const perDay = await this.db
      .createQueryBuilder(Reservation, 'r')
      .select('r.date', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('r.garageId = :garageId', { garageId })
      .andWhere('r.date BETWEEN :chartStart AND :today', { chartStart, today })
      .andWhere(`r.status <> 'cancelled'`)
      .groupBy('r.date')
      .getRawMany<{ date: string; count: string }>();
    const counts = new Map(perDay.map((d) => [d.date, Number(d.count)]));

    return {
      today,
      todayTotal: Number(row?.todayTotal ?? 0),
      todayUpcoming: Number(row?.todayUpcoming ?? 0),
      upcomingThisWeek: Number(row?.upcomingThisWeek ?? 0),
      doneThisMonth: Number(row?.doneThisMonth ?? 0),
      revenueThisMonthMillimes: Number(row?.revenue ?? 0),
      last7Days: Array.from({ length: 7 }, (_, i) => {
        const date = addDays(chartStart, i);
        return { date, count: counts.get(date) ?? 0 };
      }),
    };
  }
}
