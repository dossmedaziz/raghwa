import { bearer, book, customerSession, ownerSession, publishedGarage } from './utils/factories';
import { TOMORROW, createTestApp, type TestContext } from './utils/test-app';

describe('Customer auth & account (/v1/auth, /v1/me)', () => {
  let ctx: TestContext;
  const phone = '22345671';
  const password = 'raghwa2026';
  const register = (body: object = {}) => ctx.http().post('/v1/auth/register').send({ name: 'Ahmed Ben Salah', phone, password, ...body });
  const login = (body: object = {}) => ctx.http().post('/v1/auth/login').send({ phone, password, ...body });

  beforeAll(async () => (ctx = await createTestApp()));
  beforeEach(() => ctx.reset());
  afterAll(() => ctx.close());

  it('registers, logs in with the password and sends no SMS', async () => {
    const reg = await register().expect(201);
    expect(reg.body).toMatchObject({ customer: { phone, name: 'Ahmed Ben Salah' }, tokens: { accessToken: expect.any(String) } });
    expect(reg.body.customer).not.toHaveProperty('passwordHash');

    const res = await login().expect(200);
    expect(res.body.customer.id).toBe(reg.body.customer.id);
    const me = await ctx.http().get('/v1/me').set(bearer(res.body.tokens.accessToken)).expect(200);
    expect(me.body).toEqual({ id: reg.body.customer.id, phone, name: 'Ahmed Ben Salah' });
    expect(ctx.sms.messages).toHaveLength(0);
  });

  it('refuses a phone number that already has an account', async () => {
    await register().expect(201);
    expect((await register({ name: 'Someone Else' }).expect(409)).body.code).toBe('PHONE_TAKEN');
  });

  it('lets an account from the former SMS login set a password by registering', async () => {
    const [legacy] = await ctx.db.query(`INSERT INTO customers (phone, name) VALUES ($1, NULL) RETURNING id`, [phone]);
    expect((await login().expect(401)).body.code).toBe('INVALID_CREDENTIALS');
    const reg = await register().expect(201);
    expect(reg.body.customer.id).toBe(legacy.id);
    await login().expect(200);
  });

  it('rejects a wrong password or unknown number with the same error', async () => {
    await register().expect(201);
    expect((await login({ password: 'wrong-password' }).expect(401)).body.code).toBe('INVALID_CREDENTIALS');
    expect((await login({ phone: '22000000' }).expect(401)).body.code).toBe('INVALID_CREDENTIALS');
  });

  it('validates the sign-up', async () => {
    await register({ password: 'short' }).expect(400);
    await register({ name: 'A' }).expect(400);
    await register({ phone: '1234' }).expect(400);
  });

  it('refreshes and logs out', async () => {
    const { tokens } = (await register().expect(201)).body;
    const refreshed = await ctx.http().post('/v1/auth/refresh').send({ refreshToken: tokens.refreshToken }).expect(200);
    await ctx.http().get('/v1/me').set(bearer(refreshed.body.accessToken)).expect(200);
    await ctx.http().post('/v1/auth/logout').send({ refreshToken: refreshed.body.refreshToken }).expect(204);
    await ctx.http().post('/v1/auth/refresh').send({ refreshToken: refreshed.body.refreshToken }).expect(401);
  });

  it('does not accept owner tokens on customer routes', async () => {
    const owner = await ownerSession(ctx);
    await ctx.http().get('/v1/me').set(bearer(owner.token)).expect(401);
    await ctx.http().get('/v1/reservations').set(bearer(owner.token)).expect(401);
  });

  it('validates the profile', async () => {
    const { tokens } = (await register().expect(201)).body;
    await ctx.http().patch('/v1/me').set(bearer(tokens.accessToken)).send({ name: 'A' }).expect(400);
    await ctx.http().patch('/v1/me').set(bearer(tokens.accessToken)).send({ phone: '50000000' }).expect(400);
  });

  it('deletes the reservations of a deleted customer', async () => {
    const g = await publishedGarage(ctx, await ownerSession(ctx));
    const ahmed = await customerSession(ctx, '22345672');
    await book(ctx, ahmed, { garageId: g.garageId, date: TOMORROW, time: '09:30', serviceIds: g.serviceIds });
    await ctx.db.query(`DELETE FROM customers WHERE id = $1`, [ahmed.customerId]);
    const [{ count }] = await ctx.db.query(`SELECT count(*)::int AS count FROM reservations`);
    expect(count).toBe(0);
  });
});
