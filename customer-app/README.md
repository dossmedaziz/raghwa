# Raghwa — customer app

React Native + Expo (SDK 57, TypeScript) implementation of the Claude Design prototype
(`../raghwa-customer-app-prototype/project/RaghwaApp.dc.html`). Frontend only: all data is fake.

**Stack:** React Navigation (native stack + bottom tabs) · Shopify Restyle (theme, `Box` / `Text`) ·
FlashList (garage list, reservations) · Mapbox (`@rnmapbox/maps`) · Reanimated · Zustand + AsyncStorage.

## Run (Android development build)

Mapbox uses native code, so the app **does not run in Expo Go**: it runs in its own development build.

1. **Mapbox token** — create a free account at <https://console.mapbox.com/account/access-tokens/>, copy the
   *Default public token* (`pk.…`) into `.env.local`:
   ```
   EXPO_PUBLIC_MAPBOX_TOKEN=pk.xxxxxxxx
   ```
   (`.env.example` shows the format; `.env.local` is git-ignored.)
2. **Android tooling (once)** — install Android Studio (it brings the Android SDK and a JDK 17), then:
   ```bash
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
   ```
   Connect a phone with USB debugging enabled, or start an emulator from Android Studio.
3. **Build & install** — compiles the native app (first time takes a few minutes):
   ```bash
   npm install
   npx expo run:android
   ```
4. **Day to day** — after the build is installed you only need the JS server:
   ```bash
   npx expo start
   ```
   and open the Raghwa app on the phone (not Expo Go). Rebuild with `npx expo run:android` only after
   adding native libraries or changing `app.json` plugins.

Press `w` in `npx expo start` for the web version (static raster map, for quick UI checks).

## Demo

- Splash → language → intro → login (phone pre-filled, any password).
- **OTP code: `1234`** (any other code shows the "wrong code" state).
- "Not now" on the location screen shows the map's location-denied banner.
- The demo clock is frozen on **Saturday 3 Oct 2026, 10:15**, so slot availability and the "< 2 h" lock look the same every time.
- Language, onboarding and login are saved; bookings, cars and filters reset when the app restarts.
- Turn off Wi-Fi/data to see the "No internet" screen on the Map and Reservations tabs.

## Right-to-left

Arabic (Tunisian Derja) is the default and French is the second language. Direction is applied with the
`direction` layout style on the root view (and inside each modal) instead of `I18nManager.forceRTL`, so:

- switching language is **instant** (no app restart), and
- it doesn't depend on `I18nManager`, which needs an app restart (and is reset by Expo Go).

Text alignment and directional icons (arrows, chevrons) are handled in `src/components/ui.tsx`.

## Maps

Mapbox `light-v11` style via `@rnmapbox/maps` (`src/components/GarageMap.tsx`): garage price pins and the user dot
are `MarkerView`s, the small maps on the garage / reservation screens are non-interactive `MapView`s.
The Mapbox logo and attribution stay visible (required by Mapbox's terms). No secret download token is needed —
only the public `pk.` token. The web build keeps a static raster fallback (`GarageMap.web.tsx`).

## Structure

```
App.tsx                    fonts, providers, navigators, start screen
src/theme.ts               Restyle theme (colors, spacing, radii, type scale)
src/store.ts               Zustand store + toast
src/data/strings.ts        Derja + French text (verbatim from the design)
src/data/mock.ts           garages, services, reservations, cars, reviews
src/lib/                   i18n hook, formatting, garage helpers
src/components/ui.tsx      Text, Icon, Button, inputs, chips, plate, sheet, dialog, toast
src/components/screen.tsx  page layout, headers, bottom bars, tab bar
src/components/GarageMap*  Mapbox map + web fallback
src/lib/mapbox.ts          token setup (EXPO_PUBLIC_MAPBOX_TOKEN)
src/screens/               onboarding, auth, map, garage, booking, reservations, profile
```
