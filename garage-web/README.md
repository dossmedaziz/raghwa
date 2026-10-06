# Raghwa Pro — garage owner dashboard

React + TypeScript + Vite + shadcn/ui implementation of the Claude Design prototype
(`../Raghwa garage dashboard prototype/`). Frontend only: all data is fake and lives in memory.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Demo

- **Login:** the form is pre-filled. Any 8-digit phone and any password work.
- **OTP:** any 4 digits work (sign-up, forgot password, change password/phone).
- **Sign up** → OTP → 6-step onboarding → dashboard.
- Language (Tunisian Arabic RTL / French LTR) and the session are kept in `localStorage`; all other data resets on reload.
- The demo clock is frozen on **Wednesday 21 Oct 2026, 11:15** (`TODAY` / `NOW` in `src/data/mock.ts`).

## Structure

```
src/
  data/i18n-strings.ts   Derja + French text (ported verbatim from the design)
  data/mock.ts           garage, services, reservations, hours, blocks
  store.ts               Zustand store (all app state + actions)
  lib/format.ts          dates, money, phone, slot generation
  lib/i18n.ts            useT() hook + notify() toasts
  components/ui/         shadcn components (themed to the design)
  components/            shared pieces: fields, OTP, editors, reservation drawer
  layouts/app-layout.tsx sidebar, top bar, page shell
  pages/                 auth, onboarding, dashboard, reservations, schedule, services, profile, settings
```

The map uses free OpenStreetMap tiles via Leaflet. The design used CARTO tiles, which now require an API key.
