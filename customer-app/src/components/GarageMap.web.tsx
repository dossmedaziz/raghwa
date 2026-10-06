// Web fallback (react-native-maps has no web support): draws the same raster tiles as a
// static, non-pannable map, exactly like the Claude Design prototype.
import { forwardRef, useImperativeHandle, useState } from 'react'
import { Image, Pressable, View } from 'react-native'
import { colors } from '@/theme'
import { GaragePin, Pin, UserDot, tileBase, tileRef, type GarageMapProps, type MapHandle } from '@/components/map-parts'

const proj = (lat: number, lon: number, z: number) => {
  const s = 256 * Math.pow(2, z), r = (lat * Math.PI) / 180
  return { x: ((lon + 180) / 360) * s, y: ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * s }
}
/** Tiles covering a w×h view with (lat, lon) placed at (ax, ay). */
function view(lat: number, lon: number, z: number, w: number, h: number, ax: number, ay: number) {
  const c = proj(lat, lon, z), ox = c.x - ax, oy = c.y - ay
  const tiles: { key: string; base: string; ref: string; l: number; t: number }[] = []
  for (let tx = Math.floor(ox / 256); tx * 256 < ox + w; tx++)
    for (let ty = Math.floor(oy / 256); ty * 256 < oy + h; ty++) {
      const fill = (u: string) => u.replace('{z}', String(z)).replace('{x}', String(tx)).replace('{y}', String(ty))
      tiles.push({ key: tx + ':' + ty, base: fill(tileBase()), ref: fill(tileRef()), l: Math.round(tx * 256 - ox), t: Math.round(ty * 256 - oy) })
    }
  return { tiles, at: (la: number, lo: number) => { const p = proj(la, lo, z); return { x: Math.round(p.x - ox), y: Math.round(p.y - oy) } } }
}

function TileLayer({ tiles }: { tiles: ReturnType<typeof view>['tiles'] }) {
  return (
    <>
      {tiles.map((tl) => (
        <View key={tl.key} style={{ position: 'absolute', left: tl.l, top: tl.t, width: 256, height: 256 }}>
          <Image source={{ uri: tl.base }} style={{ width: 256, height: 256 }} />
          <Image source={{ uri: tl.ref }} style={{ position: 'absolute', width: 256, height: 256, opacity: 0.8 }} />
        </View>
      ))}
    </>
  )
}

export const GarageMap = forwardRef<MapHandle, GarageMapProps>(function GarageMap({ center, zoom, pins, selected, onSelect, onMapPress, user }, ref) {
  const [size, setSize] = useState({ w: 390, h: 844 })
  useImperativeHandle(ref, () => ({ recenter: () => {} }))
  const v = view(center.lat, center.lon, zoom, size.w, size.h, size.w / 2, zoom === 13 ? 300 : 400)
  return (
    <View style={{ flex: 1, overflow: 'hidden', backgroundColor: colors.mapBase, direction: 'ltr' }} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={onMapPress}>
        <TileLayer tiles={v.tiles} />
      </Pressable>
      {user && (() => { const p = v.at(user.lat, user.lon); return <View pointerEvents="none" style={{ position: 'absolute', left: p.x - 32, top: p.y - 32 }}><UserDot /></View> })()}
      {pins.map((p) => {
        const at = v.at(p.lat, p.lon), sel = selected === p.id
        return (
          // Fixed-width centred wrapper so pins near the screen edge don't get squeezed.
          <View key={p.id} pointerEvents="box-none" style={{ position: 'absolute', left: at.x - 100, top: at.y, width: 200, alignItems: 'center', zIndex: sel ? 6 : 3, transform: [{ translateY: '-100%' }] }}>
            <Pressable onPress={() => onSelect(p.id)}><Pin label={p.label} open={p.open} selected={sel} /></Pressable>
          </View>
        )
      })}
    </View>
  )
})

export function MiniMap({ lat, lon }: { lat: number; lon: number }) {
  const [w, setW] = useState(358)
  const v = view(lat, lon, 15, w, 140, w / 2, 78)
  return (
    <View style={{ height: 140, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.mapBase, direction: 'ltr' }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <TileLayer tiles={v.tiles} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: 78 - 43, alignItems: 'center' }}><GaragePin /></View>
    </View>
  )
}
