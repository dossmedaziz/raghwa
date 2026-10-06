import { View } from 'react-native'
import { colors, elevation, isDark } from '@/theme'
import { Drop, Text } from '@/components/ui'

/** Free light-grey basemap used by the design (Esri World Light Gray: base + labels). */
const esri = (layer: string) => `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${layer}/MapServer/tile/{z}/{y}/{x}`
/** Light or dark grey canvas, following the app theme. */
export const tileBase = () => esri(isDark() ? 'World_Dark_Gray_Base' : 'World_Light_Gray_Base')
export const tileRef = () => esri(isDark() ? 'World_Dark_Gray_Reference' : 'World_Light_Gray_Reference')

export interface PinData { id: string; lat: number; lon: number; label: string; open: boolean }

/** Price pill with a little tail; navy and larger when selected, grey when closed. */
export function Pin({ label, open, selected }: { label: string; open: boolean; selected: boolean }) {
  const bg = selected ? colors.primary : open ? colors.bg : colors.grey100
  return (
    <View style={{ alignItems: 'center', transform: [{ scale: selected ? 1.18 : 1 }], paddingHorizontal: 6, paddingTop: 4, flexShrink: 0 }}>
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingStart: 10, paddingEnd: 12, borderRadius: 999, backgroundColor: bg }, elevation.pin]}>
        <Drop size={11} color={open ? colors.aqua : colors.grey400} style={{ marginTop: 2 }} />
        <Text w={700} fontSize={13} numberOfLines={1} color={selected ? 'white' : open ? 'ink' : 'grey500'} style={{ flexShrink: 0 }}>{label}</Text>
      </View>
      <View style={{ width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: bg, marginTop: -1 }} />
    </View>
  )
}

export function UserDot() {
  return (
    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(11,59,143,.14)', alignItems: 'center', justifyContent: 'center' }}>
      <View style={[{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, borderWidth: 3, borderColor: '#fff' }, elevation.pin]} />
    </View>
  )
}

/** Round navy pin used on the small maps (garage + reservation details). */
export function GaragePin() {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, elevation.pin]}>
        <Drop size={14} />
      </View>
      <View style={{ width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: colors.primary, marginTop: -1 }} />
    </View>
  )
}

export interface MapHandle { recenter: () => void }
export interface GarageMapProps {
  center: { lat: number; lon: number }
  /** Approximate web-mercator zoom level, as in the prototype (13 around the user, 12 for Tunis). */
  zoom: number
  pins: PinData[]
  selected: string | null
  onSelect: (id: string) => void
  onMapPress: () => void
  user?: { lat: number; lon: number }
}
