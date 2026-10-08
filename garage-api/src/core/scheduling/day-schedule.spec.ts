import { buildDaySchedule, type DayScheduleInput } from './day-schedule';

const base: DayScheduleInput = {
  date: '2026-10-22',
  hours: { isOpen: true, opensAt: '08:00', closesAt: '10:00', hasBreak: false, breakStart: '13:00', breakEnd: '14:00' },
  slotDurationMinutes: 30,
  capacity: 2,
  dayBlock: null,
  slotBlocks: new Map(),
  bookedTimes: [],
  today: '2026-10-21',
  nowTime: '11:15',
};

const byTime = (i: Partial<DayScheduleInput>) =>
  Object.fromEntries(buildDaySchedule({ ...base, ...i }).slots.map((s) => [s.time, s]));

describe('buildDaySchedule', () => {
  it('lists every slot with full availability on an empty day', () => {
    const day = buildDaySchedule(base);
    expect(day.isOpen).toBe(true);
    expect(day.slots.map((s) => [s.time, s.available])).toEqual([['08:00', 2], ['08:30', 2], ['09:00', 2], ['09:30', 2]]);
  });

  it('counts bookings towards their slot and caps availability at zero', () => {
    const s = byTime({ bookedTimes: ['08:00', '08:00', '08:00', '09:00'] });
    expect(s['08:00']).toMatchObject({ booked: 3, available: 0 });
    expect(s['09:00']).toMatchObject({ booked: 1, available: 1 });
  });

  it('assigns off-grid bookings (after a slot length change) to the slot they start in', () => {
    expect(byTime({ bookedTimes: ['08:45'] })['08:30'].booked).toBe(1);
  });

  it('blocks single slots or the whole day', () => {
    const one = byTime({ slotBlocks: new Map([['08:30', 'maintenance']]) });
    expect(one['08:30']).toMatchObject({ blockedReason: 'maintenance', available: 0 });
    expect(one['09:00'].available).toBe(2);

    const day = buildDaySchedule({ ...base, dayBlock: 'holiday' });
    expect(day.blockedReason).toBe('holiday');
    expect(day.slots.every((s) => s.available === 0 && s.blockedReason === 'holiday')).toBe(true);
  });

  it('marks slots that already started today as past', () => {
    const s = byTime({ date: '2026-10-21', nowTime: '08:30' });
    expect(s['08:00'].isPast).toBe(true);
    expect(s['08:30'].isPast).toBe(true);
    expect(s['09:00']).toMatchObject({ isPast: false, available: 2 });
  });

  it('marks every slot of an earlier day as past', () => {
    expect(buildDaySchedule({ ...base, date: '2026-10-20' }).slots.every((s) => s.isPast)).toBe(true);
  });

  it('reports a closed day with no slots', () => {
    const day = buildDaySchedule({ ...base, hours: { ...base.hours!, isOpen: false } });
    expect(day).toMatchObject({ isOpen: false, slots: [] });
  });
});
