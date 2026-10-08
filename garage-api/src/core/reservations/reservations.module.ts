import { Module } from '@nestjs/common';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { ReservationStatsService } from './reservation-stats.service';
import { ReservationsService } from './reservations.service';

@Module({
  imports: [SchedulingModule],
  providers: [ReservationsService, ReservationStatsService],
  exports: [ReservationsService, ReservationStatsService],
})
export class ReservationsModule {}
