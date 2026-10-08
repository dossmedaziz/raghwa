# garage-api

Backend for **Raghwa**: the garage-owner website (`garage-web`) and the customer mobile app (`customer-app`).

NestJS 12 · Node 24 · TypeORM 1.1 · PostgreSQL 17 + PostGIS · Jest + Supertest · Swagger

## Run it (Docker only, nothing to install on your machine)

```bash
cp .env.example .env
docker compose up -d --build
```

This starts PostgreSQL (`db`), the test database (`db-test`) and the API. The API container runs the migrations,
then `nest start --watch`: the source folder is mounted, so saving a file reloads the server.

- API: http://localhost:3000
- Owner API docs (garage-web): http://localhost:3000/docs/owner
- Customer API docs (mobile app): http://localhost:3000/docs/customer
- OpenAPI JSON for client generation: `/docs/owner/openapi.json`, `/docs/customer/openapi.json`

In development, SMS (OTP codes included) are printed to the API log:

```bash
docker compose logs -f api
```

Every npm command runs inside the container with `docker compose exec api …`:

```bash
docker compose exec api npm test            # unit tests
docker compose exec api npm run test:e2e    # every endpoint against the db-test database
docker compose exec api npm run migration:show
```

After changing `package.json` (adding a dependency), rebuild the image and refresh the container's `node_modules`:

```bash
docker compose up -d --build -V api
```

To write `package-lock.json` into the project folder (commit it, so builds are reproducible):

```bash
docker compose run --rm --no-deps api npm install
```

E2E tests boot the real `AppModule` with a frozen clock (Wed 21 Oct 2026, 11:15 Tunis) and a fake SMS gateway
that captures OTP codes. Each test starts from empty tables.

## Production

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Builds the compiled app into a small image, runs the migrations once (`migrate` service), then starts the API.
Use strong secrets in `.env` (`openssl rand -base64 48`) and set `SWAGGER_ENABLED=false` if the docs must not be public.

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
docker compose exec api npm run migration:generate -- src/database/migrations/AddSomething
```

Then add the new class to `src/database/migrations/index.ts`; it is applied on the next `docker compose restart api`.
The constraint names are deterministic (`fk_reservations_garage_id`, …), so right after `migration:run` on a fresh
database, `migration:generate` should report no changes. Run it once to confirm the hand-written initial migration
matches the entities.

## Not built yet

- A real SMS provider (implement `SmsSender` in `src/core/sms/`)
- Garage photo and logo uploads
- The 07:30 daily summary (needs a scheduler, e.g. `@nestjs/schedule` or BullMQ)
- Admin API (the layout leaves room for `src/api/admin/`)
