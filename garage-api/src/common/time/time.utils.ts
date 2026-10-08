/** Date and slot helpers. Dates are "YYYY-MM-DD" strings and times "HH:MM" strings, always in the garage's local time. */

export const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "HH:MM" → minutes since midnight. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Minutes since midnight → "HH:MM". */
export function toTime(minutes: number): string {
  return String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
}

function parseDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** True for a well-formed date that exists in the calendar (rejects 2026-02-30). */
export function isValidDate(date: string): boolean {
  return DATE_RE.test(date) && parseDate(date).toISOString().slice(0, 10) === date;
}

export function addDays(date: string, days: number): string {
  const x = parseDate(date);
  x.setUTCDate(x.getUTCDate() + days);
  return x.toISOString().slice(0, 10);
}

/** Day of week with Monday = 0 … Sunday = 6 (same convention as garage-web). */
export function dayOfWeek(date: string): number {
  return (parseDate(date).getUTCDay() + 6) % 7;
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000);
}

export interface DayHoursLike {
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
  hasBreak: boolean;
  breakStart: string;
  breakEnd: string;
}

/** Slot start times for one day: back-to-back slots inside opening hours, skipping any that overlap the break. */
export function generateSlots(hours: DayHoursLike | undefined, durationMinutes: number): string[] {
  const out: string[] = [];
  if (!hours || !hours.isOpen || durationMinutes <= 0) return out;
  const open = toMinutes(hours.opensAt), close = toMinutes(hours.closesAt);
  const bStart = toMinutes(hours.breakStart), bEnd = toMinutes(hours.breakEnd);
  for (let m = open; m + durationMinutes <= close; m += durationMinutes) {
    if (hours.hasBreak && m < bEnd && m + durationMinutes > bStart) continue;
    out.push(toTime(m));
  }
  return out;
}
