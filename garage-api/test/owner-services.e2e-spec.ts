import { bearer, ownerSession, publishedGarage, type OwnerSession } from './utils/factories';
import { createTestApp, type TestContext } from './utils/test-app';

describe('Owner services & prices (/v1/owner/garages/:garageId/services)', () => {
  let ctx: TestContext;
  let owner: OwnerSession;
  let garageId: string;
  const url = (path = '') => `/v1/owner/garages/${garageId}/services${path}`;

  beforeAll(async () => (ctx = await createTestApp()));
  beforeEach(async () => {
    await ctx.reset();
    owner = await ownerSession(ctx);
    garageId = (await ctx.http().post('/v1/owner/garages').set(bearer(owner.token)).send({ name: 'G' }).expect(201)).body.id;
  });
  afterAll(() => ctx.close());

  const polish = { nameAr: 'تلميع', nameFr: 'Lustrage', descriptionFr: 'Polissage machine', price: 35.5 };

  it('creates, lists, edits and deletes services', async () => {
    const created = await ctx.http().post(url()).set(bearer(owner.token)).send(polish).expect(201);
    expect(created.body).toEqual({
      id: expect.any(String), nameAr: 'تلميع', nameFr: 'Lustrage', descriptionAr: '', descriptionFr: 'Polissage machine', price: 35.5, isActive: true,
    });

    const edited = await ctx.http().patch(url(`/${created.body.id}`)).set(bearer(owner.token)).send({ price: 40, isActive: false }).expect(200);
    expect(edited.body).toMatchObject({ price: 40, isActive: false, nameFr: 'Lustrage' });

    const list = await ctx.http().get(url()).set(bearer(owner.token)).expect(200);
    expect(list.body).toHaveLength(1);

    await ctx.http().delete(url(`/${created.body.id}`)).set(bearer(owner.token)).expect(204);
    expect((await ctx.http().get(url()).set(bearer(owner.token)).expect(200)).body).toEqual([]);
  });

  it('keeps prices exact to the millime', async () => {
    const res = await ctx.http().post(url()).set(bearer(owner.token)).send({ ...polish, price: 12.345 }).expect(201);
    expect(res.body.price).toBe(12.345);
  });

  it.each([
    [{ ...polish, price: -1 }],
    [{ ...polish, price: 1.2345 }],
    [{ ...polish, price: '10' }],
    [{ ...polish, nameAr: '' }],
    [{ nameFr: 'Missing arabic name', price: 10 }],
  ])('validates the body (%o)', async (body) => {
    await ctx.http().post(url()).set(bearer(owner.token)).send(body).expect(400);
  });

  it('404s for an unknown service or one of another garage', async () => {
    const other = (await ctx.http().post('/v1/owner/garages').set(bearer(owner.token)).send({}).expect(201)).body.id;
    const foreign = await ctx.http().post(`/v1/owner/garages/${other}/services`).set(bearer(owner.token)).send(polish).expect(201);
    expect((await ctx.http().patch(url(`/${foreign.body.id}`)).set(bearer(owner.token)).send({ price: 1 }).expect(404)).body.code).toBe(
      'SERVICE_NOT_FOUND',
    );
    await ctx.http().delete(url('/00000000-0000-4000-8000-000000000000')).set(bearer(owner.token)).expect(404);
    await ctx.http().delete(url('/nope')).set(bearer(owner.token)).expect(400);
  });

  it('keeps at least one active service on a published garage', async () => {
    const g = await publishedGarage(ctx, owner);
    garageId = g.garageId;
    await ctx.http().patch(url(`/${g.serviceIds[0]}`)).set(bearer(owner.token)).send({ isActive: false }).expect(200);

    const res = await ctx.http().patch(url(`/${g.serviceIds[1]}`)).set(bearer(owner.token)).send({ isActive: false }).expect(422);
    expect(res.body.code).toBe('LAST_ACTIVE_SERVICE');
    await ctx.http().delete(url(`/${g.serviceIds[1]}`)).set(bearer(owner.token)).expect(422);
    // Deleting the inactive one is fine.
    await ctx.http().delete(url(`/${g.serviceIds[0]}`)).set(bearer(owner.token)).expect(204);
  });
});
