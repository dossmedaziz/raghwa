import { useEffect, useState } from 'react'
import * as Location from 'expo-location'

export interface Pos { lat: number; lon: number }

/** Kept between visits so the map opens on the last position at once. */
let last: Pos | null = null
const toPos = (l: Location.LocationObject): Pos => ({ lat: l.coords.latitude, lon: l.coords.longitude })

/**
 * The phone's position: the last known one first, then a fresh fix.
 * Null while unknown, when `enabled` is false, or when the permission is not granted.
 */
export function useUserPosition(enabled: boolean) {
  const [pos, setPos] = useState<Pos | null>(last)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    const update = (l: Location.LocationObject | null) => {
      if (!l || !alive) return
      last = toPos(l)
      setPos(last)
    }
    ;(async () => {
      try {
        if ((await Location.getForegroundPermissionsAsync()).status !== 'granted') return
        update(await Location.getLastKnownPositionAsync())
        update(await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }))
      } catch {
        // Location services off: the map stays on Tunis.
      }
    })()
    return () => {
      alive = false
    }
  }, [enabled])
  return enabled ? pos : null
}
