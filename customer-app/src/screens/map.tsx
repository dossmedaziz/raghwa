import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BackHandler, Pressable, TextInput, View, useWindowDimensions } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
import BottomSheet, {
  BottomSheetBackdrop, BottomSheetFlatList, BottomSheetFooter, BottomSheetScrollView, type BottomSheetBackdropProps, type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { colors, elevation } from '@/theme'
import { Box, Button, Chip, Icon, IconButton, Skeleton, Text, Thumb, Toggle } from '@/components/ui'
import { TAB_H } from '@/components/screen'
import { GarageMap } from '@/components/GarageMap'
import type { MapHandle } from '@/components/map-parts'
import { OfflineView, useOnline } from '@/components/offline'
import { G, SV, TUNIS, USER, gById, type Garage } from '@/data/mock'
import { num, price } from '@/lib/format'
import { filterCount, passes, useGarageView } from '@/lib/garage'
import { useT } from '@/lib/i18n'
import { F0, useStore, type Filters } from '@/store'

type SheetPos = 'collapsed' | 'half' | 'expanded'
const ORDER: SheetPos[] = ['collapsed', 'half', 'expanded']

let mapSeen = false

export function MapScreen() {
  const { t, tr, ar, dir } = useT()
  const nav = useNavigation()
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const online = useOnline()
  const flt = useStore((s) => s.flt), denied = useStore((s) => s.denied), setFilters = useStore((s) => s.setFilters)
  const startBooking = useStore((s) => s.startBooking)
  const gv = useGarageView()
  const map = useRef<MapHandle>(null)

  const [q, setQ] = useState('')
  const [sel, setSel] = useState<string | null>(null)
  const [pos, setPos] = useState<SheetPos>('collapsed')
  const [fOpen, setFOpen] = useState(false)
  // First visit shows the list skeleton, as in the prototype.
  const [loading, setLoading] = useState(!mapSeen)
  useEffect(() => {
    if (mapSeen) return
    mapSeen = true
    const id = setTimeout(() => setLoading(false), 1200)
    return () => clearTimeout(id)
  }, [])

  // Sheet snaps: 176 / 440 / below the search bar (design values on an 844px frame).
  const body = height - insets.bottom - TAB_H
  const snapPoints = useMemo(() => [176, Math.min(440, body * 0.58), body - insets.top - 76], [body, insets.top])
  const sheet = useRef<BottomSheet>(null)
  const snapTo = (p: SheetPos) => { setPos(p); sheet.current?.snapToIndex(ORDER.indexOf(p)) }
  // The recenter button rides on the sheet's top edge (sheet y is measured from the map's top).
  const sheetY = useSharedValue(body - snapPoints[0])
  const mapH = useSharedValue(body)
  const recStyle = useAnimatedStyle(() => ({ bottom: (sel ? 236 : Math.max(0, mapH.value - sheetY.value)) + 12 }))

  const query = q.trim().toLowerCase()
  const shown = useMemo(() => G.filter((g) => passes(g, flt) && (!query || (g.n.join(' ') + ' ' + g.ar.join(' ')).toLowerCase().includes(query))), [flt, query])
  const list = useMemo(() => shown.slice().sort((a, b) => a.d - b.d), [shown])
  const nF = filterCount(flt)

  const openGarage = (id: string) => nav.navigate('Garage', { gid: id })

  if (!online) return <OfflineView />

  const sg = sel ? gById(sel) : null
  const selV = sg ? gv(sg) : null

  return (
    <View style={{ flex: 1, backgroundColor: colors.mapBase }} onLayout={(e) => { mapH.value = e.nativeEvent.layout.height }}>
      <GarageMap ref={map} center={denied ? TUNIS : USER} zoom={denied ? 12 : 13} user={denied ? undefined : USER} selected={sel}
        pins={shown.map((g) => ({ id: g.id, lat: g.lat, lon: g.lon, open: g.open, label: tr('from', { p: price(g.from, ar ? 'ar' : 'fr') }) }))}
        onSelect={setSel} onMapPress={() => sel && setSel(null)} />

      {/* Search + filters */}
      <View style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, flexDirection: 'row', gap: 8, direction: dir }}>
        <View style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 16, borderRadius: 999, backgroundColor: colors.bg }, elevation.float]}>
          <Icon name="search" />
          <TextInput value={q} placeholder={t.search_ph} placeholderTextColor={colors.grey450} returnKeyType="search"
            onChangeText={(v) => { setQ(v); if (pos === 'collapsed') snapTo('half') }}
            style={{ flex: 1, height: '100%', fontSize: 16, fontFamily: ar ? 'Cairo_600SemiBold' : 'Inter_600SemiBold', color: colors.ink, textAlign: ar ? 'right' : 'left' }} />
        </View>
        <Pressable onPress={() => setFOpen(true)} accessibilityLabel={t.filters}
          style={({ pressed }) => [{ width: 52, height: 52, borderRadius: 26, backgroundColor: pressed ? colors.grey100 : colors.bg, alignItems: 'center', justifyContent: 'center' }, elevation.float]}>
          <Icon name="tune" />
          {nF > 0 && (
            <View style={{ position: 'absolute', top: 2, end: 2, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Text latin w={700} fontSize={11} color="white" align="center">{nF}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {denied && (
        <View style={[{ position: 'absolute', top: insets.top + 72, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingStart: 14, borderRadius: 16, backgroundColor: colors.inverse }, elevation.float]}>
          <Icon name="location_off" size={22} color="aqua" />
          <Text w={600} fontSize={14} color="white" lh={1.4} style={{ flex: 1 }}>{t.loc_banner}</Text>
          <Pressable onPress={() => nav.navigate('Location')} style={{ height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.bg, justifyContent: 'center' }}>
            <Text w={700} fontSize={14}>{t.enable}</Text>
          </Pressable>
        </View>
      )}

      {(pos !== 'expanded' || sel) && (
        <Animated.View style={[{ position: 'absolute', end: 16 }, recStyle]}>
          <IconButton icon="near_me" size={48} floating label="recenter" onPress={() => (denied ? nav.navigate('Location') : map.current?.recenter())} />
        </Animated.View>
      )}

      {/* Nearest garages sheet (drag the handle/header between the three snaps; the list scrolls once expanded). */}
      {!sg && (
        <BottomSheet ref={sheet} index={ORDER.indexOf(pos)} snapPoints={snapPoints} enableDynamicSizing={false}
          animatedPosition={sheetY} onChange={(i) => i >= 0 && setPos(ORDER[i])}
          enablePanDownToClose={false} enableOverDrag={false}
          handleComponent={() => <ListHeader count={shown.length} />}
          backgroundStyle={{ backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderRadius: 0 }}
          style={{ shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 16 }}>
          {loading ? (
            <View style={{ paddingHorizontal: 16, direction: dir }}>{[1, 2, 3, 4].map((k) => <GarageRowSkeleton key={k} />)}</View>
          ) : list.length === 0 ? (
            <Box alignItems="center" gap="s" style={{ padding: 24 }}>
              <Icon name="search_off" size={40} color="grey400" />
              <Text w={700} fontSize={17} align="center">{t.no_results}</Text>
              <Text fontSize={14} color="grey600" align="center">{t.no_results_s}</Text>
            </Box>
          ) : (
            <BottomSheetFlatList data={list} keyExtractor={(g: Garage) => g.id} showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
              renderItem={({ item }: { item: Garage }) => <GarageRow g={item} onPress={() => openGarage(item.id)} />} />
          )}
        </BottomSheet>
      )}

      {/* Selected garage preview */}
      {sg && selV && (
        <View style={[{ position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: colors.bg, borderRadius: 20, padding: 12, gap: 12, direction: dir }, elevation.sheet]}>
          <Pressable onPress={() => openGarage(sg.id)} style={{ flexDirection: 'row', gap: 12 }}>
            <Thumb size={96} radius={14} icon={32} />
            <Box flex={1} minWidth={0} gap="s" style={{ paddingTop: 2 }}>
              <Text w={800} fontSize={17} lh={1.3}>{selV.name}</Text>
              <Box flexDirection="row" alignItems="center" gap="xs">
                <Icon name="star" size={15} />
                <Text w={700} fontSize={13}>{selV.rating}</Text>
                <Text fontSize={13} color="grey600">({selV.reviews}) · {selV.dist}</Text>
              </Box>
              <Text fontSize={13} color="grey600"><Text w={700} fontSize={13} color={selV.sFg}>{selV.status}</Text> · {selV.hours}</Text>
            </Box>
            <IconButton icon="close" size={32} iconSize={18} label="close" onPress={() => setSel(null)} />
          </Pressable>
          <Button label={t.see_avail} height={52} fontSize={16} onPress={() => { startBooking(sg.id); nav.navigate('Book1') }} />
        </View>
      )}

      <FiltersSheet visible={fOpen} onClose={() => setFOpen(false)} current={flt}
        onApply={(f) => { setFilters(f); setFOpen(false); setSel(null); if (pos === 'collapsed') snapTo('half') }} />
    </View>
  )
}

/** Grabber + title row; it is the sheet's handle, so dragging it moves the sheet. */
function ListHeader({ count }: { count: number }) {
  const { t, tr } = useT()
  return (
    <View accessibilityRole="adjustable" accessibilityLabel={t.nearest}>
      <Box alignItems="center" style={{ paddingTop: 10, paddingBottom: 6 }}><View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: colors.grey300 }} /></Box>
      <Box flexDirection="row" alignItems="flex-end" justifyContent="space-between" style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 }}>
        <Box>
          <Text w={800} fontSize={20}>{t.nearest}</Text>
          <Text fontSize={13} color="grey600" style={{ marginTop: 2 }}>{t.by_dist}</Text>
        </Box>
        <Box backgroundColor="grey100" borderRadius="pill" style={{ paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text w={600} fontSize={13} color="grey600">{tr('n_garages', { n: count })}</Text>
        </Box>
      </Box>
    </View>
  )
}

function GarageRow({ g, onPress }: { g: Garage; onPress: () => void }) {
  const v = useGarageView()(g)
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.grey120, opacity: pressed ? 0.6 : 1 })}>
      <Thumb size={64} />
      <Box flex={1} minWidth={0} gap="xs">
        <Text w={700} fontSize={16} numberOfLines={1}>{v.name}</Text>
        <Box flexDirection="row" alignItems="center" gap="xs">
          <Icon name="star" size={15} />
          <Text w={700} fontSize={13}>{v.rating}</Text>
          <Text fontSize={13} color="grey600" numberOfLines={1} style={{ flexShrink: 1 }}>· {v.dist} · {v.area}</Text>
        </Box>
        <Box flexDirection="row" alignItems="center" gap="s">
          <Box backgroundColor={v.sBg} borderRadius="pill" style={{ paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text w={700} fontSize={12} color={v.sFg}>{v.status}</Text>
          </Box>
          <Text fontSize={13} color="grey600">{v.hours}</Text>
        </Box>
      </Box>
      <Text w={700} fontSize={14}>{v.from}</Text>
    </Pressable>
  )
}

function GarageRowSkeleton() {
  return (
    <Box flexDirection="row" gap="sm" alignItems="center" style={{ paddingVertical: 12 }}>
      <Skeleton w={64} h={64} r={12} />
      <Box flex={1} gap="s">
        <Skeleton w="60%" h={14} />
        <Skeleton w="80%" h={10} c="grey100" />
        <Skeleton w="40%" h={10} c="grey100" />
      </Box>
    </Box>
  )
}

/**
 * Filters as a gorhom sheet on the map screen (same kind as the stations list): closed until the filter
 * button opens it, fixed height, sticky "Show N" footer; backdrop tap, swipe down and Android back close it.
 */
function FiltersSheet({ visible, onClose, current, onApply }: { visible: boolean; onClose: () => void; current: Filters; onApply: (f: Filters) => void }) {
  const { t, tr, li, L } = useT()
  const { height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const ref = useRef<BottomSheet>(null)
  // Map area (screen minus the tab bar), leaving room above the sheet for the status bar.
  const snapPoints = useMemo(() => [Math.min(720, height - insets.bottom - TAB_H - insets.top - 24)], [height, insets.bottom, insets.top])
  const [fd, setFd] = useState<Filters>(current)
  const up = (p: Partial<Filters>) => setFd((x) => ({ ...x, ...p }))
  const count = G.filter((g) => passes(g, fd)).length

  // Each opening starts the draft from the applied filters.
  const [wasVisible, setWasVisible] = useState(visible)
  if (visible !== wasVisible) {
    setWasVisible(visible)
    if (visible) setFd({ ...current, svc: [...current.svc] })
  }

  useEffect(() => {
    if (visible) ref.current?.snapToIndex(0)
    else ref.current?.close()
  }, [visible])
  useEffect(() => {
    if (!visible) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true })
    return () => sub.remove()
  }, [visible, onClose])

  const backdrop = useCallback(
    (p: BottomSheetBackdropProps) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.42} pressBehavior="close" />, [],
  )
  // The tab bar sits below the map screen, so no home-indicator inset is needed here.
  const footerH = 12 + 56 + 12
  const footer = useCallback((p: BottomSheetFooterProps) => (
    <BottomSheetFooter {...p}>
      <View style={{ backgroundColor: colors.bg, paddingHorizontal: 16, paddingTop: 12, paddingBottom: footerH - 68, borderTopWidth: 1, borderTopColor: colors.grey150 }}>
        <Button label={tr('show_n', { n: count })} onPress={() => onApply(fd)} />
      </View>
    </BottomSheetFooter>
  ), [count, fd, footerH, onApply, tr])

  return (
    <BottomSheet ref={ref} index={-1} snapPoints={snapPoints} enableDynamicSizing={false} enablePanDownToClose
      onChange={(i) => { if (i === -1 && visible) onClose() }}
      backdropComponent={backdrop} footerComponent={footer}
      backgroundStyle={{ backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderRadius: 0 }}
      handleIndicatorStyle={{ width: 40, height: 5, backgroundColor: colors.grey300 }}>
      <BottomSheetScrollView contentContainerStyle={{ paddingBottom: footerH + 16 }} showsVerticalScrollIndicator={false}>
        <Box flexDirection="row" alignItems="center" justifyContent="space-between" style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
          <IconButton icon="close" size={40} iconSize={22} label="close" onPress={onClose} />
          <Text w={800} fontSize={18}>{t.filters}</Text>
          <Pressable onPress={() => setFd({ ...F0, svc: [] })} hitSlop={8}><Text w={700} fontSize={15} color="primary">{t.reset}</Text></Pressable>
        </Box>
        <Box gap="l" style={{ paddingHorizontal: 16, paddingTop: 4 }}>
          <Box flexDirection="row" alignItems="center" gap="sm">
            <Box flex={1}>
              <Text w={700} fontSize={16}>{t.open_now}</Text>
              <Text fontSize={13} color="grey600" style={{ marginTop: 2 }}>{t.open_now_s}</Text>
            </Box>
            <Toggle value={fd.open} onChange={() => up({ open: !fd.open })} label={t.open_now} />
          </Box>
          <ChipGroup title={t.distance}>
            {[0, 2, 5, 10].map((d) => <Chip key={d} label={d ? tr('less', { d: tr('km', { d }) }) : t.any} on={fd.dist === d} onPress={() => up({ dist: d })} />)}
          </ChipGroup>
          <ChipGroup title={t.rating}>
            {[0, 4, 4.5].map((r) => <Chip key={r} label={r ? tr('plus', { r: num(r) }) : t.any} icon={r ? 'star' : undefined} on={fd.rating === r} onPress={() => up({ rating: r })} />)}
          </ChipGroup>
          <ChipGroup title={t.price}>
            {[0, 10, 15].map((p) => <Chip key={p} label={p ? tr('max_p', { p: price(p, L) }) : t.any} on={fd.price === p} onPress={() => up({ price: p })} />)}
          </ChipGroup>
          <ChipGroup title={t.services}>
            {SV.map((x) => {
              const on = fd.svc.includes(x.id)
              return <Chip key={x.id} label={x.n[li]} icon={on ? 'check' : 'add'} on={on} onPress={() => up({ svc: on ? fd.svc.filter((y) => y !== x.id) : [...fd.svc, x.id] })} />
            })}
          </ChipGroup>
        </Box>
      </BottomSheetScrollView>
    </BottomSheet>
  )
}

function ChipGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box gap="s">
      <Text w={700} fontSize={16}>{title}</Text>
      <Box flexDirection="row" flexWrap="wrap" gap="s">{children}</Box>
    </Box>
  )
}
