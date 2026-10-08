import { bearer, book, customerSession, ownerSession, publishedGarage, type GarageFixture, type OwnerSession } from './utils/factories';
import { SUNDAY, TODAY, TOMORROW, createTestApp, type TestContext } from './utils/test-app';

interface Slot { time: string; booked: number; available: number; blockedReason: string | null; isPast: boolean }
interface Day { date: string; isOpen: boolean; blockedReason: string | null; slots: Slot[] }

describe('Owner schedule & blocks (/v1/owner/garages/:garageId/…)', () => {
  let ctx: TestContext;
  let owner: OwnerSession;
  let g: GarageFixture;
  const url = (path: string) => `/v1/owner/garages/${g.garageId}${path}`;
  const schedule = async (from: string, to = from): Promise<Day[]> =>
    (await ctx.http().get(url('/schedule')).query({ from, to }).set(bearer(owner.token)).expect(200)).body;

  beforeAll(async () => (ctx = await createTestApp()));
  beforeEach(async () => {
    await ctx.reset();
    owner = await ownerSession(ctx);
    g = await publishedGarage(ctx, owner);
  });
  afterAll(() => ctx.close());

  it('returns every slot of the default weekday, skipping the lunch break', async () => {
    const [day] = await schedule(TOMORROW);
    expect(day).toMatchObject({ date: TOMORROW, isOpen: true, blockedReason: null });
    const times = day.slots.map((s) => s.time);
    expect(times[0]).toBe('08:00');
    expect(times.at(-1)).toBe('18:30');
    expect(times).not.toContain('13:00');
    expect(times).not.toContain('13:30');
    expect(day.slots).toHaveLength(20);
    expect(day.slots.every((s) => s.available === 2)).toBe(true);
  });

  it('marks past slots today and closed Sundays', async () => {
    const days = await schedule(TODAY, SUNDAY);
    expect(days).toHaveLength(5);
    const today = days[0].slots;
    expect(today.find((s) => s.time === '11:00')).toMatchObject({ isPast: true, available: 0 });
    expect(today.find((s) => s.time === '11:30')).toMatchObject({ isPast: false, available: 2 });
    expect(days[4]).toMatchObject({ date: SUNDAY, isOpen: false, slots: [] });
  });

  it('counts bookings per slot', async () => {
    const a = await customerSession(ctx, '22000001');
    const b = await customerSession(ctx, '22000002');
    await book(ctx, a, { garageId: g.garageId, date: TOMORROW, time: '09:00', serviceIds: [g.serviceIds[0]] });
    await book(ctx, b, { garageId: g.garageId, date: TOMORROW, time: '09:00', serviceIds: [g.serviceIds[1]] });
    const [day] = await schedule(TOMORROW);
    expect(day.slots.find((s) => s.time === '09:00')).toMatchObject({ booked: 2, available: 0 });
  });

  it('validates the range', async () => {
    await ctx.http().get(url('/schedule')).query({ from: TOMORROW }).set(bearer(owner.token)).expect(400);
    expect((await ctx.http().get(url('/schedule')).query({ from: TOMORROW, to: TODAY }).set(bearer(owner.token)).expect(422)).body.code).toBe(
      'INVALID_RANGE',
    );
    expect(
      (await ctx.http().get(url('/schedule')).query({ from: '2026-10-01', to: '2026-11-15' }).set(bearer(owner.token)).expect(422)).body.code,
    ).toBe('RANGE_TOO_LONG');
  });

  describe('blocking', () => {
    it('blocks and unblocks a whole day (idempotent)', async () => {
      await ctx.http().put(url(`/blocks/days/${TOMORROW}`)).set(bearer(owner.token)).send({ reason: 'holiday' }).expect(200);
      const again = await ctx.http().put(url(`/blocks/days/${TOMORROW}`)).set(bearer(owner.token)).send({ reason: 'maintenance' }).expect(200);
      expect(again.body).toEqual({ date: TOMORROW, reason: 'maintenance' });

      const [day] = await schedule(TOMORROW);
      expect(day.blockedReason).toBe('maintenance');
      expect(day.slots.every((s) => s.available === 0)).toBe(true);

      await ctx.http().delete(url(`/blocks/days/${TOMORROW}`)).set(bearer(owner.token)).expect(204);
      expect((await schedule(TOMORROW))[0].blockedReason).toBeNull();
    });

    it('blocks a single slot', async () => {
      const res = await ctx.http().put(url(`/blocks/slots/${TOMORROW}/17:30`)).set(bearer(owner.token)).send({ reason: 'other' }).expect(200);
      expect(res.body).toEqual({ date: TOMORROW, time: '17:30', reason: 'other' });

      const blocks = await ctx.http().get(url('/blocks')).query({ from: TODAY, to: SUNDAY }).set(bearer(owner.token)).expect(200);
      expect(blocks.body).toEqual({ days: [], slots: [{ date: TOMORROW, time: '17:30', reason: 'other' }] });

      const slot = (await schedule(TOMORROW))[0].slots.find((s) => s.time === '17:30');
      expect(slot).toMatchObject({ blockedReason: 'other', available: 0 });

      await ctx.http().delete(url(`/blocks/slots/${TOMORROW}/17:30`)).set(bearer(owner.token)).expect(204);
    });

    it('only blocks real slots and valid reasons', async () => {
      expect((await ctx.http().put(url(`/blocks/slots/${TOMORROW}/13:00`)).set(bearer(owner.token)).send({ reason: 'other' }).expect(422)).body.code).toBe('NOT_A_SLOT');
      await ctx.http().put(url(`/blocks/slots/${SUNDAY}/10:00`)).set(bearer(owner.token)).send({ reason: 'other' }).expect(422);
      await ctx.http().put(url(`/blocks/days/${TOMORROW}`)).set(bearer(owner.token)).send({ reason: 'party' }).expect(400);
      await ctx.http().put(url('/blocks/days/2026-02-30')).set(bearer(owner.token)).send({ reason: 'holiday' }).expect(400);
      await ctx.http().put(url(`/blocks/slots/${TOMORROW}/25:00`)).set(bearer(owner.token)).send({ reason: 'other' }).expect(400);
    });
  });
});
