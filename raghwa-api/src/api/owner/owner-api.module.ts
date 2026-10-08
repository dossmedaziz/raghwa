import { Module } from '@nestjs/common';
import { AuthModule } from '../../core/auth/auth.module';
import { CatalogModule } from '../../core/catalog/catalog.module';
import { GaragesModule } from '../../core/garages/garages.module';
import { NotificationsModule } from '../../core/notifications/notifications.module';
import { OwnersModule } from '../../core/owners/owners.module';
import { ReservationsModule } from '../../core/reservations/reservations.module';
import { SchedulingModule } from '../../core/scheduling/scheduling.module';
import { OwnerAccountController } from './account/owner-account.controller';
import { OwnerAuthController } from './auth/owner-auth.controller';
import { OwnerDashboardController } from './dashboard/owner-dashboard.controller';
import { OwnerGaragesController } from './garages/owner-garages.controller';
import { OwnerNotificationsController } from './notifications/owner-notifications.controller';
import { OwnerReservationsController } from './reservations/owner-reservations.controller';
import { OwnerScheduleController } from './schedule/owner-schedule.controller';
import { OwnerServicesController } from './services/owner-services.controller';

/** Everything garage-web calls: `/v1/owner/...`. Every controller is declared here so Swagger can build the owner spec. */
@Module({
  imports: [AuthModule, OwnersModule, GaragesModule, CatalogModule, SchedulingModule, ReservationsModule, NotificationsModule],
  controllers: [
    OwnerAuthController,
    OwnerAccountController,
    OwnerGaragesController,
    OwnerServicesController,
    OwnerScheduleController,
    OwnerReservationsController,
    OwnerDashboardController,
    OwnerNotificationsController,
  ],
})
export class OwnerApiModule {}
