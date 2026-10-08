import { bearer, book, customerSession, ownerSession, publishedGarage, type GarageFixture, type OwnerSession } from './utils/factories';
import { SUNDAY, TODAY, TOMORROW, createTestApp, type TestContext } from './utils/test-app';

describe('Customer garage browsing (/v1/garages)', () => {
  let ctx: TestContext;
  let owner: OwnerSession;
  let marsa: GarageFixture, lac: GarageFixture, sousse: GarageFixture;

  beforeAll(async () => (ctx = await createTestApp()));
  beforeEach(async () => {
    await ctx.reset();
    owner = await ownerSession(ctx);
    marsa = await publishedGarage(ctx, owner);
    lac = await publishedGarage(ctx, owner, { name: 'Raghwa Wash Lac 2', area: 'Les Berges du Lac', latitude: 36.8372, longitude: 10.2433 });
    sousse = await publishedGarage(ctx, owner, { name: 'Raghwa Wash Sousse', area: 'Khezama', city: 'Sousse', latitude: 35.8256, longitude: 10.6084 });
    await ctx.http().post('/v1/owner/garages').set(bearer(owner.token)).send({ name: 'Hidden draft', city: 'Tunis' }).expect(201);
  });
  afterAll(() => ctx.close());

  describe('search', () => {
    it('lists published garages only, with the cheapest price', async () => {
      const res = await ctx.http().get('/v1/garages').expect(200);
      expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 3, totalPages: 1 });
      expect(res.body.items.map((g: { name: string }) => g.name)).not.toContain('Hidden draft');
      expect(res.body.items[0]).toMatchObject({ fromPrice: 10, distanceKm: null });
    });

    it('filters by text and city', async () => {
      const byText = await ctx.http().get('/v1/garages').query({ q: 'berges' }).expect(200);
      expect(byText.body.items.map((g: { id: string }) => g.id)).toEqual([lac.garageId]);
      const byCity = await ctx.http().get('/v1/garages').query({ city: 'Sousse' }).expect(200);
      expect(byCity.body.items.map((g: { id: string }) => g.id)).toEqual([sousse.garageId]);
      const literal = await ctx.http().get('/v1/garages').query({ q: '%' }).expect(200);
      expect(literal.body.items).toEqual([]);
    });

    it('sorts by distance within a radius', async () => {
      // From La Marsa beach: Marsa ≈ 0 km, Lac 2 ≈ 9.6 km, Sousse ≈ 120 km.
      const res = await ctx.http().get('/v1/garages').query({ lat: 36.8782, lng: 10.3247, radiusKm: 20 }).expect(200);
      expect(res.body.items.map((g: { id: string }) => g.id)).toEqual([marsa.garageId, lac.garageId]);
      expect(res.body.items[0].distanceKm).toBe(0);
      expect(res.body.items[1].distanceKm).toBeGreaterThan(8);
      expect(res.body.items[1].distanceKm).toBeLessThan(11);

      const wide = await ctx.http().get('/v1/garages').query({ lat: 36.8782, lng: 10.3247, radiusKm: 100 }).expect(200);
      expect(wide.body.meta.total).toBe(2);
    });

    it('paginates', async () => {
      const res = await ctx.http().get('/v1/garages').query({ page: 2, limit: 2 }).expect(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
    });

    it.each([[{ lat: 36.8 }], [{ lat: 'x', lng: 10 }], [{ limit: 500 }], [{ page: 0 }], [{ radiusKm: 0 }], [{ foo: 'bar' }]])(
      'validates the query (%o)',
      async (query) => {
        await ctx.http().get('/v1/garages').query(query).expect(400);
      },
    );
  });

  describe('details', () => {
    it('shows hours and active services only', async () => {
      await ctx.http().patch(`/v1/owner/garages/${marsa.garageId}/services/${marsa.serviceIds[1]}`).set(bearer(owner.token))
        .send({ isActive: false }).expect(200);
      const res = await ctx.http().get(`/v1/garages/${marsa.garageId}`).expect(200);
      expect(res.body).toMatchObject({ name: 'Raghwa Wash La Marsa', phone: '71774512', location: { latitude: 36.8782, longitude: 10.3247 } });
      expect(res.body.hours).toHaveLength(7);
      expect(res.body.services).toEqual([expect.objectContaining({ id: marsa.serviceIds[0], price: 10 })]);
      expect(res.body.services[0]).not.toHaveProperty('isActive');
    });

    it('404s for drafts and unknown ids', async () => {
      await ctx.http().post(`/v1/owner/garages/${marsa.garageId}/unpublish`).set(bearer(owner.token)).expect(200);
      expect((await ctx.http().get(`/v1/garages/${marsa.garageId}`).expect(404)).body.code).toBe('GARAGE_NOT_FOUND');
      await ctx.http().get('/v1/garages/00000000-0000-4000-8000-000000000000').expect(404);
    });
  });

  describe('availability', () => {
    const availability = (date: string, id = marsa.garageId) => ctx.http().get(`/v1/garages/${id}/availability`).query({ date });

    it('only offers slots that have not started, with places left', async () => {
      const res = await availability(TODAY).expect(200);
      expect(res.body.isOpen).toBe(true);
      expect(res.body.slots[0]).toEqual({ time: '11:30', available: 2 });
      expect(res.body.slots.map((s: { time: string }) => s.time)).not.toContain('13:00');
    });

    it('shows full slots with 0 places and hides block reasons', async () => {
      const a = await customerSession(ctx, '22000001');
      const b = await customerSession(ctx, '22000002');
      for (const c of [a, b]) await book(ctx, c, { garageId: marsa.garageId, date: TOMORROW, time: '10:00', serviceIds: [marsa.serviceIds[0]] });
      await ctx.http().put(`/v1/owner/garages/${marsa.garageId}/blocks/slots/${TOMORROW}/10:30`).set(bearer(owner.token)).send({ reason: 'maintenance' }).expect(200);

      const slots: { time: string; available: number }[] = (await availability(TOMORROW).expect(200)).body.slots;
      expect(slots.find((s) => s.time === '10:00')).toEqual({ time: '10:00', available: 0 });
      expect(slots.find((s) => s.time === '10:30')).toEqual({ time: '10:30', available: 0 });
      expect(JSON.stringify(slots)).not.toContain('maintenance');
    });

    it('reports closed and blocked days as not open', async () => {
      expect((await availability(SUNDAY).expect(200)).body).toEqual({ date: SUNDAY, isOpen: false, slots: [] });
      await ctx.http().put(`/v1/owner/garages/${marsa.garageId}/blocks/days/${TOMORROW}`).set(bearer(owner.token)).send({ reason: 'holiday' }).expect(200);
      expect((await availability(TOMORROW).expect(200)).body).toEqual({ date: TOMORROW, isOpen: false, slots: [] });
    });

    it('rejects dates outside the booking window', async () => {
      expect((await availability('2026-10-20').expect(422)).body.code).toBe('DATE_OUT_OF_RANGE');
      await availability('2027-01-15').expect(422);
      await availability('tomorrow').expect(400);
    });
  });
});
