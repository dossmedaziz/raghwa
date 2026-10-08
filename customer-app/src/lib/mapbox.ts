import Mapbox from '@rnmapbox/maps'

/**
 * Public Mapbox token (pk.…): EXPO_PUBLIC_MAPBOX_TOKEN from `.env.local` locally, or from the
 * EAS environment variables for cloud builds (.env.local is gitignored and not uploaded).
 */
export const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? ''

export function initMapbox() {
  // Without a token the app falls back to the static tile map (see GarageMap.tsx).
  if (!MAPBOX_TOKEN) return console.warn('[Raghwa] EXPO_PUBLIC_MAPBOX_TOKEN is missing — set it in customer-app/.env.local (local) or as an EAS environment variable (cloud builds).')
  Mapbox.setAccessToken(MAPBOX_TOKEN)
}
