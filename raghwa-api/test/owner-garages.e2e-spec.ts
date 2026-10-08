import { COMPLETE_PROFILE, bearer, book, customerSession, ownerSession, publishedGarage, type OwnerSession } from './utils/factories';
import { TODAY, TOMORROW, createTestApp, type TestContext } from './utils/test-app';

describe('Owner garages (/v1/owner/garages)', () => {
  let ctx: TestContext;
  let owner: OwnerSession;
  const api = (path = '') => `/v1/owner/garages${path}`;

  beforeAll(async () => (ctx = await createTestApp()));
  beforeEach(async () => {
    await ctx.reset();
    owner = await ownerSession(ctx);
  });
  afterAll(() => ctx.close());

  const create = (body: object = {}) => ctx.http().post(api()).set(bearer(owner.token)).send(body);

  it('creates a draft with the default week and a publish checklist', async () => {
    const res = await create({ name: 'Raghwa Wash Sousse' }).expect(201);
    expect(res.body).toMatchObject({
      status: 'draft',
      name: 'Raghwa Wash Sousse',
      city: 'Tunis',
      location: null,
      slotDurationMinutes: 30,
      capacity: 2,
      missingForPublish: ['phone', 'address', 'area', 'location', 'services'],
    });
    expect(res.body.hours).toHaveLength(7);
    expect(res.body.hours[0]).toEqual({
      dayOfWeek: 0, isOpen: true, opensAt: '08:00', closesAt: '19:00', hasBreak: true, breakStart: '13:00', breakEnd: '14:00',
    });
    expect(res.body.hours[6].isOpen).toBe(false);
  });

  it('lists only my garages, with booking counts for the picker', async () => {
    const marsa = await publishedGarage(ctx, owner);
    await create({ name: 'Draft garage' }).expect(201);
    const other = await ownerSession(ctx, '97000000');
    await create({}).set(bearer(other.token)).expect(201);

    const customer = await customerSession(ctx);
    await book(ctx, customer, { garageId: marsa.garageId, date: TODAY, time: '15:00', serviceIds: [marsa.serviceIds[0]] });
    await book(ctx, customer, { garageId: marsa.garageId, date: TOMORROW, time: '09:00', serviceIds: [marsa.serviceIds[0]] });

    const res = await ctx.http().get(api()).set(bearer(owner.token)).expect(200);
    expect(res.body).toEqual([
      expect.objectContaining({ id: marsa.garageId, status: 'published', todayReservations: 1, upcomingReservations: 2 }),
      expect.objectContaining({ name: 'Draft garage', status: 'draft', todayReservations: 0, upcomingReservations: 0 }),
    ]);
  });

  it('hides other owners’ garages behind 404', async () => {
    const other = await ownerSession(ctx, '97000000');
    const theirs = await ctx.http().post(api()).set(bearer(other.token)).send({}).expect(201);
    for (const path of [`/${theirs.body.id}`, `/${theirs.body.id}/services`, `/${theirs.body.id}/reservations`]) {
      expect((await ctx.http().get(api(path)).set(bearer(owner.token)).expect(404)).body.code).toBe('GARAGE_NOT_FOUND');
    }
    await ctx.http().patch(api(`/${theirs.body.id}`)).set(bearer(owner.token)).send({ name: 'Mine now' }).expect(404);
    await ctx.http().get(api('/not-a-uuid')).set(bearer(owner.token)).expect(404);
  });

  it('updates the profile partially', async () => {
    const g = await create({ name: 'Old name' }).expect(201);
    const res = await ctx.http().patch(api(`/${g.body.id}`)).set(bearer(owner.token))
      .send({ area: 'La Marsa', latitude: 36.8782, longitude: 10.3247, capacity: 3 }).expect(200);
    expect(res.body).toMatchObject({ name: 'Old name', area: 'La Marsa', capacity: 3, location: { latitude: 36.8782, longitude: 10.3247 } });
  });

  it.each([
    [{ capacity: 0 }],
    [{ capacity: 13 }],
    [{ slotDurationMinutes: 5 }],
    [{ latitude: 95 }],
    [{ phone: '123' }],
    [{ status: 'published' }],
  ])('validates profile fields (%o)', async (body) => {
    const g = await create().expect(201);
    await ctx.http().patch(api(`/${g.body.id}`)).set(bearer(owner.token)).send(body).expect(400);
  });

  it('requires latitude and longitude together', async () => {
    const g = await create().expect(201);
    const res = await ctx.http().patch(api(`/${g.body.id}`)).set(bearer(owner.token)).send({ latitude: 36.8 }).expect(422);
    expect(res.body.code).toBe('INVALID_LOCATION');
  });

  describe('opening hours', () => {
    const week = (patch: object = {}) =>
      Array.from({ length: 7 }, (_, i) => ({
        isOpen: i !== 6, opensAt: '09:00', closesAt: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00', ...patch,
      }));

    it('replaces the whole week', async () => {
      const g = await create().expect(201);
      const res = await ctx.http().put(api(`/${g.body.id}/hours`)).set(bearer(owner.token)).send({ days: week() }).expect(200);
      expect(res.body.hours.map((h: { opensAt: string; dayOfWeek: number }) => [h.dayOfWeek, h.opensAt])).toEqual(
        [0, 1, 2, 3, 4, 5, 6].map((d) => [d, '09:00']),
      );
    });

    it('needs exactly 7 well-formed days', async () => {
      const g = await create().expect(201);
      await ctx.http().put(api(`/${g.body.id}/hours`)).set(bearer(owner.token)).send({ days: week().slice(0, 6) }).expect(400);
      await ctx.http().put(api(`/${g.body.id}/hours`)).set(bearer(owner.token)).send({ days: week({ opensAt: '9h' }) }).expect(400);
    });

    it('reports inconsistent days', async () => {
      const g = await create().expect(201);
      const days = week();
      days[2] = { ...days[2], closesAt: '08:00' };
      const res = await ctx.http().put(api(`/${g.body.id}/hours`)).set(bearer(owner.token)).send({ days }).expect(422);
      expect(res.body).toMatchObject({ code: 'INVALID_HOURS', details: { problems: [{ day: 2 }] } });
    });
  });

  describe('publishing', () => {
    it('lists what is missing', async () => {
      const g = await create({ name: 'Half done' }).expect(201);
      const res = await ctx.http().post(api(`/${g.body.id}/publish`)).set(bearer(owner.token)).expect(422);
      expect(res.body).toMatchObject({ code: 'GARAGE_INCOMPLETE', details: { missing: ['phone', 'address', 'area', 'location', 'services'] } });
    });

    it('publishes a complete garage and can hide it again', async () => {
      const g = await create(COMPLETE_PROFILE).expect(201);
      await ctx.http().post(api(`/${g.body.id}/services`)).set(bearer(owner.token)).send({ nameAr: 'غسيل', nameFr: 'Lavage', price: 10 }).expect(201);

      const published = await ctx.http().post(api(`/${g.body.id}/publish`)).set(bearer(owner.token)).expect(200);
      expect(published.body).toMatchObject({ status: 'published', missingForPublish: [], publishedAt: expect.any(String) });

      const hidden = await ctx.http().post(api(`/${g.body.id}/unpublish`)).set(bearer(owner.token)).expect(200);
      expect(hidden.body.status).toBe('draft');
    });

    it('keeps a published garage complete', async () => {
      const { garageId } = await publishedGarage(ctx, owner);
      expect((await ctx.http().patch(api(`/${garageId}`)).set(bearer(owner.token)).send({ name: '   ' }).expect(422)).body.code).toBe(
        'GARAGE_INCOMPLETE',
      );
      const closedWeek = Array.from({ length: 7 }, () => ({
        isOpen: false, opensAt: '08:00', closesAt: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00',
      }));
      await ctx.http().put(api(`/${garageId}/hours`)).set(bearer(owner.token)).send({ days: closedWeek }).expect(422);
    });
  });
});
