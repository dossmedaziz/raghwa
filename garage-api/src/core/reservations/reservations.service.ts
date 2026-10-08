import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectDataSource } from '@nestjs/typeorm';
import { Brackets, DataSource, In, type EntityManager } from 'typeorm';
import { ClockService } from '../../common/clock/clock.service';
import { conflict, notFound, unprocessable } from '../../common/errors/domain.exception';
import { toMinutes } from '../../common/time/time.utils';
import { WashService } from '../catalog/wash-service.entity';
import { Customer } from '../customers/customer.entity';
import { Garage } from '../garages/entities/garage.entity';
import { SchedulingService } from '../scheduling/scheduling.service';
import { ReservationEvent } from './entities/reservation-event.entity';
import { ReservationLine } from './entities/reservation-line.entity';
import { Reservation, type Actor, type ReservationStatus } from './entities/reservation.entity';
import { newReservationRef } from './reservation-ref';
import {
  RESERVATION_CANCELLED, RESERVATION_CREATED, RESERVATION_RESCHEDULED, type ReservationChangedEvent,
} from './reservation.events';

export interface BookingRequest {
  garageId: string;
  date: string;
  time: string;
  serviceIds: string[];
  car?: { brand?: string; model?: string; plate?: string } | null;
}

export interface GarageReservationFilter {
  status?: ReservationStatus;
  q?: string;
  serviceId?: string;
  from?: string;
  to?: string;
  order: 'asc' | 'desc';
  skip: number;
  take: number;
}

export type FullReservation = Reservation & { lines: ReservationLine[]; events: ReservationEvent[]; customer: Customer; garage: Garage };

const EVENT_RANK: Record<ReservationEvent['type'], number> = { booked: 0, rescheduled: 1, done: 2, cancelled: 2 };

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => '\\' + c);

@Injectable()
export class ReservationsService {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly scheduling: SchedulingService,
    private readonly clock: ClockService,
    private readonly events: EventEmitter2,
  ) {}

  /* ───────── customer actions ───────── */

  async book(customerId: string, req: BookingRequest): Promise<FullReservation> {
    const serviceIds = [...new Set(req.serviceIds)];
    const id = await this.db.transaction(async (m) => {
      // Locking the garage row serialises bookings per garage: the capacity check below cannot race.
      const garage = await m.findOne(Garage, { where: { id: req.garageId }, lock: { mode: 'pessimistic_write' } });
      if (!garage || garage.status !== 'published') throw notFound('GARAGE_NOT_FOUND', 'Garage not found');

      await this.scheduling.assertBookable(m, garage.id, req.date, req.time);

      const duplicate = await m.existsBy(Reservation, {
        garageId: garage.id, customerId, date: req.date, time: req.time, status: 'upcoming',
      });
      if (duplicate) throw conflict('DUPLICATE_BOOKING', 'You already have a booking in this slot');

      const services = await m.findBy(WashService, { garageId: garage.id, id: In(serviceIds), isActive: true });
      if (services.length !== serviceIds.length) {
        const found = new Set(services.map((s) => s.id));
        throw unprocessable('INVALID_SERVICES', 'Some services are not offered by this garage', {
          serviceIds: serviceIds.filter((sid) => !found.has(sid)),
        });
      }

      const reservation = m.create(Reservation, {
        ref: newReservationRef(),
        garageId: garage.id,
        customerId,
        date: req.date,
        time: req.time,
        status: 'upcoming',
        cancelledBy: null,
        totalMillimes: services.reduce((sum, s) => sum + s.priceMillimes, 0),
        carBrand: req.car?.brand || null,
        carModel: req.car?.model || null,
        carPlate: req.car?.plate || null,
        lines: services.map((s) =>
          m.create(ReservationLine, { serviceId: s.id, nameAr: s.nameAr, nameFr: s.nameFr, priceMillimes: s.priceMillimes }),
        ),
        events: [m.create(ReservationEvent, { type: 'booked', actor: 'customer', at: this.clock.now() })],
      });
      return (await m.save(reservation)).id;
    });

    const full = await this.load(id);
    await this.emit(RESERVATION_CREATED, full, 'customer');
    return full;
  }

  async reschedule(customerId: string, reservationId: string, date: string, time: string): Promise<FullReservation> {
    const previous = await this.db.transaction(async (m) => {
      const current = await this.findOwnedByCustomer(m, customerId, reservationId);
      await m.findOne(Garage, { where: { id: current.garageId }, lock: { mode: 'pessimistic_write' } });
      // Re-read after the lock so a concurrent cancel is seen.
      const r = await this.findOwnedByCustomer(m, customerId, reservationId);
      this.assertChangeable(r);
      if (r.date === date && r.time === time) throw unprocessable('SAME_SLOT', 'The reservation is already in this slot');

      await this.scheduling.assertBookable(m, r.garageId, date, time, r.id);
      await m.update(Reservation, { id: r.id }, { date, time });
      await m.insert(ReservationEvent, {
        reservationId: r.id, type: 'rescheduled', actor: 'customer', previousDate: r.date, previousTime: r.time, at: this.clock.now(),
      });
      return { date: r.date, time: r.time };
    });

    const full = await this.load(reservationId);
    await this.emit(RESERVATION_RESCHEDULED, full, 'customer', previous);
    return full;
  }

  async cancelByCustomer(customerId: string, reservationId: string): Promise<FullReservation> {
    const r = await this.findOwnedByCustomer(this.db.manager, customerId, reservationId);
    this.assertChangeable(r);
    return this.cancel(r, 'customer');
  }

  getForCustomer(customerId: string, reservationId: string): Promise<FullReservation> {
    return this.load(reservationId, { customerId });
  }

  /** `upcoming`: still to come, soonest first. `past`: done, cancelled or already passed, most recent first. */
  async listForCustomer(customerId: string, scope: 'upcoming' | 'past', skip: number, take: number) {
    const today = this.clock.today();
    const qb = this.fullQuery().where('r.customerId = :customerId', { customerId });
    if (scope === 'upcoming') {
      qb.andWhere('r.status = :up AND r.date >= :today', { up: 'upcoming', today }).orderBy('r.date', 'ASC').addOrderBy('r.time', 'ASC');
    } else {
      qb.andWhere(new Brackets((w) => w.where('r.status <> :up', { up: 'upcoming' }).orWhere('r.date < :today', { today })))
        .orderBy('r.date', 'DESC')
        .addOrderBy('r.time', 'DESC');
    }
    const [items, total] = await qb.skip(skip).take(take).getManyAndCount();
    return { items: items.map((r) => this.sortEvents(r)), total };
  }

  /* ───────── garage (owner) actions ───────── */

  getForGarage(garageId: string, reservationId: string): Promise<FullReservation> {
    return this.load(reservationId, { garageId });
  }

  async listForGarage(garageId: string, f: GarageReservationFilter) {
    const qb = this.fullQuery().where('r.garageId = :garageId', { garageId });
    if (f.status) qb.andWhere('r.status = :status', { status: f.status });
    if (f.from) qb.andWhere('r.date >= :from', { from: f.from });
    if (f.to) qb.andWhere('r.date <= :to', { to: f.to });
    if (f.serviceId) {
      qb.andWhere('EXISTS (SELECT 1 FROM reservation_lines x WHERE x.reservation_id = r.id AND x.service_id = :serviceId)', {
        serviceId: f.serviceId,
      });
    }
    if (f.q) {
      const q = `%${escapeLike(f.q)}%`;
      qb.andWhere(new Brackets((w) => w.where('c.name ILIKE :q', { q }).orWhere('c.phone LIKE :q', { q }).orWhere('r.ref ILIKE :q', { q })));
    }
    const dir = f.order === 'asc' ? 'ASC' : 'DESC';
    qb.orderBy('r.date', dir).addOrderBy('r.time', dir).addOrderBy('r.id', 'ASC');
    const [items, total] = await qb.skip(f.skip).take(f.take).getManyAndCount();
    return { items: items.map((r) => this.sortEvents(r)), total };
  }

  async cancelByGarage(garageId: string, reservationId: string): Promise<FullReservation> {
    const r = await this.load(reservationId, { garageId });
    if (r.status !== 'upcoming') throw conflict('RESERVATION_NOT_UPCOMING', 'Only upcoming reservations can be cancelled');
    return this.cancel(r, 'garage');
  }

  async markDone(garageId: string, reservationId: string): Promise<FullReservation> {
    const r = await this.load(reservationId, { garageId });
    if (r.status !== 'upcoming') throw conflict('RESERVATION_NOT_UPCOMING', 'Only upcoming reservations can be marked done');
    if (r.date > this.clock.today()) throw unprocessable('RESERVATION_IN_FUTURE', 'A future reservation cannot be marked done yet');
    await this.db.transaction(async (m) => {
      await m.update(Reservation, { id: r.id, status: 'upcoming' }, { status: 'done' });
      await m.insert(ReservationEvent, { reservationId: r.id, type: 'done', actor: 'garage', at: this.clock.now() });
    });
    return this.load(r.id);
  }

  /** Today's and upcoming counts per garage, for the garage picker. */
  async countsForGarages(garageIds: string[]): Promise<Map<string, { today: number; upcoming: number }>> {
    const out = new Map(garageIds.map((id) => [id, { today: 0, upcoming: 0 }]));
    if (!garageIds.length) return out;
    const today = this.clock.today();
    const rows = await this.db
      .createQueryBuilder(Reservation, 'r')
      .select('r.garageId', 'garageId')
      .addSelect(`COUNT(*) FILTER (WHERE r.date = :today AND r.status <> 'cancelled')`, 'today')
      .addSelect(`COUNT(*) FILTER (WHERE r.date >= :today AND r.status = 'upcoming')`, 'upcoming')
      .where('r.garageId IN (:...ids)', { ids: garageIds })
      .setParameter('today', today)
      .groupBy('r.garageId')
      .getRawMany<{ garageId: string; today: string; upcoming: string }>();
    for (const row of rows) out.set(row.garageId, { today: Number(row.today), upcoming: Number(row.upcoming) });
    return out;
  }

  /* ───────── internals ───────── */

  private async cancel(r: Reservation, by: Actor): Promise<FullReservation> {
    const changed = await this.db.transaction(async (m) => {
      const { affected } = await m.update(Reservation, { id: r.id, status: 'upcoming' }, { status: 'cancelled', cancelledBy: by });
      if (!affected) return false;
      await m.insert(ReservationEvent, { reservationId: r.id, type: 'cancelled', actor: by, at: this.clock.now() });
      return true;
    });
    if (!changed) throw conflict('RESERVATION_NOT_UPCOMING', 'Only upcoming reservations can be cancelled');
    const full = await this.load(r.id);
    await this.emit(RESERVATION_CANCELLED, full, by);
    return full;
  }

  /** Customers can change a booking only while it is upcoming and has not started. */
  private assertChangeable(r: Reservation) {
    if (r.status !== 'upcoming') throw conflict('RESERVATION_NOT_UPCOMING', 'This reservation can no longer be changed');
    const today = this.clock.today();
    const started = r.date < today || (r.date === today && toMinutes(r.time) <= toMinutes(this.clock.currentTime()));
    if (started) throw unprocessable('RESERVATION_STARTED', 'This reservation has already started');
  }

  private async findOwnedByCustomer(m: EntityManager, customerId: string, id: string): Promise<Reservation> {
    const r = await m.findOneBy(Reservation, { id, customerId });
    if (!r) throw notFound('RESERVATION_NOT_FOUND', 'Reservation not found');
    return r;
  }

  private fullQuery() {
    return this.db
      .createQueryBuilder(Reservation, 'r')
      .innerJoinAndSelect('r.customer', 'c')
      .innerJoinAndSelect('r.garage', 'g')
      .leftJoinAndSelect('r.lines', 'l')
      .leftJoinAndSelect('r.events', 'e');
  }

  private async load(id: string, scope: { customerId?: string; garageId?: string } = {}): Promise<FullReservation> {
    const r = await this.db.manager.findOne(Reservation, {
      where: { id, ...scope },
      relations: { lines: true, events: true, customer: true, garage: true },
    });
    if (!r) throw notFound('RESERVATION_NOT_FOUND', 'Reservation not found');
    return this.sortEvents(r);
  }

  private sortEvents(r: Reservation): FullReservation {
    // Chronological; same-instant entries fall back to their natural order (booked → rescheduled → done/cancelled).
    r.events = (r.events ?? []).sort((a, b) => a.at.getTime() - b.at.getTime() || EVENT_RANK[a.type] - EVENT_RANK[b.type]);
    r.lines = r.lines ?? [];
    return r as FullReservation;
  }

  private async emit(name: string, r: FullReservation, actor: Actor, previous?: { date: string; time: string }) {
    const event: ReservationChangedEvent = {
      reservationId: r.id,
      garageId: r.garageId,
      ref: r.ref,
      customerName: r.customer.name,
      customerPhone: r.customer.phone,
      date: r.date,
      time: r.time,
      actor,
      ...(previous ? { previousDate: previous.date, previousTime: previous.time } : {}),
    };
    await this.events.emitAsync(name, event);
  }
}
