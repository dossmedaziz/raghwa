import type { TestContext } from './test-app';

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

export interface OwnerSession {
  ownerId: string;
  token: string;
  refreshToken: string;
  phone: string;
  password: string;
}

/** Signs an owner up and confirms the phone with the code captured by the fake SMS gateway. */
export async function ownerSession(ctx: TestContext, phone = '98123456', password = 'raghwa2026', name = 'Karim Mansouri'): Promise<OwnerSession> {
  await ctx.http().post('/v1/owner/auth/signup').send({ name, phone, password }).expect(202);
  const res = await ctx.http().post('/v1/owner/auth/signup/verify').send({ phone, code: ctx.sms.lastCode(phone) }).expect(200);
  return { ownerId: res.body.owner.id, token: res.body.tokens.accessToken, refreshToken: res.body.tokens.refreshToken, phone, password };
}

export interface CustomerSession {
  customerId: string;
  token: string;
  refreshToken: string;
  phone: string;
}

export async function customerSession(ctx: TestContext, phone = '22345671', name: string | null = 'Ahmed Ben Salah'): Promise<CustomerSession> {
  await ctx.http().post('/v1/auth/otp').send({ phone }).expect(202);
  const res = await ctx.http().post('/v1/auth/otp/verify').send({ phone, code: ctx.sms.lastCode(phone) }).expect(200);
  const s = { customerId: res.body.customer.id, token: res.body.tokens.accessToken, refreshToken: res.body.tokens.refreshToken, phone };
  if (name) await ctx.http().patch('/v1/me').set(bearer(s.token)).send({ name }).expect(200);
  return s;
}

export const COMPLETE_PROFILE = {
  name: 'Raghwa Wash La Marsa',
  description: 'Lavage à la main',
  phone: '71774512',
  address: 'Avenue Habib Bourguiba',
  area: 'La Marsa',
  city: 'Tunis',
  latitude: 36.8782,
  longitude: 10.3247,
  slotDurationMinutes: 30,
  capacity: 2,
};

export const SERVICES = [
  { nameAr: 'غسيل من برّا', nameFr: 'Lavage extérieur', price: 10 },
  { nameAr: 'غسيل كامل', nameFr: 'Lavage complet', price: 20 },
];

export interface GarageFixture {
  garageId: string;
  serviceIds: string[];
}

/** A published garage with the default week (Mon-Sat 08:00-19:00, weekday break 13-14), 30-min slots, capacity 2. */
export async function publishedGarage(ctx: TestContext, owner: OwnerSession, profile: Partial<typeof COMPLETE_PROFILE> = {}): Promise<GarageFixture> {
  const g = await ctx.http().post('/v1/owner/garages').set(bearer(owner.token)).send({ ...COMPLETE_PROFILE, ...profile }).expect(201);
  const serviceIds: string[] = [];
  for (const s of SERVICES) {
    const res = await ctx.http().post(`/v1/owner/garages/${g.body.id}/services`).set(bearer(owner.token)).send(s).expect(201);
    serviceIds.push(res.body.id);
  }
  await ctx.http().post(`/v1/owner/garages/${g.body.id}/publish`).set(bearer(owner.token)).expect(200);
  return { garageId: g.body.id, serviceIds };
}

export async function book(
  ctx: TestContext,
  customer: CustomerSession,
  body: { garageId: string; date: string; time: string; serviceIds: string[]; car?: object },
  expected = 201,
) {
  return ctx.http().post('/v1/reservations').set(bearer(customer.token)).send(body).expect(expected);
}
