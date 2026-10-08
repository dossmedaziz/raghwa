import { Module } from '@nestjs/common';
import { AuthModule } from '../../core/auth/auth.module';
import { CatalogModule } from '../../core/catalog/catalog.module';
import { CustomersModule } from '../../core/customers/customers.module';
import { GaragesModule } from '../../core/garages/garages.module';
import { ReservationsModule } from '../../core/reservations/reservations.module';
import { SchedulingModule } from '../../core/scheduling/scheduling.module';
import { CustomerAccountController } from './account/customer-account.controller';
import { CustomerAuthController } from './auth/customer-auth.controller';
import { CustomerGaragesController } from './garages/customer-garages.controller';
import { CustomerReservationsController } from './reservations/customer-reservations.controller';

/** Everything the mobile app calls: `/v1/...` (no `/owner`). */
@Module({
  imports: [AuthModule, CustomersModule, GaragesModule, CatalogModule, SchedulingModule, ReservationsModule],
  controllers: [CustomerAuthController, CustomerAccountController, CustomerGaragesController, CustomerReservationsController],
})
export class CustomerApiModule {}
