import { generateSlots, toMinutes, type DayHoursLike } from '../../common/time/time.utils';
import type { BlockReason } from './entities/day-block.entity';

export interface SlotState {
  time: string;
  /** Active (non-cancelled) reservations starting inside this slot. */
  booked: number;
  capacity: number;
  /** Places a customer can still book (0 when blocked, past or full). */
  available: number;
  blockedReason: BlockReason | null;
  isPast: boolean;
}

export interface DaySchedule {
  date: string;
  isOpen: boolean;
  blockedReason: BlockReason | null;
  slots: SlotState[];
}

export interface DayScheduleInput {
  date: string;
  hours: DayHoursLike | undefined;
  slotDurationMinutes: number;
  capacity: number;
  dayBlock: BlockReason | null;
  slotBlocks: ReadonlyMap<string, BlockReason>;
  /** Start times of the day's active reservations. */
  bookedTimes: readonly string[];
  today: string;
  nowTime: string;
}

/**
 * The state of every slot of one day. A reservation counts towards the slot it starts in, so bookings
 * made before a slot-length change still count against the right slot.
 */
export function buildDaySchedule(i: DayScheduleInput): DaySchedule {
  const times = generateSlots(i.hours, i.slotDurationMinutes);
  const now = toMinutes(i.nowTime);
  const slots = times.map((time) => {
    const start = toMinutes(time), end = start + i.slotDurationMinutes;
    const booked = i.bookedTimes.filter((t) => toMinutes(t) >= start && toMinutes(t) < end).length;
    const blockedReason = i.dayBlock ?? i.slotBlocks.get(time) ?? null;
    const isPast = i.date < i.today || (i.date === i.today && start <= now);
    const available = blockedReason || isPast ? 0 : Math.max(0, i.capacity - booked);
    return { time, booked, capacity: i.capacity, available, blockedReason, isPast };
  });
  return { date: i.date, isOpen: times.length > 0, blockedReason: i.dayBlock, slots };
}
