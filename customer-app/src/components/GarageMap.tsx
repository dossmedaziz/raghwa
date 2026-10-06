import { forwardRef, useImperativeHandle, useRef } from 'react'
import { Pressable, View, useWindowDimensions } from 'react-native'
import Mapbox, { Camera, MapView, MarkerView } from '@rnmapbox/maps'
import { colors, isDark } from '@/theme'
import { useT } from '@/lib/i18n'
import { GaragePin, Pin, UserDot, type GarageMapProps, type MapHandle } from '@/components/map-parts'

/** Mapbox light / dark style (v11), following the app theme. */
const mapStyle = () => (isDark() ? Mapbox.StyleURL.Dark.replace('dark-v10', 'dark-v11') : Mapbox.StyleURL.Light.replace('light-v10', 'light-v11'))

/**
 * Mapbox GL zoom levels are one step below raster (256px tile) levels for the same scale,
 * so the prototype's raster zoom 13 becomes 12 here.
 */
const glZoom = (rasterZoom: number) => rasterZoom - 1

/** Full-screen Mapbox map with garage price pins. */
export const GarageMap = forwardRef<MapHandle, GarageMapProps>(function GarageMap({ center, zoom, pins, selected, onSelect, onMapPress, user }, ref) {
  const camera = useRef<Camera>(null)
  const { ar } = useT()
  const { height } = useWindowDimensions()
  // The design places the focus point ~300px from the top (above the bottom sheet), or ~400px for Tunis.
  const focusY = zoom >= 13 ? 300 : 400
  const padding = { paddingTop: 0, paddingLeft: 0, paddingRight: 0, paddingBottom: Math.max(0, height - 2 * focusY * (height / 844)) }
  const stop = { centerCoordinate: [center.lon, center.lat], zoomLevel: glZoom(zoom), padding }
  useImperativeHandle(ref, () => ({ recenter: () => camera.current?.setCamera({ ...stop, animationDuration: 350 }) }))

  // Mapbox requires its logo + attribution to stay visible: keep them on the "start" side,
  // just above the collapsed sheet, away from the recenter button (which sits on the "end" side).
  const start = (x: number) => (ar ? { right: x } : { left: x })

  return (
    <MapView style={{ flex: 1, backgroundColor: colors.mapBase }} styleURL={mapStyle()} onPress={onMapPress}
      rotateEnabled={false} pitchEnabled={false} compassEnabled={false} scaleBarEnabled={false}
      logoPosition={{ bottom: 186, ...start(8) }} attributionPosition={{ bottom: 186, ...start(92) }}>
      <Camera ref={camera} defaultSettings={stop} />
      {user && (
        <MarkerView coordinate={[user.lon, user.lat]} anchor={{ x: 0.5, y: 0.5 }} allowOverlap>
          <View pointerEvents="none"><UserDot /></View>
        </MarkerView>
      )}
      {pins.map((p) => (
        <MarkerView key={p.id} coordinate={[p.lon, p.lat]} anchor={{ x: 0.5, y: 1 }} allowOverlap isSelected={selected === p.id}
          style={{ zIndex: selected === p.id ? 6 : 3 }}>
          <Pressable onPress={() => onSelect(p.id)} accessibilityRole="button" accessibilityLabel={p.label}>
            <Pin label={p.label} open={p.open} selected={selected === p.id} />
          </Pressable>
        </MarkerView>
      ))}
    </MapView>
  )
})

/** Small non-interactive map with the garage pin centred (garage + reservation details). */
export function MiniMap({ lat, lon }: { lat: number; lon: number }) {
  return (
    <View style={{ height: 140, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.mapBase }}>
      <MapView style={{ flex: 1 }} styleURL={mapStyle()} scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false}
        compassEnabled={false} scaleBarEnabled={false} logoPosition={{ bottom: 6, left: 6 }} attributionPosition={{ bottom: 6, right: 6 }}>
        <Camera defaultSettings={{ centerCoordinate: [lon, lat], zoomLevel: glZoom(15) }} />
      </MapView>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 70 - 43, alignItems: 'center' }}>
        <GaragePin />
      </View>
    </View>
  )
}
