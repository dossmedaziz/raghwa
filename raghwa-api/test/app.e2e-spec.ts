import { createTestApp, type TestContext } from './utils/test-app';

describe('App: health, docs and HTTP hardening', () => {
  let ctx: TestContext;

  beforeAll(async () => (ctx = await createTestApp({ swagger: true })));
  afterAll(() => ctx.close());

  it('reports health', async () => {
    expect((await ctx.http().get('/health').expect(200)).body).toEqual({ status: 'ok' });
  });

  it('serves one OpenAPI document per app, each with only its own routes', async () => {
    const owner = (await ctx.http().get('/docs/owner/openapi.json').expect(200)).body;
    const customer = (await ctx.http().get('/docs/customer/openapi.json').expect(200)).body;

    const ownerPaths = Object.keys(owner.paths);
    const customerPaths = Object.keys(customer.paths);
    expect(ownerPaths).toEqual(expect.arrayContaining(['/v1/owner/auth/login', '/v1/owner/garages/{garageId}/reservations']));
    expect(ownerPaths.every((p) => p.startsWith('/v1/owner/'))).toBe(true);
    expect(customerPaths).toEqual(expect.arrayContaining(['/v1/auth/register', '/v1/auth/login', '/v1/reservations', '/v1/garages/{garageId}/availability']));
    expect(customerPaths.some((p) => p.startsWith('/v1/owner/'))).toBe(false);
    expect(ownerPaths).not.toContain('/health');

    // Request bodies are documented with their validation rules.
    expect(owner.components.schemas.OwnerSignupDto.required).toEqual(expect.arrayContaining(['name', 'phone', 'password']));
    expect(customer.components.schemas.BookReservationDto.properties.serviceIds).toMatchObject({ type: 'array', minItems: 1 });
    expect(owner.components.securitySchemes.bearer).toBeDefined();
  });

  it('serves the Swagger UI', async () => {
    const res = await ctx.http().get('/docs/owner/').redirects(1);
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger');
  });

  it('sets security headers and answers CORS preflights only for known origins', async () => {
    const res = await ctx.http().get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');

    const allowed = await ctx.http().options('/v1/garages').set('Origin', 'http://localhost:5173').set('Access-Control-Request-Method', 'GET');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const denied = await ctx.http().options('/v1/garages').set('Origin', 'https://evil.example').set('Access-Control-Request-Method', 'GET');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('returns 404 JSON for unknown routes', async () => {
    expect((await ctx.http().get('/v1/nope').expect(404)).body).toMatchObject({ statusCode: 404 });
  });
});
