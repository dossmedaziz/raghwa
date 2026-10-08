import { OtpCode } from '../core/auth/entities/otp-code.entity';
import { RefreshToken } from '../core/auth/entities/refresh-token.entity';
import { WashService } from '../core/catalog/wash-service.entity';
import { CustomerCar } from '../core/customers/customer-car.entity';
import { Customer } from '../core/customers/customer.entity';
import { GarageHours } from '../core/garages/entities/garage-hours.entity';
import { Garage } from '../core/garages/entities/garage.entity';
import { Notification } from '../core/notifications/notification.entity';
import { Owner } from '../core/owners/owner.entity';
import { ReservationEvent } from '../core/reservations/entities/reservation-event.entity';
import { ReservationLine } from '../core/reservations/entities/reservation-line.entity';
import { Reservation } from '../core/reservations/entities/reservation.entity';
import { DayBlock } from '../core/scheduling/entities/day-block.entity';
import { SlotBlock } from '../core/scheduling/entities/slot-block.entity';

export const ENTITIES = [
  Owner, Customer, CustomerCar, OtpCode, RefreshToken, Garage, GarageHours, WashService, DayBlock, SlotBlock,
  Reservation, ReservationLine, ReservationEvent, Notification,
];
