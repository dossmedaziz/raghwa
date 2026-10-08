import { Injectable } from '@nestjs/common';

/**
 * The single source of "now". Everything time-based (today's date, past slots, OTP expiry) goes through here,
 * so tests can freeze time by overriding this provider.
 */
@Injectable()
export class ClockService {
  private readonly fmt: Intl.DateTimeFormat;

  constructor(readonly timeZone: string) {
    this.fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
  }

  now(): Date {
    return new Date();
  }

  /** Today's date in the app time zone, "YYYY-MM-DD". */
  today(): string {
    const p = this.parts();
    return `${p.year}-${p.month}-${p.day}`;
  }

  /** Current local time in the app time zone, "HH:MM". */
  currentTime(): string {
    const p = this.parts();
    return `${p.hour}:${p.minute}`;
  }

  private parts(): Record<'year' | 'month' | 'day' | 'hour' | 'minute', string> {
    const out: Record<string, string> = {};
    for (const { type, value } of this.fmt.formatToParts(this.now())) out[type] = value;
    return out as Record<'year' | 'month' | 'day' | 'hour' | 'minute', string>;
  }
}
