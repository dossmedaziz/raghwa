import {
  bearer, book, customerSession, ownerSession, publishedGarage, type CustomerSession, type GarageFixture, type OwnerSession,
} from './utils/factories';
import { TODAY, createTestApp, type TestContext } from './utils/test-app';

const PHONE_A = 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]';
const PHONE_B = 'ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]';

describe('Customer push notifications (/v1/me/push-token)', () => {
  let ctx: TestContext;
  let owner: OwnerSession;
  let g: GarageFixture;
  let ahmed: CustomerSession;

  const register = (c: CustomerSession, token: string, lang = 'ar', expected = 204) =>
    ctx.http().put('/v1/me/push-token').set(bearer(c.token)).send({ token, lang }).expect(expected);
  const bookToday = async (c: CustomerSession, time = '15:00') =>
    (await book(ctx, c, { garageId: g.garageId, date: TODAY, time, serviceIds: [g.serviceIds[0]] })).body;
  const markDone = (id: string, expected = 200) =>
    ctx.http().post(`/v1/owner/garages/${g.garageId}/reservations/${id}/done`).set(bearer(owner.token)).expect(expected);

  beforeAll(async () => (ctx = await createTestApp()));
  beforeEach(async () => {
    await ctx.reset();
    owner = await ownerSession(ctx);
    g = await publishedGarage(ctx, owner);
    ahmed = await customerSession(ctx);
  });
  afterAll(() => ctx.close());

  it('pushes to every phone of the customer, in its language, when the garage marks the wash done', async () => {
    await register(ahmed, PHONE_A, 'ar');
    await register(ahmed, PHONE_B, 'fr');
    const r = await bookToday(ahmed);
    expect(ctx.push.messages).toEqual([]);

    await markDone(r.id);

    const data = { type: 'reservation_done', reservationId: r.id };
    expect(ctx.push.messages).toEqual(expect.arrayContaining([
      { to: PHONE_A, title: expect.stringContaining('حاضرة'), body: expect.stringContaining('Raghwa Wash La Marsa'), data },
      { to: PHONE_B, title: expect.stringContaining('prête'), body: expect.stringContaining('Raghwa Wash La Marsa'), data },
    ]));
    expect(ctx.push.messages).toHaveLength(2);
  });

  it('pushes once even if "done" is sent twice', async () => {
    await register(ahmed, PHONE_A);
    const r = await bookToday(ahmed);
    await markDone(r.id);
    await markDone(r.id, 409);
    expect(ctx.push.messages).toHaveLength(1);
  });

  it('pushes when the garage cancels, and the reservation says who cancelled', async () => {
    await register(ahmed, PHONE_A, 'ar');
    await register(ahmed, PHONE_B, 'fr');
    const r = (await book(ctx, ahmed, { garageId: g.garageId, date: '2026-10-24', time: '10:30', serviceIds: [g.serviceIds[0]] })).body;

    const res = await ctx.http().post(`/v1/owner/garages/${g.garageId}/reservations/${r.id}/cancel`).set(bearer(owner.token)).expect(200);
    expect(res.body).toMatchObject({ status: 'cancelled', cancelledBy: 'garage' });

    const data = { type: 'reservation_cancelled', reservationId: r.id };
    expect(ctx.push.messages).toEqual(expect.arrayContaining([
      { to: PHONE_A, title: expect.stringContaining('تبطّل'), body: expect.stringMatching(/Raghwa Wash La Marsa.*24\/10.*10:30/), data },
      { to: PHONE_B, title: 'Réservation annulée', body: expect.stringMatching(/Raghwa Wash La Marsa a annulé .*24\/10 à 10:30/), data },
    ]));
    expect(ctx.push.messages).toHaveLength(2);
    expect(ctx.sms.to(ahmed.phone)).toHaveLength(1); // still texted too

    const mine = await ctx.http().get(`/v1/reservations/${r.id}`).set(bearer(ahmed.token)).expect(200);
    expect(mine.body.cancelledBy).toBe('garage');
  });

  it('does not push when the customer cancels their own booking', async () => {
    await register(ahmed, PHONE_A);
    const r = await bookToday(ahmed);
    const res = await ctx.http().post(`/v1/reservations/${r.id}/cancel`).set(bearer(ahmed.token)).expect(200);
    expect(res.body.cancelledBy).toBe('customer');
    expect(ctx.push.messages).toEqual([]);
  });

  it('does not push for other changes, nor to other customers', async () => {
    const ines = await customerSession(ctx, '55102938', 'Ines Hammami');
    await register(ines, PHONE_B);
    const r = await bookToday(ahmed);
    await ctx.http().post(`/v1/reservations/${r.id}/reschedule`).set(bearer(ahmed.token)).send({ date: TODAY, time: '16:00' }).expect(200);
    await markDone(r.id);
    expect(ctx.push.messages).toEqual([]);
  });

  it('updates the language and moves a token to whoever logs in on the phone last', async () => {
    await register(ahmed, PHONE_A, 'ar');
    await register(ahmed, PHONE_A, 'fr');
    const ines = await customerSession(ctx, '55102938', 'Ines Hammami');
    await register(ines, PHONE_A, 'ar');

    await markDone((await bookToday(ahmed)).id);
    expect(ctx.push.messages).toEqual([]);
    await markDone((await bookToday(ines, '16:00')).id);
    expect(ctx.push.messages).toEqual([expect.objectContaining({ to: PHONE_A, title: expect.stringContaining('حاضرة') })]);
  });

  it('stops pushing after unregistering, and only unregisters the caller’s own token', async () => {
    const ines = await customerSession(ctx, '55102938', 'Ines Hammami');
    await register(ahmed, PHONE_A);
    await ctx.http().delete('/v1/me/push-token').set(bearer(ines.token)).send({ token: PHONE_A }).expect(204);
    await markDone((await bookToday(ahmed)).id);
    expect(ctx.push.messages).toHaveLength(1);

    await ctx.http().delete('/v1/me/push-token').set(bearer(ahmed.token)).send({ token: PHONE_A }).expect(204);
    await markDone((await bookToday(ahmed, '16:00')).id);
    expect(ctx.push.messages).toHaveLength(1);
  });

  it('forgets tokens the push service reports as uninstalled', async () => {
    await register(ahmed, PHONE_A);
    await register(ahmed, PHONE_B);
    ctx.push.invalid.add(PHONE_A);
    await markDone((await bookToday(ahmed)).id);
    expect(ctx.push.messages).toHaveLength(2);

    ctx.push.messages = [];
    await markDone((await bookToday(ahmed, '16:00')).id);
    expect(ctx.push.messages.map((m) => m.to)).toEqual([PHONE_B]);
  });

  it.each([
    [{ token: 'not-a-token', lang: 'ar' }],
    [{ token: PHONE_A, lang: 'en' }],
    [{ token: PHONE_A }],
    [{ token: PHONE_A, lang: 'ar', extra: 1 }],
  ])('validates the body (%o)', async (body) => {
    await ctx.http().put('/v1/me/push-token').set(bearer(ahmed.token)).send(body).expect(400);
  });

  it('requires a customer token', async () => {
    await ctx.http().put('/v1/me/push-token').send({ token: PHONE_A, lang: 'ar' }).expect(401);
    await ctx.http().put('/v1/me/push-token').set(bearer(owner.token)).send({ token: PHONE_A, lang: 'ar' }).expect(401);
  });
});
