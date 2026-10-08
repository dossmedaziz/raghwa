import { bearer, ownerSession, type OwnerSession } from './utils/factories';
import { createTestApp, type TestContext } from './utils/test-app';

describe('Owner account (/v1/owner/me)', () => {
  let ctx: TestContext;
  let owner: OwnerSession;

  beforeAll(async () => (ctx = await createTestApp()));
  beforeEach(async () => {
    await ctx.reset();
    owner = await ownerSession(ctx);
  });
  afterAll(() => ctx.close());

  it('returns the profile with default notification preferences', async () => {
    const res = await ctx.http().get('/v1/owner/me').set(bearer(owner.token)).expect(200);
    expect(res.body).toMatchObject({
      id: owner.ownerId,
      name: 'Karim Mansouri',
      phone: '98123456',
      notifications: { newBooking: true, cancellation: true, reschedule: true, dailySummary: false },
    });
  });

  it('updates the name (trimmed) and validates it', async () => {
    const res = await ctx.http().patch('/v1/owner/me').set(bearer(owner.token)).send({ name: '  Karim M.  ' }).expect(200);
    expect(res.body.name).toBe('Karim M.');
    await ctx.http().patch('/v1/owner/me').set(bearer(owner.token)).send({ name: 'K' }).expect(400);
    await ctx.http().patch('/v1/owner/me').set(bearer(owner.token)).send({ phone: '22222222' }).expect(400);
  });

  it('changes the password only with the current one', async () => {
    const wrong = await ctx.http().put('/v1/owner/me/password').set(bearer(owner.token))
      .send({ currentPassword: 'nope', newPassword: 'another-pass' }).expect(422);
    expect(wrong.body.code).toBe('WRONG_PASSWORD');

    await ctx.http().put('/v1/owner/me/password').set(bearer(owner.token))
      .send({ currentPassword: owner.password, newPassword: 'another-pass' }).expect(204);
    await ctx.http().post('/v1/owner/auth/login').send({ phone: owner.phone, password: 'another-pass' }).expect(200);
  });

  it('updates notification preferences partially', async () => {
    const res = await ctx.http().patch('/v1/owner/me/notifications').set(bearer(owner.token))
      .send({ newBooking: false, dailySummary: true }).expect(200);
    expect(res.body.notifications).toEqual({ newBooking: false, cancellation: true, reschedule: true, dailySummary: true });
    await ctx.http().patch('/v1/owner/me/notifications').set(bearer(owner.token)).send({ newBooking: 'yes' }).expect(400);
  });
});

describe('Owner phone change (/v1/owner/me/phone)', () => {
  let ctx: TestContext;
  let owner: OwnerSession;
  const newPhone = '55667788';

  beforeAll(async () => (ctx = await createTestApp()));
  beforeEach(async () => {
    await ctx.reset();
    owner = await ownerSession(ctx);
  });
  afterAll(() => ctx.close());

  it('changes the number once the code sent to the new number is confirmed', async () => {
    const sent = await ctx.http().post('/v1/owner/me/phone').set(bearer(owner.token)).send({ phone: '55 667 788' }).expect(202);
    expect(sent.body).toEqual({ phone: newPhone, resendAfterSeconds: 60 });

    const res = await ctx.http().post('/v1/owner/me/phone/verify').set(bearer(owner.token))
      .send({ phone: newPhone, code: ctx.sms.lastCode(newPhone) }).expect(200);
    expect(res.body.phone).toBe(newPhone);

    await ctx.http().post('/v1/owner/auth/login').send({ phone: newPhone, password: owner.password }).expect(200);
    await ctx.http().post('/v1/owner/auth/login').send({ phone: owner.phone, password: owner.password }).expect(401);
  });

  it('keeps the old number on a wrong code', async () => {
    await ctx.http().post('/v1/owner/me/phone').set(bearer(owner.token)).send({ phone: newPhone }).expect(202);
    const wrong = ctx.sms.lastCode(newPhone) === '0000' ? '1111' : '0000';
    expect((await ctx.http().post('/v1/owner/me/phone/verify').set(bearer(owner.token)).send({ phone: newPhone, code: wrong }).expect(422)).body.code)
      .toBe('OTP_INVALID');
    expect((await ctx.http().get('/v1/owner/me').set(bearer(owner.token)).expect(200)).body.phone).toBe(owner.phone);
  });

  it('refuses a number used by another account, or the current one', async () => {
    await ownerSession(ctx, newPhone);
    expect((await ctx.http().post('/v1/owner/me/phone').set(bearer(owner.token)).send({ phone: newPhone }).expect(409)).body.code).toBe('PHONE_TAKEN');
    expect((await ctx.http().post('/v1/owner/me/phone').set(bearer(owner.token)).send({ phone: owner.phone }).expect(422)).body.code).toBe('SAME_PHONE');
    await ctx.http().post('/v1/owner/me/phone').set(bearer(owner.token)).send({ phone: '123' }).expect(400);
  });
});
