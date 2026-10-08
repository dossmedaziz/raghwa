import {
  bearer, book, customerSession, ownerSession, publishedGarage, type CustomerSession, type GarageFixture, type OwnerSession,
} from './utils/factories';
import { SUNDAY, TODAY, TOMORROW, createTestApp, type TestContext } from './utils/test-app';

describe('Customer reservations (/v1/reservations)', () => {
  let ctx: TestContext;
  let owner: OwnerSession;
  let g: GarageFixture;
  let ahmed: CustomerSession;
  const slot = (patch: object = {}) => ({ garageId: g.garageId, date: TOMORROW, time: '09:30', serviceIds: g.serviceIds, ...patch });

  beforeAll(async () => (ctx = await createTestApp()));
  beforeEach(async () => {
    await ctx.reset();
    owner = await ownerSession(ctx);
    g = await publishedGarage(ctx, owner);
    ahmed = await customerSession(ctx);
    ctx.sms.messages = [];
  });
  afterAll(() => ctx.close());

  describe('booking', () => {
    it('books a slot with a price snapshot and history', async () => {
      const res = await book(ctx, ahmed, slot({ car: { brand: 'Volkswagen', model: 'Polo', plate: '225 TU 6431' } }));
      expect(res.body).toMatchObject({
        ref: expect.stringMatching(/^RGW-[A-Z0-9]{6}$/),
        date: TOMORROW,
        time: '09:30',
        status: 'upcoming',
        cancelledBy: null,
        total: 30,
        car: { brand: 'Volkswagen', model: 'Polo', plate: '225 TU 6431' },
        garage: { id: g.garageId, name: 'Raghwa Wash La Marsa', phone: '71774512' },
        history: [{ type: 'booked', actor: 'customer', previousDate: null, previousTime: null, at: '2026-10-21T10:15:00.000Z' }],
      });
      expect(res.body.lines).toHaveLength(2);
      expect(res.body).not.toHaveProperty('customer');
    });

    it('notifies the garage in-app and by SMS', async () => {
      const res = await book(ctx, ahmed, slot());
      expect(ctx.sms.to(owner.phone)).toEqual([{ phone: owner.phone, message: expect.stringContaining(res.body.ref) }]);
      const notifs = await ctx.http().get(`/v1/owner/garages/${g.garageId}/notifications`).set(bearer(owner.token)).expect(200);
      expect(notifs.body.items[0]).toMatchObject({
        type: 'reservation_created',
        reservationId: res.body.id,
        unread: true,
        data: { ref: res.body.ref, customerName: 'Ahmed Ben Salah', date: TOMORROW, time: '09:30' },
      });
    });

    it('skips the owner SMS when the owner turned it off', async () => {
      await ctx.http().patch('/v1/owner/me/notifications').set(bearer(owner.token)).send({ newBooking: false }).expect(200);
      await book(ctx, ahmed, slot());
      expect(ctx.sms.to(owner.phone)).toEqual([]);
    });

    it('fills a slot up to the garage capacity', async () => {
      const b = await customerSession(ctx, '22000002');
      const c = await customerSession(ctx, '22000003');
      await book(ctx, ahmed, slot());
      await book(ctx, b, slot());
      expect((await book(ctx, c, slot(), 409)).body.code).toBe('SLOT_FULL');
      // Another slot still has room.
      await book(ctx, c, slot({ time: '10:00' }));
    });

    it('never overbooks under concurrent requests', async () => {
      const customers = await Promise.all(['22100001', '22100002', '22100003', '22100004', '22100005'].map((p) => customerSession(ctx, p)));
      const results = await Promise.all(
        customers.map((c) => ctx.http().post('/v1/reservations').set(bearer(c.token)).send(slot({ time: '16:00' }))),
      );
      const statuses = results.map((r) => r.status).sort();
      expect(statuses).toEqual([201, 201, 409, 409, 409]);
    });

    it('refuses a second booking by the same customer in the same slot', async () => {
      await book(ctx, ahmed, slot());
      expect((await book(ctx, ahmed, slot(), 409)).body.code).toBe('DUPLICATE_BOOKING');
    });

    it.each([
      ['a slot that already started', { date: TODAY, time: '11:00' }, 'SLOT_IN_PAST'],
      ['a past day', { date: '2026-10-20', time: '09:00' }, 'SLOT_IN_PAST'],
      ['a closed day', { date: SUNDAY, time: '09:00' }, 'GARAGE_CLOSED'],
      ['the lunch break', { time: '13:00' }, 'NOT_A_SLOT'],
      ['an off-grid time', { time: '09:15' }, 'NOT_A_SLOT'],
      ['beyond the booking window', { date: '2027-01-15' }, 'BOOKING_TOO_FAR'],
    ])('rejects %s', async (_label, patch, code) => {
      expect((await book(ctx, ahmed, slot(patch), 422)).body.code).toBe(code);
    });

    it('rejects blocked days and slots', async () => {
      await ctx.http().put(`/v1/owner/garages/${g.garageId}/blocks/slots/${TOMORROW}/09:30`).set(bearer(owner.token)).send({ reason: 'other' }).expect(200);
      expect((await book(ctx, ahmed, slot(), 422)).body.code).toBe('SLOT_BLOCKED');
      await ctx.http().put(`/v1/owner/garages/${g.garageId}/blocks/days/${TOMORROW}`).set(bearer(owner.token)).send({ reason: 'holiday' }).expect(200);
      expect((await book(ctx, ahmed, slot({ time: '10:00' }), 422)).body.code).toBe('DAY_BLOCKED');
    });

    it('only accepts active services of this garage', async () => {
      await ctx.http().patch(`/v1/owner/garages/${g.garageId}/services/${g.serviceIds[1]}`).set(bearer(owner.token)).send({ isActive: false }).expect(200);
      const res = await book(ctx, ahmed, slot(), 422);
      expect(res.body).toMatchObject({ code: 'INVALID_SERVICES', details: { serviceIds: [g.serviceIds[1]] } });

      const other = await publishedGarage(ctx, owner, { name: 'Other' });
      await book(ctx, ahmed, slot({ serviceIds: [other.serviceIds[0]] }), 422);
    });

    it('404s for unpublished garages', async () => {
      await ctx.http().post(`/v1/owner/garages/${g.garageId}/unpublish`).set(bearer(owner.token)).expect(200);
      expect((await book(ctx, ahmed, slot(), 404)).body.code).toBe('GARAGE_NOT_FOUND');
    });

    it.each([
      [{ serviceIds: [] }],
      [{ serviceIds: ['not-a-uuid'] }],
      [{ date: '22-10-2026' }],
      [{ time: '9:30' }],
      [{ garageId: 'x' }],
      [{ car: { brand: 'x'.repeat(41) } }],
      [{ status: 'done' }],
    ])('validates the body (%o)', async (patch) => {
      await book(ctx, ahmed, slot(patch), 400);
    });

    it('requires a customer token', async () => {
      await ctx.http().post('/v1/reservations').send(slot()).expect(401);
    });
  });

  describe('my reservations', () => {
    it('separates upcoming and past', async () => {
      const later = await book(ctx, ahmed, slot({ date: '2026-10-23', time: '09:00' }));
      const sooner = await book(ctx, ahmed, slot());
      const today = await book(ctx, ahmed, slot({ date: TODAY, time: '15:00' }));
      await ctx.http().post(`/v1/reservations/${today.body.id}/cancel`).set(bearer(ahmed.token)).expect(200);

      const upcoming = await ctx.http().get('/v1/reservations').set(bearer(ahmed.token)).expect(200);
      expect(upcoming.body.items.map((r: { id: string }) => r.id)).toEqual([sooner.body.id, later.body.id]);
      expect(upcoming.body.meta.total).toBe(2);

      const past = await ctx.http().get('/v1/reservations').query({ scope: 'past' }).set(bearer(ahmed.token)).expect(200);
      expect(past.body.items.map((r: { id: string }) => r.id)).toEqual([today.body.id]);
    });

    it('never shows another customer’s reservation', async () => {
      const res = await book(ctx, ahmed, slot());
      const other = await customerSession(ctx, '22000009');
      expect((await ctx.http().get(`/v1/reservations/${res.body.id}`).set(bearer(other.token)).expect(404)).body.code).toBe('RESERVATION_NOT_FOUND');
      await ctx.http().post(`/v1/reservations/${res.body.id}/cancel`).set(bearer(other.token)).expect(404);
      expect((await ctx.http().get('/v1/reservations').set(bearer(other.token)).expect(200)).body.items).toEqual([]);
    });
  });

  describe('cancelling', () => {
    it('cancels, records who did it and notifies the garage', async () => {
      const r = await book(ctx, ahmed, slot());
      const res = await ctx.http().post(`/v1/reservations/${r.body.id}/cancel`).set(bearer(ahmed.token)).expect(200);
      expect(res.body).toMatchObject({ status: 'cancelled', cancelledBy: 'customer' });
      expect(res.body.history.map((h: { type: string }) => h.type)).toEqual(['booked', 'cancelled']);

      const notifs = await ctx.http().get(`/v1/owner/garages/${g.garageId}/notifications`).set(bearer(owner.token)).expect(200);
      expect(notifs.body.items[0]).toMatchObject({ type: 'reservation_cancelled', reservationId: r.body.id });

      // The place is free again.
      const b = await customerSession(ctx, '22000002');
      const c = await customerSession(ctx, '22000003');
      await book(ctx, b, slot());
      await book(ctx, c, slot());
    });

    it('cannot cancel twice or after the slot started', async () => {
      const r = await book(ctx, ahmed, slot());
      await ctx.http().post(`/v1/reservations/${r.body.id}/cancel`).set(bearer(ahmed.token)).expect(200);
      expect((await ctx.http().post(`/v1/reservations/${r.body.id}/cancel`).set(bearer(ahmed.token)).expect(409)).body.code).toBe(
        'RESERVATION_NOT_UPCOMING',
      );

      const started = await book(ctx, ahmed, slot({ time: '10:00' }));
      ctx.clock.set('2026-10-22T09:00:00Z'); // 10:00 in Tunis
      expect((await ctx.http().post(`/v1/reservations/${started.body.id}/cancel`).set(bearer(ahmed.token)).expect(422)).body.code).toBe(
        'RESERVATION_STARTED',
      );
    });
  });

  describe('rescheduling', () => {
    it('moves the booking, keeps the old slot in history and notifies the garage', async () => {
      const r = await book(ctx, ahmed, slot());
      const res = await ctx.http().post(`/v1/reservations/${r.body.id}/reschedule`).set(bearer(ahmed.token))
        .send({ date: '2026-10-23', time: '15:00' }).expect(200);
      expect(res.body).toMatchObject({ id: r.body.id, ref: r.body.ref, date: '2026-10-23', time: '15:00', status: 'upcoming' });
      expect(res.body.history[1]).toMatchObject({ type: 'rescheduled', actor: 'customer', previousDate: TOMORROW, previousTime: '09:30' });

      const notifs = await ctx.http().get(`/v1/owner/garages/${g.garageId}/notifications`).set(bearer(owner.token)).expect(200);
      expect(notifs.body.items[0]).toMatchObject({
        type: 'reservation_rescheduled',
        data: { date: '2026-10-23', time: '15:00', previousDate: TOMORROW, previousTime: '09:30' },
      });
    });

    it('applies the booking rules to the new slot', async () => {
      const r = await book(ctx, ahmed, slot());
      const reschedule = (body: object) => ctx.http().post(`/v1/reservations/${r.body.id}/reschedule`).set(bearer(ahmed.token)).send(body);

      expect((await reschedule({ date: TOMORROW, time: '09:30' }).expect(422)).body.code).toBe('SAME_SLOT');
      expect((await reschedule({ date: SUNDAY, time: '09:30' }).expect(422)).body.code).toBe('GARAGE_CLOSED');

      const b = await customerSession(ctx, '22000002');
      const c = await customerSession(ctx, '22000003');
      await book(ctx, b, slot({ time: '11:00' }));
      await book(ctx, c, slot({ time: '11:00' }));
      expect((await reschedule({ date: TOMORROW, time: '11:00' }).expect(409)).body.code).toBe('SLOT_FULL');
    });

    it('frees the old place and lets the customer move back', async () => {
      // Capacity 2: Ahmed and B fill 09:30. Ahmed moves to 10:00, which frees a place, so moving back works.
      const r = await book(ctx, ahmed, slot());
      const b = await customerSession(ctx, '22000002');
      await book(ctx, b, slot());
      await ctx.http().post(`/v1/reservations/${r.body.id}/reschedule`).set(bearer(ahmed.token)).send({ date: TOMORROW, time: '10:00' }).expect(200);
      await ctx.http().post(`/v1/reservations/${r.body.id}/reschedule`).set(bearer(ahmed.token)).send({ date: TOMORROW, time: '09:30' }).expect(200);
    });
  });
});
