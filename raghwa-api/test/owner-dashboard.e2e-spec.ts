import { bearer, book, customerSession, ownerSession, publishedGarage, type GarageFixture, type OwnerSession } from './utils/factories';
import { TODAY, TOMORROW, createTestApp, type TestContext } from './utils/test-app';

describe('Owner dashboard & notifications', () => {
  let ctx: TestContext;
  let owner: OwnerSession;
  let g: GarageFixture;

  beforeAll(async () => (ctx = await createTestApp()));
  beforeEach(async () => {
    await ctx.reset();
    owner = await ownerSession(ctx);
    g = await publishedGarage(ctx, owner);
  });
  afterAll(() => ctx.close());

  it('computes the KPIs, the 7-day chart and the next reservations', async () => {
    const a = await customerSession(ctx, '22000001');
    const b = await customerSession(ctx, '22000002');

    // Booked yesterday (clock moved back) so a morning slot of today is still bookable, then completed today.
    ctx.clock.set('2026-10-20T07:00:00Z');
    const early = await book(ctx, a, { garageId: g.garageId, date: TODAY, time: '09:00', serviceIds: [g.serviceIds[1]] }); // 20 TND
    ctx.clock.set('2026-10-21T10:15:00Z');

    await ctx.http().post(`/v1/owner/garages/${g.garageId}/reservations/${early.body.id}/done`).set(bearer(owner.token)).expect(200);
    await book(ctx, b, { garageId: g.garageId, date: TODAY, time: '15:00', serviceIds: [g.serviceIds[0]] }); // 10 TND, upcoming today
    await book(ctx, a, { garageId: g.garageId, date: TOMORROW, time: '09:00', serviceIds: g.serviceIds }); // 30 TND, this week
    await book(ctx, b, { garageId: g.garageId, date: '2026-10-27', time: '09:00', serviceIds: [g.serviceIds[0]] }); // next week
    const cancelled = await book(ctx, b, { garageId: g.garageId, date: TOMORROW, time: '10:00', serviceIds: [g.serviceIds[1]] });
    await ctx.http().post(`/v1/reservations/${cancelled.body.id}/cancel`).set(bearer(b.token)).expect(200);

    const res = await ctx.http().get(`/v1/owner/garages/${g.garageId}/dashboard`).set(bearer(owner.token)).expect(200);
    expect(res.body).toMatchObject({
      today: TODAY,
      todayTotal: 2,
      todayUpcoming: 1,
      upcomingThisWeek: 2,
      doneThisMonth: 1,
      revenueThisMonth: 20 + 10 + 30 + 10,
    });
    expect(res.body.last7Days).toHaveLength(7);
    expect(res.body.last7Days[0].date).toBe('2026-10-15');
    expect(res.body.last7Days[6]).toEqual({ date: TODAY, count: 2 });
    expect(res.body.nextReservations.map((r: { date: string; time: string }) => `${r.date} ${r.time}`)).toEqual([
      `${TODAY} 15:00`, `${TOMORROW} 09:00`, '2026-10-27 09:00',
    ]);
  });

  it('is empty for a brand new garage', async () => {
    const draft = await ctx.http().post('/v1/owner/garages').set(bearer(owner.token)).send({}).expect(201);
    const res = await ctx.http().get(`/v1/owner/garages/${draft.body.id}/dashboard`).set(bearer(owner.token)).expect(200);
    expect(res.body).toMatchObject({ todayTotal: 0, upcomingThisWeek: 0, doneThisMonth: 0, revenueThisMonth: 0, nextReservations: [] });
    expect(res.body.last7Days.every((d: { count: number }) => d.count === 0)).toBe(true);
  });

  it('lists notifications with an unread count and marks them read', async () => {
    const a = await customerSession(ctx, '22000001');
    await book(ctx, a, { garageId: g.garageId, date: TOMORROW, time: '09:00', serviceIds: [g.serviceIds[0]] });
    await book(ctx, a, { garageId: g.garageId, date: TOMORROW, time: '11:00', serviceIds: [g.serviceIds[0]] });

    const url = `/v1/owner/garages/${g.garageId}/notifications`;
    const before = await ctx.http().get(url).set(bearer(owner.token)).expect(200);
    expect(before.body).toMatchObject({ unread: 2, meta: { total: 2 } });
    expect(before.body.items[0].data.time).toBe('11:00');

    await ctx.http().post(`${url}/read-all`).set(bearer(owner.token)).expect(204);
    const after = await ctx.http().get(url).set(bearer(owner.token)).expect(200);
    expect(after.body.unread).toBe(0);
    expect(after.body.items.every((n: { unread: boolean }) => !n.unread)).toBe(true);
  });

  it('keeps notifications per garage', async () => {
    const other = await publishedGarage(ctx, owner, { name: 'Second' });
    const a = await customerSession(ctx, '22000001');
    await book(ctx, a, { garageId: g.garageId, date: TOMORROW, time: '09:00', serviceIds: [g.serviceIds[0]] });
    const res = await ctx.http().get(`/v1/owner/garages/${other.garageId}/notifications`).set(bearer(owner.token)).expect(200);
    expect(res.body).toMatchObject({ items: [], unread: 0 });
  });
});
