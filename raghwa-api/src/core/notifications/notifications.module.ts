import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GaragesModule } from '../garages/garages.module';
import { PushModule } from '../push/push.module';
import { Notification } from './notification.entity';
import { NotificationsService } from './notifications.service';
import { ReservationNotificationsListener } from './reservation-notifications.listener';

@Module({
  imports: [TypeOrmModule.forFeature([Notification]), GaragesModule, PushModule],
  providers: [NotificationsService, ReservationNotificationsListener],
  exports: [NotificationsService],
})
export class NotificationsModule {}
