# Raghwa Pro — garage owner dashboard

React + TypeScript + Vite + shadcn/ui implementation of the Claude Design prototype
(`../Raghwa garage dashboard prototype/`). All data comes from **raghwa-api** (`../raghwa-api`).

## Run

Start the API first (Docker), then the site:

```bash
cd ../raghwa-api && docker compose up -d --build
```

```bash
npm install
npm run dev
```

Open http://localhost:5173. The API URL is set in `.env.development` (`VITE_API_URL=http://localhost:3002`);
override it in `.env.local`. The API must allow this origin in its `CORS_ORIGINS`.

## Development login

The login form is pre-filled (development builds only) with the account created by the API seeder:
**52 226 876 / testtest** (Mohamed Aziz Doss).

SMS codes (sign-up, forgot password, phone change) are not really sent in development: read them in the API log.

```bash
docker compose -f ../raghwa-api/docker-compose.yml logs -f api
```

## How data flows

- `lib/api.ts`: typed client for every owner endpoint. Adds the access token, refreshes it once on 401
  (concurrent requests share one refresh), logs out when the session cannot be renewed.
- `lib/errors.ts`: API error `code`s (`SLOT_FULL`, `OTP_INVALID`…) → translated messages (`e_*` keys in `i18n-strings.ts`).
- `store.ts`: session, owner, garage list and the active garage. Profile, hours and slot settings are local
  drafts until saved; services, reservations and blocks are changed through the API immediately.
- `lib/query.ts`: small fetch hook for page data (dashboard, schedule, reservations, notifications). Every
  change made through the API calls `invalidate()`, which refetches what is on screen.
- `lib/live.ts`: keeps a Server-Sent Events connection to the active garage's notification stream. Each new
  booking, cancellation or reschedule shows a toast and calls `invalidate()`. It reconnects on its own
  (the server closes the stream when the access token expires).
- `lib/clock.ts`: "today" and "now" in Africa/Tunis, the same zone the API uses.
- Photos and the logo are not stored by the API yet: they stay in the browser for the current visit.

## Structure

```
src/
  data/i18n-strings.ts   Derja + French text, including API error messages
  data/cities.ts         governorates for the forms
  lib/api.ts             HTTP client + endpoints
  lib/live.ts            live notifications (SSE)
  lib/types.ts           UI shapes and API payloads
  lib/mappers.ts         API payloads ⇄ form shapes
  store.ts               Zustand store (session, garages, active garage)
  lib/format.ts          dates, money, phone, slot generation
  lib/i18n.ts            useT() hook + notify() toasts
  components/ui/         shadcn components (themed to the design)
  components/            shared pieces: fields, OTP, editors, reservation drawer
  layouts/app-layout.tsx sidebar, top bar (garage switcher, notifications), page shell
  pages/                 auth, garage picker, onboarding, dashboard, reservations, schedule, services, profile, settings
```

The map uses free OpenStreetMap tiles via Leaflet. The design used CARTO tiles, which now require an API key.
