import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Between, DataSource, Not, type EntityManager } from 'typeorm';
import { ClockService } from '../../common/clock/clock.service';
import { conflict, notFound, unprocessable } from '../../common/errors/domain.exception';
import { addDays, dayOfWeek, daysBetween, generateSlots } from '../../common/time/time.utils';
import { GarageHours } from '../garages/entities/garage-hours.entity';
import { Garage } from '../garages/entities/garage.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { buildDaySchedule, type DaySchedule, type SlotState } from './day-schedule';
import { DayBlock, type BlockReason } from './entities/day-block.entity';
import { SlotBlock } from './entities/slot-block.entity';

/** How far ahead customers can book, and the longest range one schedule request may cover. */
export const BOOKING_WINDOW_DAYS = 60;
export const MAX_RANGE_DAYS = 31;

/**
 * Opening hours + blocks + existing bookings → which slots can be booked.
 * Reads reservations directly (read-only) so both ReservationsModule and the schedule screens share one engine.
 */
@Injectable()
export class SchedulingService {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly clock: ClockService,
  ) {}

  assertRange(from: string, to: string) {
    const span = daysBetween(from, to);
    if (span < 0) throw unprocessable('INVALID_RANGE', '`to` must not be before `from`');
    if (span >= MAX_RANGE_DAYS) throw unprocessable('RANGE_TOO_LONG', `A range can cover at most ${MAX_RANGE_DAYS} days`);
  }

  /** Day-by-day schedule. Pass the transaction's manager when the result must be consistent with a write. */
  async getSchedule(
    garageId: string,
    from: string,
    to: string,
    opts: { manager?: EntityManager; excludeReservationId?: string } = {},
  ): Promise<DaySchedule[]> {
    const m = opts.manager ?? this.db.manager;
    const garage = await m.findOneBy(Garage, { id: garageId });
    if (!garage) throw notFound('GARAGE_NOT_FOUND', 'Garage not found');

    // Sequential on purpose: inside a transaction all queries share one connection.
    const hours = await m.findBy(GarageHours, { garageId });
    const dayBlocks = await m.findBy(DayBlock, { garageId, date: Between(from, to) });
    const slotBlocks = await m.findBy(SlotBlock, { garageId, date: Between(from, to) });
    const bookings = await m.find(Reservation, {
      select: { id: true, date: true, time: true },
      where: {
        garageId,
        date: Between(from, to),
        status: Not('cancelled' as const),
        ...(opts.excludeReservationId ? { id: Not(opts.excludeReservationId) } : {}),
      },
    });

    const today = this.clock.today(), nowTime = this.clock.currentTime();
    const days: DaySchedule[] = [];
    for (let date = from; date <= to; date = addDays(date, 1)) {
      days.push(
        buildDaySchedule({
          date,
          hours: hours.find((h) => h.dayOfWeek === dayOfWeek(date)),
          slotDurationMinutes: garage.slotDurationMinutes,
          capacity: garage.capacity,
          dayBlock: dayBlocks.find((b) => b.date === date)?.reason ?? null,
          slotBlocks: new Map(slotBlocks.filter((b) => b.date === date).map((b) => [b.time, b.reason])),
          bookedTimes: bookings.filter((r) => r.date === date).map((r) => r.time),
          today,
          nowTime,
        }),
      );
    }
    return days;
  }

  /**
   * Throws a precise error if a customer cannot book `date time` right now. Call inside the booking
   * transaction, after locking the garage row, so two customers cannot both take the last place.
   */
  async assertBookable(manager: EntityManager, garageId: string, date: string, time: string, excludeReservationId?: string): Promise<SlotState> {
    const today = this.clock.today();
    if (date < today) throw unprocessable('SLOT_IN_PAST', 'This slot is in the past');
    if (daysBetween(today, date) > BOOKING_WINDOW_DAYS) {
      throw unprocessable('BOOKING_TOO_FAR', `Bookings open ${BOOKING_WINDOW_DAYS} days ahead`);
    }

    const [day] = await this.getSchedule(garageId, date, date, { manager, excludeReservationId });
    if (!day.isOpen) throw unprocessable('GARAGE_CLOSED', 'The garage is closed on this day');
    if (day.blockedReason) throw unprocessable('DAY_BLOCKED', 'The garage is not taking bookings on this day');
    const slot = day.slots.find((s) => s.time === time);
    if (!slot) throw unprocessable('NOT_A_SLOT', 'This time is not one of the garage’s slots');
    if (slot.isPast) throw unprocessable('SLOT_IN_PAST', 'This slot is in the past');
    if (slot.blockedReason) throw unprocessable('SLOT_BLOCKED', 'This slot is not available');
    if (slot.available < 1) throw conflict('SLOT_FULL', 'This slot is fully booked');
    return slot;
  }

  /* ───────── blocks (owner) ───────── */

  async listBlocks(garageId: string, from: string, to: string): Promise<{ days: DayBlock[]; slots: SlotBlock[] }> {
    const days = await this.db.manager.find(DayBlock, { where: { garageId, date: Between(from, to) }, order: { date: 'ASC' } });
    const slots = await this.db.manager.find(SlotBlock, {
      where: { garageId, date: Between(from, to) },
      order: { date: 'ASC', time: 'ASC' },
    });
    return { days, slots };
  }

  /** Blocking is idempotent: blocking again only updates the reason. Existing bookings are kept (the owner calls them). */
  async blockDay(garageId: string, date: string, reason: BlockReason): Promise<DayBlock> {
    await this.db.manager.upsert(DayBlock, { garageId, date, reason }, { conflictPaths: ['garageId', 'date'] });
    return this.db.manager.findOneByOrFail(DayBlock, { garageId, date });
  }

  async unblockDay(garageId: string, date: string): Promise<void> {
    await this.db.manager.delete(DayBlock, { garageId, date });
  }

  async blockSlot(garageId: string, date: string, time: string, reason: BlockReason): Promise<SlotBlock> {
    const garage = await this.db.manager.findOneByOrFail(Garage, { id: garageId });
    const hours = await this.db.manager.findOneBy(GarageHours, { garageId, dayOfWeek: dayOfWeek(date) });
    if (!generateSlots(hours ?? undefined, garage.slotDurationMinutes).includes(time)) {
      throw unprocessable('NOT_A_SLOT', 'This time is not one of the garage’s slots on that day');
    }
    await this.db.manager.upsert(SlotBlock, { garageId, date, time, reason }, { conflictPaths: ['garageId', 'date', 'time'] });
    return this.db.manager.findOneByOrFail(SlotBlock, { garageId, date, time });
  }

  async unblockSlot(garageId: string, date: string, time: string): Promise<void> {
    await this.db.manager.delete(SlotBlock, { garageId, date, time });
  }
}
