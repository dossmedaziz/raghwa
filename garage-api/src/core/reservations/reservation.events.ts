import type { Actor } from './entities/reservation.entity';

export const RESERVATION_CREATED = 'reservation.created';
export const RESERVATION_CANCELLED = 'reservation.cancelled';
export const RESERVATION_RESCHEDULED = 'reservation.rescheduled';

/** Emitted after the transaction commits. Listeners (notifications, SMS) must never make the request fail. */
export interface ReservationChangedEvent {
  reservationId: string;
  garageId: string;
  ref: string;
  customerName: string | null;
  customerPhone: string;
  date: string;
  time: string;
  actor: Actor;
  previousDate?: string;
  previousTime?: string;
}
