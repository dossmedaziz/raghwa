import { DEFAULT_WEEK, hoursProblem, missingForPublish } from './garage-rules';

const complete = { name: 'Raghwa Wash', phone: '71774512', address: 'Av. Habib Bourguiba', area: 'La Marsa', latitude: 36.87, longitude: 10.32 };

describe('garage rules', () => {
  it('default week: open Mon-Sat, closed Sunday, break on weekdays only', () => {
    expect(DEFAULT_WEEK).toHaveLength(7);
    expect(DEFAULT_WEEK.map((d) => d.isOpen)).toEqual([true, true, true, true, true, true, false]);
    expect(DEFAULT_WEEK[4].hasBreak).toBe(true);
    expect(DEFAULT_WEEK[5].hasBreak).toBe(false);
  });

  describe('missingForPublish', () => {
    it('is empty for a complete garage', () => {
      expect(missingForPublish(complete, DEFAULT_WEEK, 1)).toEqual([]);
    });

    it('lists every missing piece', () => {
      const blank = { name: ' ', phone: '', address: '', area: '', latitude: null, longitude: 10 };
      const closed = DEFAULT_WEEK.map((d) => ({ ...d, isOpen: false }));
      expect(missingForPublish(blank, closed, 0)).toEqual(['name', 'phone', 'address', 'area', 'location', 'hours', 'services']);
    });
  });

  describe('hoursProblem', () => {
    const day = { isOpen: true, opensAt: '08:00', closesAt: '18:00', hasBreak: true, breakStart: '12:00', breakEnd: '13:00' };

    it('accepts consistent hours and ignores closed days', () => {
      expect(hoursProblem(day)).toBeNull();
      expect(hoursProblem({ ...day, isOpen: false, closesAt: '01:00' })).toBeNull();
    });

    it('rejects inverted hours and bad breaks', () => {
      expect(hoursProblem({ ...day, closesAt: '07:00' })).toMatch(/closing/);
      expect(hoursProblem({ ...day, breakEnd: '11:00' })).toMatch(/break end/);
      expect(hoursProblem({ ...day, breakStart: '07:00' })).toMatch(/inside/);
    });

    it('ignores break times when there is no break', () => {
      expect(hoursProblem({ ...day, hasBreak: false, breakStart: '23:00', breakEnd: '01:00' })).toBeNull();
    });
  });
});
