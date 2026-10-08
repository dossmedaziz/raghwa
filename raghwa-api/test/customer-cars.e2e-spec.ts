import { bearer, customerSession, ownerSession, type CustomerSession } from './utils/factories';
import { createTestApp, type TestContext } from './utils/test-app';

describe('Customer cars (/v1/me/cars)', () => {
  let ctx: TestContext;
  let ahmed: CustomerSession;
  const polo = { brand: 'Volkswagen', model: 'Polo', plate: '215 TU 4521' };
  const picanto = { brand: 'Kia', model: 'Picanto', plate: '231 TU 1087' };
  const cars = (who = ahmed) => ({
    list: () => ctx.http().get('/v1/me/cars').set(bearer(who.token)),
    add: (body: object) => ctx.http().post('/v1/me/cars').set(bearer(who.token)).send(body),
    edit: (id: string, body: object) => ctx.http().patch(`/v1/me/cars/${id}`).set(bearer(who.token)).send(body),
    remove: (id: string) => ctx.http().delete(`/v1/me/cars/${id}`).set(bearer(who.token)),
  });

  beforeAll(async () => (ctx = await createTestApp()));
  beforeEach(async () => {
    await ctx.reset();
    ahmed = await customerSession(ctx);
  });
  afterAll(() => ctx.close());

  it('saves cars, the first one being the default', async () => {
    await cars().list().expect(200, []);
    const a = await cars().add(polo).expect(201);
    expect(a.body).toEqual({ id: expect.any(String), ...polo, isDefault: true });
    const b = await cars().add({ ...picanto, brand: '  Kia  ' }).expect(201);
    expect(b.body).toMatchObject({ brand: 'Kia', isDefault: false });
    expect((await cars().list().expect(200)).body.map((c: { id: string }) => c.id)).toEqual([a.body.id, b.body.id]);
  });

  it('edits a car and moves the default', async () => {
    const a = (await cars().add(polo).expect(201)).body;
    const b = (await cars().add({ ...picanto, isDefault: true }).expect(201)).body;
    expect(b.isDefault).toBe(true);
    let list = (await cars().list().expect(200)).body;
    expect(list.map((c: { id: string; isDefault: boolean }) => [c.id, c.isDefault])).toEqual([[b.id, true], [a.id, false]]);

    await cars().edit(a.id, { plate: '216 TU 1' }).expect(200);
    await cars().edit(a.id, { isDefault: true }).expect(200);
    list = (await cars().list().expect(200)).body;
    expect(list.map((c: { id: string; isDefault: boolean; plate: string }) => [c.id, c.isDefault, c.plate]))
      .toEqual([[a.id, true, '216 TU 1'], [b.id, false, picanto.plate]]);
  });

  it('hands the default to the next car when the default one is deleted', async () => {
    const a = (await cars().add(polo).expect(201)).body;
    const b = (await cars().add(picanto).expect(201)).body;
    await cars().remove(a.id).expect(204);
    expect((await cars().list().expect(200)).body).toEqual([{ ...b, isDefault: true }]);
  });

  it('keeps cars private to their owner', async () => {
    const a = (await cars().add(polo).expect(201)).body;
    const sami = await customerSession(ctx, '22345672', 'Sami Trabelsi');
    await cars(sami).list().expect(200, []);
    expect((await cars(sami).edit(a.id, { model: 'Golf' }).expect(404)).body.code).toBe('CAR_NOT_FOUND');
    await cars(sami).remove(a.id).expect(404);
    const owner = await ownerSession(ctx);
    await ctx.http().get('/v1/me/cars').set(bearer(owner.token)).expect(401);
  });

  it('validates the car', async () => {
    await cars().add({ ...polo, brand: '' }).expect(400);
    await cars().add({ ...polo, plate: 'x'.repeat(21) }).expect(400);
    await cars().add({ brand: 'Kia' }).expect(400);
    await cars().edit('not-a-uuid', { model: 'Golf' }).expect(400);
  });

  it('deletes the cars of a deleted customer', async () => {
    await cars().add(polo).expect(201);
    await ctx.db.query(`DELETE FROM customers WHERE id = $1`, [ahmed.customerId]);
    const [{ count }] = await ctx.db.query(`SELECT count(*)::int AS count FROM customer_cars`);
    expect(count).toBe(0);
  });
});
