import { bearer, ownerSession } from './utils/factories';
import { createTestApp, type TestContext } from './utils/test-app';

describe('Customer auth & account (/v1/auth, /v1/me)', () => {
  let ctx: TestContext;
  const phone = '22345671';
  const requestCode = () => ctx.http().post('/v1/auth/otp').send({ phone });
  const verify = (code = ctx.sms.lastCode(phone)) => ctx.http().post('/v1/auth/otp/verify').send({ phone, code });

  beforeAll(async () => (ctx = await createTestApp()));
  beforeEach(() => ctx.reset());
  afterAll(() => ctx.close());

  it('creates the account on first login and flags it as new until a name is set', async () => {
    await requestCode().expect(202);
    const first = await verify().expect(200);
    expect(first.body).toMatchObject({ customer: { phone, name: null }, isNew: true });

    const me = await ctx.http().patch('/v1/me').set(bearer(first.body.tokens.accessToken)).send({ name: 'Ahmed Ben Salah' }).expect(200);
    expect(me.body).toEqual({ id: first.body.customer.id, phone, name: 'Ahmed Ben Salah' });

    ctx.clock.advance(60);
    await requestCode().expect(202);
    const second = await verify().expect(200);
    expect(second.body).toMatchObject({ customer: { id: first.body.customer.id, name: 'Ahmed Ben Salah' }, isNew: false });
  });

  it('rejects wrong, reused and malformed codes', async () => {
    await requestCode().expect(202);
    const code = ctx.sms.lastCode(phone);
    await verify(code === '9999' ? '0000' : '9999').expect(422);
    await verify(code).expect(200);
    expect((await verify(code).expect(422)).body.code).toBe('OTP_INVALID');
    await ctx.http().post('/v1/auth/otp/verify').send({ phone, code: '12' }).expect(400);
  });

  it('limits how often a code can be requested', async () => {
    await requestCode().expect(202);
    expect((await requestCode().expect(429)).body.code).toBe('OTP_COOLDOWN');
    ctx.clock.advance(59);
    await requestCode().expect(429);
    ctx.clock.advance(1);
    await requestCode().expect(202);
  });

  it('refreshes and logs out', async () => {
    await requestCode().expect(202);
    const { tokens } = (await verify().expect(200)).body;
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
    await requestCode().expect(202);
    const { tokens } = (await verify().expect(200)).body;
    await ctx.http().patch('/v1/me').set(bearer(tokens.accessToken)).send({ name: 'A' }).expect(400);
    await ctx.http().patch('/v1/me').set(bearer(tokens.accessToken)).send({ phone: '50000000' }).expect(400);
  });
});
