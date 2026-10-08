import { DEFAULT_OWNER, seedDefaultOwner } from '../src/database/seeds/default-owner.seed';
import { Owner } from '../src/core/owners/owner.entity';
import { createTestApp, type TestContext } from './utils/test-app';

describe('Seeder: default owner', () => {
  let ctx: TestContext;

  beforeAll(async () => (ctx = await createTestApp()));
  beforeEach(() => ctx.reset());
  afterAll(() => ctx.close());

  it('creates a verified owner who can log in right away', async () => {
    expect((await seedDefaultOwner(ctx.db)).created).toBe(true);
    const res = await ctx.http().post('/v1/owner/auth/login').send({ phone: '52 226 876', password: 'testtest' }).expect(200);
    expect(res.body.owner).toMatchObject({ name: 'Mohamed Aziz Doss', phone: '52226876' });
  });

  it('is idempotent and keeps a password changed in the app', async () => {
    await seedDefaultOwner(ctx.db);
    const login = await ctx.http().post('/v1/owner/auth/login').send({ phone: DEFAULT_OWNER.phone, password: DEFAULT_OWNER.password });
    await ctx.http().put('/v1/owner/me/password').set({ Authorization: `Bearer ${login.body.tokens.accessToken}` })
      .send({ currentPassword: 'testtest', newPassword: 'changed-pass' }).expect(204);

    expect((await seedDefaultOwner(ctx.db)).created).toBe(false);
    expect(await ctx.db.getRepository(Owner).countBy({ phone: DEFAULT_OWNER.phone })).toBe(1);
    await ctx.http().post('/v1/owner/auth/login').send({ phone: DEFAULT_OWNER.phone, password: 'changed-pass' }).expect(200);
  });

  it('confirms the phone of an existing unverified account', async () => {
    await ctx.http().post('/v1/owner/auth/signup').send({ name: 'Pending', phone: DEFAULT_OWNER.phone, password: 'pending-pass' }).expect(202);
    await seedDefaultOwner(ctx.db);
    await ctx.http().post('/v1/owner/auth/login').send({ phone: DEFAULT_OWNER.phone, password: 'pending-pass' }).expect(200);
  });
});
