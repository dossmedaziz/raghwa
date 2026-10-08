import { addDays, dayOfWeek, daysBetween, generateSlots, isValidDate, toMinutes, toTime } from './time.utils';

const weekday = { isOpen: true, opensAt: '08:00', closesAt: '12:00', hasBreak: false, breakStart: '13:00', breakEnd: '14:00' };

describe('time utils', () => {
  it('converts between "HH:MM" and minutes', () => {
    expect(toMinutes('00:00')).toBe(0);
    expect(toMinutes('13:45')).toBe(825);
    expect(toTime(825)).toBe('13:45');
    expect(toTime(5)).toBe('00:05');
  });

  it('validates calendar dates', () => {
    expect(isValidDate('2026-10-21')).toBe(true);
    expect(isValidDate('2028-02-29')).toBe(true);
    expect(isValidDate('2026-02-29')).toBe(false);
    expect(isValidDate('2026-13-01')).toBe(false);
    expect(isValidDate('21-10-2026')).toBe(false);
  });

  it('adds days across months and years', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('uses Monday = 0 for the day of week', () => {
    expect(dayOfWeek('2026-10-19')).toBe(0); // Monday
    expect(dayOfWeek('2026-10-21')).toBe(2); // Wednesday
    expect(dayOfWeek('2026-10-25')).toBe(6); // Sunday
  });

  it('counts days between dates', () => {
    expect(daysBetween('2026-10-21', '2026-10-28')).toBe(7);
    expect(daysBetween('2026-10-21', '2026-10-20')).toBe(-1);
  });

  describe('generateSlots', () => {
    it('fills opening hours with back-to-back slots', () => {
      expect(generateSlots(weekday, 60)).toEqual(['08:00', '09:00', '10:00', '11:00']);
    });

    it('drops a trailing slot that would end after closing', () => {
      expect(generateSlots(weekday, 90)).toEqual(['08:00', '09:30']);
    });

    it('skips slots overlapping the break', () => {
      const day = { ...weekday, closesAt: '16:00', hasBreak: true, breakStart: '12:00', breakEnd: '13:00' };
      expect(generateSlots(day, 60)).toEqual(['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00']);
      expect(generateSlots(day, 45)).not.toContain('11:30');
    });

    it('returns nothing when closed or misconfigured', () => {
      expect(generateSlots({ ...weekday, isOpen: false }, 30)).toEqual([]);
      expect(generateSlots(undefined, 30)).toEqual([]);
      expect(generateSlots(weekday, 0)).toEqual([]);
    });
  });
});
