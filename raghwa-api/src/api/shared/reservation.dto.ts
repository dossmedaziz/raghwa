import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { toTnd } from '../../common/money';
import type { Actor, ReservationStatus } from '../../core/reservations/entities/reservation.entity';
import type { ReservationEventType } from '../../core/reservations/entities/reservation-event.entity';
import type { FullReservation } from '../../core/reservations/reservations.service';

export const RESERVATION_STATUSES: ReservationStatus[] = ['upcoming', 'done', 'cancelled'];

export class ReservationLineDto {
  @ApiPropertyOptional({ nullable: true, type: String, description: 'Null if the service was deleted since.' }) serviceId: string | null;
  @ApiProperty() nameAr: string;
  @ApiProperty() nameFr: string;
  @ApiProperty({ example: 20, description: 'TND, at booking time.' }) price: number;
}

export class CarDto {
  @ApiPropertyOptional({ nullable: true, type: String, example: 'Volkswagen' }) brand: string | null;
  @ApiPropertyOptional({ nullable: true, type: String, example: 'Polo' }) model: string | null;
  @ApiPropertyOptional({ nullable: true, type: String, example: '225 TU 6431' }) plate: string | null;
}

export class ReservationHistoryDto {
  @ApiProperty({ enum: ['booked', 'rescheduled', 'done', 'cancelled'] }) type: ReservationEventType;
  @ApiPropertyOptional({ enum: ['customer', 'garage'], nullable: true, type: String }) actor: Actor | null;
  @ApiPropertyOptional({ nullable: true, type: String, description: 'For "rescheduled": the date before the change.' })
  previousDate: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) previousTime: string | null;
  @ApiProperty() at: Date;
}

/** Fields both apps see. Each app extends it with its own view of the other party. */
export class ReservationBaseDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'RGW-7K3M9Q' }) ref: string;
  @ApiProperty({ example: '2026-10-21' }) date: string;
  @ApiProperty({ example: '09:30' }) time: string;
  @ApiProperty({ enum: RESERVATION_STATUSES }) status: ReservationStatus;
  @ApiPropertyOptional({ enum: ['customer', 'garage'], nullable: true, type: String }) cancelledBy: Actor | null;
  @ApiProperty({ example: 30, description: 'TND. Paid in cash at the garage.' }) total: number;
  @ApiProperty({ type: [ReservationLineDto] }) lines: ReservationLineDto[];
  @ApiPropertyOptional({ type: CarDto, nullable: true }) car: CarDto | null;
  @ApiProperty({ type: [ReservationHistoryDto] }) history: ReservationHistoryDto[];
  @ApiProperty() createdAt: Date;
}

export function reservationBase(r: FullReservation): ReservationBaseDto {
  return {
    id: r.id,
    ref: r.ref,
    date: r.date,
    time: r.time,
    status: r.status,
    cancelledBy: r.cancelledBy,
    total: toTnd(r.totalMillimes),
    lines: r.lines.map((l) => ({ serviceId: l.serviceId, nameAr: l.nameAr, nameFr: l.nameFr, price: toTnd(l.priceMillimes) })),
    car: r.carBrand || r.carModel || r.carPlate ? { brand: r.carBrand, model: r.carModel, plate: r.carPlate } : null,
    history: r.events.map((e) => ({ type: e.type, actor: e.actor, previousDate: e.previousDate, previousTime: e.previousTime, at: e.at })),
    createdAt: r.createdAt,
  };
}
