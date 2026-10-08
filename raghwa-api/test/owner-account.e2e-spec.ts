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
