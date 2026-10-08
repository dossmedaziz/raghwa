import {
  bearer, book, customerSession, ownerSession, publishedGarage, type CustomerSession, type GarageFixture, type OwnerSession,
} from './utils/factories';
import { TODAY, TOMORROW, createTestApp, type TestContext } from './utils/test-app';

describe('Owner reservations (/v1/owner/garages/:garageId/reservations)', () => {
  let ctx: TestContext;
  let owner: OwnerSession;
  let g: GarageFixture;
  let ahmed: CustomerSession, ines: CustomerSession;
  const url = (path = '') => `/v1/owner/garages/${g.garageId}/reservations${path}`;
  const list = async (query: object = {}) => (await ctx.http().get(url()).query(query).set(bearer(owner.token)).expect(200)).body;

  beforeAll(async () => (ctx = await createTestApp()));
  beforeEach(async () => {
    await ctx.reset();
    owner = await ownerSession(ctx);
    g = await publishedGarage(ctx, owner);
    ahmed = await customerSession(ctx, '22345671', 'Ahmed Ben Salah');
    ines = await customerSession(ctx, '55102938', 'Ines Hammami');
  });
  afterAll(() => ctx.close());

  async function seed() {
    const a = await book(ctx, ahmed, { garageId: g.garageId, date: TODAY, time: '15:00', serviceIds: [g.serviceIds[1]] });
    const b = await book(ctx, ines, { garageId: g.garageId, date: TOMORROW, time: '09:00', serviceIds: [g.serviceIds[0]] });
    const c = await book(ctx, ines, { garageId: g.garageId, date: '2026-10-24', time: '10:00', serviceIds: g.serviceIds });
    await ctx.http().post(`/v1/reservations/${c.body.id}/cancel`).set(bearer(ines.token)).expect(200);
    return { a: a.body, b: b.body, c: c.body };
  }

  it('lists newest first with customer contact details', async () => {
    const { a, b, c } = await seed();
    const page = await list();
    expect(page.items.map((r: { id: string }) => r.id)).toEqual([c.id, b.id, a.id]);
    expect(page.items[2]).toMatchObject({ customer: { name: 'Ahmed Ben Salah', phone: '22345671' }, total: 20 });
    expect(page.items[2]).not.toHaveProperty('garage');
    expect(page.meta).toEqual({ page: 1, limit: 20, total: 3, totalPages: 1 });
  });

  it('filters by status, text, service and dates; sorts and paginates', async () => {
    const { a, b, c } = await seed();
    const ids = (p: { items: { id: string }[] }) => p.items.map((r) => r.id);

    expect(ids(await list({ status: 'cancelled' }))).toEqual([c.id]);
    expect(ids(await list({ q: 'ines' }))).toEqual([c.id, b.id]);
    expect(ids(await list({ q: '22345' }))).toEqual([a.id]);
    expect(ids(await list({ q: a.ref.toLowerCase() }))).toEqual([a.id]);
    expect(ids(await list({ serviceId: g.serviceIds[1] }))).toEqual([c.id, a.id]);
    expect(ids(await list({ from: TOMORROW, to: TOMORROW }))).toEqual([b.id]);
    expect(ids(await list({ order: 'asc' }))).toEqual([a.id, b.id, c.id]);

    const page2 = await list({ limit: 2, page: 2 });
    expect(ids(page2)).toEqual([a.id]);
    expect(page2.meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });

  it.each([[{ status: 'pending' }], [{ serviceId: 'x' }], [{ from: '2026-13-01' }], [{ order: 'up' }], [{ limit: 0 }]])(
    'validates the query (%o)',
    async (query) => {
      await ctx.http().get(url()).query(query).set(bearer(owner.token)).expect(400);
    },
  );

  it('shows details only for this garage’s reservations', async () => {
    const { a } = await seed();
    const res = await ctx.http().get(url(`/${a.id}`)).set(bearer(owner.token)).expect(200);
    expect(res.body).toMatchObject({ id: a.id, ref: a.ref, history: [{ type: 'booked', actor: 'customer' }] });

    const other = await publishedGarage(ctx, owner, { name: 'Second garage' });
    await ctx.http().get(`/v1/owner/garages/${other.garageId}/reservations/${a.id}`).set(bearer(owner.token)).expect(404);
    const stranger = await ownerSession(ctx, '97000000');
    await ctx.http().get(url(`/${a.id}`)).set(bearer(stranger.token)).expect(404);
  });

  describe('mark done', () => {
    it('completes today’s reservations', async () => {
      const { a } = await seed();
      const res = await ctx.http().post(url(`/${a.id}/done`)).set(bearer(owner.token)).expect(200);
      expect(res.body.status).toBe('done');
      expect(res.body.history.at(-1)).toMatchObject({ type: 'done', actor: 'garage' });
      expect((await ctx.http().post(url(`/${a.id}/done`)).set(bearer(owner.token)).expect(409)).body.code).toBe('RESERVATION_NOT_UPCOMING');
    });

    it('refuses future and cancelled reservations', async () => {
      const { b, c } = await seed();
      expect((await ctx.http().post(url(`/${b.id}/done`)).set(bearer(owner.token)).expect(422)).body.code).toBe('RESERVATION_IN_FUTURE');
      await ctx.http().post(url(`/${c.id}/done`)).set(bearer(owner.token)).expect(409);
    });
  });

  describe('cancel by the garage', () => {
    it('cancels and texts the customer', async () => {
      const { b } = await seed();
      ctx.sms.messages = [];
      const res = await ctx.http().post(url(`/${b.id}/cancel`)).set(bearer(owner.token)).expect(200);
      expect(res.body).toMatchObject({ status: 'cancelled', cancelledBy: 'garage' });
      expect(ctx.sms.to(ines.phone)).toEqual([{ phone: ines.phone, message: expect.stringContaining(b.ref) }]);
      expect(ctx.sms.to(owner.phone)).toEqual([]);
      await ctx.http().post(url(`/${b.id}/cancel`)).set(bearer(owner.token)).expect(409);
    });
  });

  it('keeps the booked name and price after the service is edited or deleted', async () => {
    const { a } = await seed();
    await ctx.http().patch(`/v1/owner/garages/${g.garageId}/services/${g.serviceIds[1]}`).set(bearer(owner.token)).send({ price: 99 }).expect(200);
    await ctx.http().delete(`/v1/owner/garages/${g.garageId}/services/${g.serviceIds[1]}`).set(bearer(owner.token)).expect(204);
    const res = await ctx.http().get(url(`/${a.id}`)).set(bearer(owner.token)).expect(200);
    expect(res.body.total).toBe(20);
    expect(res.body.lines).toEqual([{ serviceId: null, nameAr: 'غسيل كامل', nameFr: 'Lavage complet', price: 20 }]);
  });
});
