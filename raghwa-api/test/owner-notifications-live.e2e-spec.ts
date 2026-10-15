import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { bearer, book, customerSession, ownerSession, publishedGarage, type GarageFixture, type OwnerSession } from './utils/factories';
import { TOMORROW, createTestApp, type TestContext } from './utils/test-app';

interface SseEvent {
  event: string;
  data: unknown;
}

/** Opens the SSE stream with fetch (like garage-web) and collects parsed events. */
async function openStream(base: string, path: string, token: string) {
  const ctrl = new AbortController();
  const res = await fetch(base + path, { headers: { ...bearer(token), Accept: 'text/event-stream' }, signal: ctrl.signal });
  const events: SseEvent[] = [];
  let ended = false;
  if (res.ok && res.body) {
    void (async () => {
      const decoder = new TextDecoder();
      let buf = '';
      try {
        for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
          buf += decoder.decode(chunk, { stream: true });
          let i: number;
          while ((i = buf.indexOf('\n\n')) >= 0) {
            const block = buf.slice(0, i);
            buf = buf.slice(i + 2);
            const event = /^event: (.*)$/m.exec(block)?.[1] ?? 'message';
            const data = /^data: (.*)$/m.exec(block)?.[1];
            events.push({ event, data: data ? JSON.parse(data) : null });
          }
        }
      } catch {
        /* aborted */
      }
      ended = true;
    })();
  }
  const waitFor = async (pred: (e: SseEvent[]) => boolean) => {
    for (let i = 0; i < 100 && !pred(events); i++) await new Promise((r) => setTimeout(r, 20));
    return events;
  };
  return { res, events, waitFor, ended: () => ended, close: () => ctrl.abort() };
}

describe('Owner live notifications (/v1/owner/garages/:garageId/notifications/stream)', () => {
  let ctx: TestContext;
  let base: string;
  let owner: OwnerSession;
  let g: GarageFixture;
  const path = (garageId = g.garageId) => `/v1/owner/garages/${garageId}/notifications/stream`;

  beforeAll(async () => {
    ctx = await createTestApp();
    const server = ctx.app.getHttpServer() as unknown as Server;
    await new Promise<void>((resolve) => server.listen(0, resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  beforeEach(async () => {
    await ctx.reset();
    owner = await ownerSession(ctx);
    g = await publishedGarage(ctx, owner);
  });
  afterAll(() => ctx.close());

  it('streams a notification the moment a customer books, cancels or reschedules', async () => {
    const stream = await openStream(base, path(), owner.token);
    try {
      expect(stream.res.status).toBe(200);
      expect(stream.res.headers.get('content-type')).toContain('text/event-stream');
      await stream.waitFor((e) => e.some((x) => x.event === 'ready'));

      const ahmed = await customerSession(ctx);
      const r = (await book(ctx, ahmed, { garageId: g.garageId, date: TOMORROW, time: '09:00', serviceIds: [g.serviceIds[0]] })).body;
      await ctx.http().post(`/v1/reservations/${r.id}/reschedule`).set(bearer(ahmed.token)).send({ date: TOMORROW, time: '10:00' }).expect(200);
      await ctx.http().post(`/v1/reservations/${r.id}/cancel`).set(bearer(ahmed.token)).expect(200);

      const events = await stream.waitFor((e) => e.filter((x) => x.event === 'notification').length === 3);
      const notifs = events.filter((x) => x.event === 'notification').map((x) => x.data);
      expect(notifs).toEqual([
        expect.objectContaining({ type: 'reservation_created', reservationId: r.id, unread: true, data: expect.objectContaining({ ref: r.ref, customerName: 'Ahmed Ben Salah', time: '09:00' }) }),
        expect.objectContaining({ type: 'reservation_rescheduled', data: expect.objectContaining({ time: '10:00', previousTime: '09:00' }) }),
        expect.objectContaining({ type: 'reservation_cancelled' }),
      ]);
      // Same payload as the list endpoint.
      const list = await ctx.http().get(`/v1/owner/garages/${g.garageId}/notifications`).set(bearer(owner.token)).expect(200);
      expect(list.body.items[2]).toEqual(notifs[0]);
    } finally {
      stream.close();
    }
  });

  it('only streams the garage’s own notifications', async () => {
    const other = await publishedGarage(ctx, owner, { name: 'Second garage' });
    const stream = await openStream(base, path(), owner.token);
    try {
      await stream.waitFor((e) => e.some((x) => x.event === 'ready'));
      const ahmed = await customerSession(ctx);
      await book(ctx, ahmed, { garageId: other.garageId, date: TOMORROW, time: '09:00', serviceIds: [other.serviceIds[0]] });
      await new Promise((r) => setTimeout(r, 200));
      expect(stream.events.filter((x) => x.event === 'notification')).toEqual([]);
    } finally {
      stream.close();
    }
  });

  it('requires the owner of the garage', async () => {
    const anonymous = await fetch(base + path());
    expect(anonymous.status).toBe(401);
    const stranger = await ownerSession(ctx, '97000000');
    const res = await fetch(base + path(), { headers: bearer(stranger.token) });
    expect(res.status).toBe(404);
  });
});

describe('Live notifications on shutdown', () => {
  it('ends open streams so the server can close right away', async () => {
    const ctx = await createTestApp();
    const server = ctx.app.getHttpServer() as unknown as Server;
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    await ctx.reset();
    const owner = await ownerSession(ctx);
    const g = await publishedGarage(ctx, owner);
    const stream = await openStream(base, `/v1/owner/garages/${g.garageId}/notifications/stream`, owner.token);
    await stream.waitFor((e) => e.some((x) => x.event === 'ready'));

    // Like garage-web: reconnect as soon as a stream ends (the client reuses its keep-alive socket).
    let reconnects = 0;
    let stop = false;
    const reconnecting = (async () => {
      let current = stream;
      for (;;) {
        for (let i = 0; i < 250 && !current.ended(); i++) await new Promise((r) => setTimeout(r, 20));
        if (stop || !current.ended()) return;
        try {
          current = await openStream(base, `/v1/owner/garages/${g.garageId}/notifications/stream`, owner.token);
          reconnects++;
        } catch {
          return; // server gone: what we want
        }
      }
    })();

    const started = Date.now();
    await ctx.close(); // would wait for the streams (up to the token lifetime) if they could outlive the shutdown
    expect(Date.now() - started).toBeLessThan(1_000);
    stop = true;
    await reconnecting;
    expect(stream.ended()).toBe(true);
    expect(reconnects).toBeLessThan(5);
  });
});
