import Mapbox from '@rnmapbox/maps'

/**
 * Public Mapbox token (pk.…) from `.env` → EXPO_PUBLIC_MAPBOX_TOKEN.
 * Without it the map stays blank and Mapbox logs an error.
 */
export const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? ''

export function initMapbox() {
  if (!MAPBOX_TOKEN) console.warn('[Raghwa] EXPO_PUBLIC_MAPBOX_TOKEN is missing — add it to customer-app/.env (see .env.example).')
  Mapbox.setAccessToken(MAPBOX_TOKEN)
}
