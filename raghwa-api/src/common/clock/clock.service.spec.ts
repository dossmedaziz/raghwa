import { ClockService } from './clock.service';

class FrozenClock extends ClockService {
  constructor(private readonly at: Date) {
    super('Africa/Tunis');
  }
  override now() {
    return this.at;
  }
}

describe('ClockService', () => {
  it('reports date and time in the configured time zone (Tunis is UTC+1)', () => {
    const clock = new FrozenClock(new Date('2026-10-21T10:15:00Z'));
    expect(clock.today()).toBe('2026-10-21');
    expect(clock.currentTime()).toBe('11:15');
  });

  it('rolls over to the next local day before UTC does', () => {
    const clock = new FrozenClock(new Date('2026-10-21T23:30:00Z'));
    expect(clock.today()).toBe('2026-10-22');
    expect(clock.currentTime()).toBe('00:30');
  });
});
