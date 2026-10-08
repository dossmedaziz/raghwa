import { bearer, customerSession, ownerSession } from './utils/factories';
import { createTestApp, type TestContext } from './utils/test-app';

describe('Owner auth (/v1/owner/auth)', () => {
  let ctx: TestContext;
  const phone = '98123456', password = 'raghwa2026';
  const signup = (body: object) => ctx.http().post('/v1/owner/auth/signup').send(body);
  const verify = (code: string) => ctx.http().post('/v1/owner/auth/signup/verify').send({ phone, code });
  const login = (body: object) => ctx.http().post('/v1/owner/auth/login').send(body);

  beforeAll(async () => (ctx = await createTestApp()));
  beforeEach(() => ctx.reset());
  afterAll(() => ctx.close());

  describe('sign-up', () => {
    it('texts a 4-digit code and accepts formatted phone numbers', async () => {
      const res = await signup({ name: 'Karim Mansouri', phone: '98 123 456', password }).expect(202);
      expect(res.body).toEqual({ phone, resendAfterSeconds: 60 });
      expect(ctx.sms.lastCode(phone)).toMatch(/^\d{4}$/);
    });

    it('logs the owner in once the code is confirmed', async () => {
      await signup({ name: 'Karim Mansouri', phone, password }).expect(202);
      const res = await verify(ctx.sms.lastCode(phone)).expect(200);
      expect(res.body.owner).toMatchObject({ name: 'Karim Mansouri', phone });
      expect(res.body.owner).not.toHaveProperty('passwordHash');
      expect(res.body.tokens).toEqual({ accessToken: expect.any(String), refreshToken: expect.any(String), expiresIn: 900 });
      await ctx.http().get('/v1/owner/me').set(bearer(res.body.tokens.accessToken)).expect(200);
    });

    it('refuses login until the phone is confirmed', async () => {
      await signup({ name: 'Karim Mansouri', phone, password }).expect(202);
      const res = await login({ phone, password }).expect(403);
      expect(res.body.code).toBe('PHONE_NOT_VERIFIED');
    });

    it('counts wrong codes and locks after too many attempts', async () => {
      await signup({ name: 'Karim Mansouri', phone, password }).expect(202);
      const wrong = ctx.sms.lastCode(phone) === '0000' ? '1111' : '0000';
      const first = await verify(wrong).expect(422);
      expect(first.body).toMatchObject({ code: 'OTP_INVALID', details: { remainingAttempts: 4 } });
      for (let i = 0; i < 4; i++) await verify(wrong).expect(422);
      const locked = await verify(ctx.sms.lastCode(phone)).expect(429);
      expect(locked.body.code).toBe('OTP_TOO_MANY_ATTEMPTS');
    });

    it('rejects an expired code', async () => {
      await signup({ name: 'Karim Mansouri', phone, password }).expect(202);
      ctx.clock.advance(301);
      expect((await verify(ctx.sms.lastCode(phone)).expect(422)).body.code).toBe('OTP_EXPIRED');
    });

    it('enforces the resend cooldown, then sends a fresh code that replaces the old one', async () => {
      await signup({ name: 'Karim Mansouri', phone, password }).expect(202);
      const oldCode = ctx.sms.lastCode(phone);
      const tooSoon = await ctx.http().post('/v1/owner/auth/signup/resend').send({ phone }).expect(429);
      expect(tooSoon.body).toMatchObject({ code: 'OTP_COOLDOWN', details: { retryAfterSeconds: 60 } });

      ctx.clock.advance(60);
      await ctx.http().post('/v1/owner/auth/signup/resend').send({ phone }).expect(202);
      const newCode = ctx.sms.lastCode(phone);
      if (newCode !== oldCode) await verify(oldCode).expect(422);
      await verify(newCode).expect(200);
    });

    it('rejects a phone number that already has an account', async () => {
      await ownerSession(ctx, phone);
      const res = await signup({ name: 'Someone Else', phone, password }).expect(409);
      expect(res.body.code).toBe('PHONE_TAKEN');
    });

    it.each([
      [{ name: 'Karim', phone: '12345678', password }, 'phone'],
      [{ name: 'Karim', phone, password: 'short' }, 'password'],
      [{ name: '  ', phone, password }, 'name'],
      [{ name: 'Karim', phone, password, role: 'admin' }, 'role'],
    ])('validates the body (%o)', async (body, field) => {
      const res = await signup(body).expect(400);
      expect(res.body.message.join(' ')).toContain(field);
    });
  });

  describe('login', () => {
    beforeEach(() => ownerSession(ctx, phone, password));

    it('returns the owner and tokens', async () => {
      const res = await login({ phone, password }).expect(200);
      expect(res.body.owner.phone).toBe(phone);
      expect(res.body.tokens.accessToken).toEqual(expect.any(String));
    });

    it('gives the same error for a wrong password and an unknown phone', async () => {
      expect((await login({ phone, password: 'wrong-password' }).expect(401)).body.code).toBe('INVALID_CREDENTIALS');
      expect((await login({ phone: '50000000', password }).expect(401)).body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('tokens', () => {
    it('rotates refresh tokens and treats reuse of an old one as theft', async () => {
      const s = await ownerSession(ctx);
      const r1 = await ctx.http().post('/v1/owner/auth/refresh').send({ refreshToken: s.refreshToken }).expect(200);
      expect(r1.body.refreshToken).not.toBe(s.refreshToken);

      // Replaying the first token fails and also kills the token issued by the rotation.
      expect((await ctx.http().post('/v1/owner/auth/refresh').send({ refreshToken: s.refreshToken }).expect(401)).body.code).toBe(
        'INVALID_REFRESH_TOKEN',
      );
      await ctx.http().post('/v1/owner/auth/refresh').send({ refreshToken: r1.body.refreshToken }).expect(401);
    });

    it('logout revokes the refresh token', async () => {
      const s = await ownerSession(ctx);
      await ctx.http().post('/v1/owner/auth/logout').send({ refreshToken: s.refreshToken }).expect(204);
      await ctx.http().post('/v1/owner/auth/refresh').send({ refreshToken: s.refreshToken }).expect(401);
    });

    it('rejects missing, malformed and customer tokens on owner routes', async () => {
      expect((await ctx.http().get('/v1/owner/me').expect(401)).body.code).toBe('MISSING_ACCESS_TOKEN');
      await ctx.http().get('/v1/owner/me').set(bearer('not-a-jwt')).expect(401);
      const customer = await customerSession(ctx);
      expect((await ctx.http().get('/v1/owner/me').set(bearer(customer.token)).expect(401)).body.code).toBe('INVALID_ACCESS_TOKEN');
    });

    it('does not accept an owner refresh token on the customer endpoint', async () => {
      const s = await ownerSession(ctx);
      await ctx.http().post('/v1/auth/refresh').send({ refreshToken: s.refreshToken }).expect(401);
    });
  });

  describe('forgot password', () => {
    it('resets the password in three steps and signs out every session', async () => {
      const s = await ownerSession(ctx, phone, password);
      ctx.sms.messages = [];

      await ctx.http().post('/v1/owner/auth/password/forgot').send({ phone }).expect(202);
      const verified = await ctx.http().post('/v1/owner/auth/password/verify').send({ phone, code: ctx.sms.lastCode(phone) }).expect(200);
      await ctx.http().post('/v1/owner/auth/password/reset').send({ resetToken: verified.body.resetToken, password: 'new-password-1' }).expect(204);

      await login({ phone, password }).expect(401);
      await login({ phone, password: 'new-password-1' }).expect(200);
      await ctx.http().post('/v1/owner/auth/refresh').send({ refreshToken: s.refreshToken }).expect(401);
    });

    it('does not reveal whether a number has an account', async () => {
      await ctx.http().post('/v1/owner/auth/password/forgot').send({ phone: '50000000' }).expect(202);
      expect(ctx.sms.messages).toHaveLength(0);
    });

    it('rejects a forged reset token', async () => {
      const forged = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.c2lnbmF0dXJl';
      const res = await ctx.http().post('/v1/owner/auth/password/reset').send({ resetToken: forged, password: 'new-password-1' }).expect(401);
      expect(res.body.code).toBe('INVALID_RESET_TOKEN');
    });
  });
});
