# garage-api

Backend for **Raghwa**: the garage-owner website (`garage-web`) and the customer mobile app (`customer-app`).

NestJS 12 · Node 24 · TypeORM 1.1 · PostgreSQL 17 + PostGIS · Jest + Supertest · Swagger

## Run it

```bash
cp .env.example .env
npm install
docker compose up -d db
npm run migration:run
npm run start:dev
```

- API: http://localhost:3000
- Owner API docs (garage-web): http://localhost:3000/docs/owner
- Customer API docs (mobile app): http://localhost:3000/docs/customer
- OpenAPI JSON for client generation: `/docs/owner/openapi.json`, `/docs/customer/openapi.json`

In development, SMS (OTP codes included) are printed to the server log instead of being sent.

## Tests

```bash
npm test                                   # unit tests (pure logic, no database)
docker compose --profile test up -d db-test
npm run test:e2e                           # every endpoint against a real PostGIS database on port 5433
```

E2E tests boot the real `AppModule` with a frozen clock (Wed 21 Oct 2026, 11:15 Tunis) and a fake SMS gateway
that captures OTP codes. Each test starts from empty tables.

## Everything in Docker

```bash
docker compose up -d --build   # db → migrate (one-off) → api
```

## Architecture

```
src/
  core/        business logic, no HTTP: auth, owners, customers, garages, catalog, scheduling,
               reservations, notifications, sms
  api/
    owner/     /v1/owner/...  controllers + DTOs used by garage-web (OwnerAuthGuard)
    customer/  /v1/...        controllers + DTOs used by the mobile app (CustomerAuthGuard)
    shared/    DTOs both apps use (tokens, hours, slots, reservation base)
  common/      clock, time/slot helpers, validation decorators, errors, pagination, crypto
  database/    TypeORM options, naming strategy, migrations
```

- **Two audiences, two token types.** Owner and customer JWTs are signed with different secrets and audiences;
  each guard only accepts its own. Refresh tokens are opaque, stored hashed, rotated on every use, and reusing
  an old one ends every session of that account.
- **Multi-garage owners.** Every `/v1/owner/garages/:garageId/...` route goes through `GarageOwnershipGuard`;
  another owner's garage answers 404.
- **No overbooking.** Booking and rescheduling lock the garage row (`SELECT … FOR UPDATE`) before checking slot
  capacity, so concurrent requests are serialised per garage (covered by an e2e test).
- **Errors** look like `{ statusCode, message, code? }`. Business errors have a stable `code`
  (`SLOT_FULL`, `OTP_COOLDOWN`, `GARAGE_INCOMPLETE`…) for the apps to translate.
- **Conventions:** dates `YYYY-MM-DD` and times `HH:MM` in `APP_TIMEZONE` (Africa/Tunis); prices in TND in the
  API, stored as integer millimes; phones are 8 local digits.

## Migrations

The schema only changes through migrations (`synchronize` is off).

```bash
npm run migration:generate -- src/database/migrations/AddSomething
```

Then add the new class to `src/database/migrations/index.ts` and run `npm run migration:run`.
The constraint names are deterministic (`fk_reservations_garage_id`, …), so right after `migration:run` on a fresh
database, `migration:generate` should report no changes. Run it once to confirm the hand-written initial migration
matches the entities.

## Not built yet

- A real SMS provider (implement `SmsSender` in `src/core/sms/`)
- Garage photo and logo uploads
- The 07:30 daily summary (needs a scheduler, e.g. `@nestjs/schedule` or BullMQ)
- Admin API (the layout leaves room for `src/api/admin/`)
