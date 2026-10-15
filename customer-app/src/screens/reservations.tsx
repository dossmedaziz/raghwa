import { useState } from 'react'
import { ScrollView, Pressable, View } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '@/theme'
import { Badge, BackButton, Box, Button, Icon, InfoRow, Notice, Plate, Segmented, Sheet, Skeleton, Text, Thumb } from '@/components/ui'
import { MiniMap } from '@/components/GarageMap'
import { OfflineView, useOnline } from '@/components/offline'
import { useGarageActions } from '@/screens/garage'
import { api } from '@/lib/api'
import { minutesUntil, today } from '@/lib/clock'
import { errorKey, notifyError } from '@/lib/errors'
import { dLong, iso, price } from '@/lib/format'
import { svcName } from '@/lib/garage'
import { useT } from '@/lib/i18n'
import { invalidate, useQuery } from '@/lib/query'
import { carPlate, parsePlate, toast, useStore } from '@/store'
import type { Reservation } from '@/lib/types'
import type { ScreenProps, TabParams } from '@/navigation/types'
import type { Color } from '@/theme'

type Seg = 'up' | 'past' | 'cancelled'

/** Display model for a reservation. */
function useResView() {
  const { t, tr, L } = useT()
  return (r: Reservation) => {
    const mins = minutesUntil(r.date, r.time)
    const upcoming = r.status === 'upcoming'
    // Bookings from an earlier day that the garage never marked done: the API lists them under `past`.
    const passed = upcoming && r.date < today()
    const badge: [Color, Color, string, string] =
      r.status === 'done' ? ['positiveTint', 'positiveInk', t.st_done, 'task_alt']
        : r.status === 'cancelled'
          ? ['negativeTint', 'negativeInk', r.cancelledBy === 'garage' ? t.st_cancelled_garage : r.cancelledBy === 'customer' ? t.st_cancelled_you : t.st_cancelled, 'cancel']
          : passed ? ['grey100', 'grey600', t.past, 'history']
            : ['positiveTint', 'positiveInk', t.st_up, 'check_circle']
    return {
      id: r.id, ref: r.ref, name: r.garage.name, addr: r.garage.address, date: dLong(r.date, L), time: iso(r.time, L), total: price(r.total, L),
      chips: r.lines.map((l) => svcName(l, L)), lines: r.lines.map((l, i) => ({ key: (l.serviceId ?? '') + i, name: svcName(l, L), price: price(l.price, L) })),
      badge, car: r.car ? [r.car.brand, r.car.model].filter(Boolean).join(' ') || '—' : '—', plate: parsePlate(r.car?.plate ?? null),
      soon: upcoming && mins > 0 && mins < 24 * 60, soonText: tr('in_time', { h: Math.floor(mins / 60), m: String(mins % 60).padStart(2, '0') }),
      // Changes are allowed until the slot starts.
      up: upcoming && mins > 0, locked: upcoming && !passed && mins <= 0, ended: r.status === 'done' || passed,
      cancelled: r.status === 'cancelled', byGarage: r.cancelledBy === 'garage', byYou: r.cancelledBy === 'customer',
    }
  }
}

export function ReservationsScreen() {
  const { t } = useT()
  const insets = useSafeAreaInsets()
  const nav = useNavigation()
  const route = useRoute<RouteProp<TabParams, 'Reservations'>>()
  const online = useOnline()
  const rv = useResView()
  const [seg, setSeg] = useState<Seg>(route.params?.seg ?? 'up')
  // Follow a segment passed by navigation (e.g. "My reservations" after booking).
  const paramSeg = route.params?.seg
  const [lastParam, setLastParam] = useState(paramSeg)
  if (paramSeg !== lastParam) {
    setLastParam(paramSeg)
    if (paramSeg) setSeg(paramSeg)
  }
  const scope = seg === 'up' ? 'upcoming' : 'past'
  const q = useQuery('res|' + scope, () => api.reservations.list(scope))
  const [pulling, setPulling] = useState(false)
  const refresh = async () => {
    setPulling(true)
    await q.reload()
    setPulling(false)
  }

  const items = q.data?.items ?? []
  const list = seg === 'up' ? items : items.filter((r) => (seg === 'cancelled') === (r.status === 'cancelled'))
  const empty = { up: ['event_available', t.empty_up_t, t.empty_up_s], past: ['history', t.empty_past_t, t.empty_past_s], cancelled: ['event_busy', t.empty_can_t, t.empty_can_s] }[seg]

  if (!online) return <OfflineView />

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <Text w={800} fontSize={32} style={{ padding: 16 }}>{t.my_res}</Text>
      <View style={{ marginHorizontal: 16 }}>
        <Segmented<Seg> value={seg} onChange={setSeg} items={[['up', t.upcoming], ['past', t.past_seg], ['cancelled', t.cancelled_seg]]} />
      </View>
      {q.loading ? (
        <Box gap="sm" padding="m">{[1, 2, 3, 4].map((k) => <CardSkeleton key={k} />)}</Box>
      ) : q.error && !q.data ? (
        <Box flex={1} alignItems="center" justifyContent="center" gap="sm" style={{ padding: 24, paddingBottom: 48 }}>
          <Icon name="cloud_off" size={56} color="grey400" />
          <Text w={800} fontSize={20} align="center">{t[errorKey(q.error)]}</Text>
          <Button label={t.retry} icon="refresh" height={48} fontSize={16} px={28} onPress={() => void q.reload()} />
        </Box>
      ) : list.length === 0 ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, paddingBottom: 48 }}>
          <View style={{ width: 150, height: 150, borderRadius: 75, backgroundColor: colors.skyTint, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <View style={{ position: 'absolute', top: 6, end: 10, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.decorA }} />
            <View style={{ position: 'absolute', bottom: 14, start: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.decorB }} />
            <Icon name={empty[0]} size={64} color="primary" />
          </View>
          <Text w={800} fontSize={22} align="center">{empty[1]}</Text>
          <Text fontSize={15} color="grey600" lh={1.5} align="center" style={{ maxWidth: 280 }}>{empty[2]}</Text>
          <Button label={t.find_garage} icon="search" height={52} fontSize={16} px={28} style={{ marginTop: 8 }} onPress={() => nav.navigate('Tabs', { screen: 'Map' })} />
        </ScrollView>
      ) : (
        <FlashList data={list} keyExtractor={(r) => r.id} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}
          refreshing={pulling} onRefresh={refresh}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => <ResCard v={rv(item)} onPress={() => nav.navigate('ResDetail', { id: item.id })} />} />
      )}
    </View>
  )
}

function ResCard({ v, onPress }: { v: ReturnType<ReturnType<typeof useResView>>; onPress: () => void }) {
  const { t } = useT()
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ borderWidth: 1, borderColor: colors.grey150, borderRadius: 16, padding: 16, gap: 12, backgroundColor: pressed ? colors.grey50 : colors.bg })}>
      <Box flexDirection="row" alignItems="center" gap="sm">
        <Thumb size={48} icon={22} />
        <Box flex={1} minWidth={0}>
          <Text w={700} fontSize={16} numberOfLines={1}>{v.name}</Text>
          <Text latin fontSize={12} color="grey500" style={{ fontFamily: 'Inter_500Medium' }}>{v.ref}</Text>
        </Box>
        <Badge label={v.badge[2]} bg={v.badge[0]} fg={v.badge[1]} icon={v.badge[3]} />
      </Box>
      <Box flexDirection="row" flexWrap="wrap" gap="m">
        <Box flexDirection="row" alignItems="center" gap="xs"><Icon name="calendar_today" size={18} color="grey600" /><Text fontSize={14}>{v.date}</Text></Box>
        <Box flexDirection="row" alignItems="center" gap="xs"><Icon name="schedule" size={18} color="grey600" /><Text fontSize={14}>{v.time}</Text></Box>
      </Box>
      {v.soon && (
        <Box alignSelf="flex-start"><Badge label={v.soonText} bg="warningTint" fg="warningInk" icon="timer" /></Box>
      )}
      <Box flexDirection="row" flexWrap="wrap" gap="xs">
        {v.chips.map((c, i) => <Box key={c + i} backgroundColor="grey100" borderRadius="pill" style={{ paddingHorizontal: 10, paddingVertical: 4 }}><Text w={600} fontSize={13}>{c}</Text></Box>)}
      </Box>
      <Box flexDirection="row" justifyContent="space-between" style={{ borderTopWidth: 1, borderTopColor: colors.grey120, paddingTop: 12 }}>
        <Text fontSize={15} color="grey600">{t.total}</Text>
        <Text w={800} fontSize={15}>{v.total}</Text>
      </Box>
    </Pressable>
  )
}

function CardSkeleton() {
  return (
    <Box borderWidth={1} borderColor="grey150" borderRadius="card" padding="m" gap="sm">
      <Box flexDirection="row" gap="sm" alignItems="center">
        <Skeleton w={48} h={48} r={12} />
        <Box flex={1} gap="s"><Skeleton w="55%" h={14} /><Skeleton w="30%" h={10} c="grey100" /></Box>
      </Box>
      <Skeleton w="70%" h={10} c="grey100" />
      <Box flexDirection="row" gap="xs"><Skeleton w={80} h={24} r={12} c="grey100" /><Skeleton w={60} h={24} r={12} c="grey100" /></Box>
    </Box>
  )
}

export function ResDetailScreen({ navigation, route }: ScreenProps<'ResDetail'>) {
  const { t } = useT()
  const insets = useSafeAreaInsets()
  const { id } = route.params
  const q = useQuery('res|' + id, () => api.reservations.get(id))
  const r = q.data
  const v = useResView()
  const act = useGarageActions(r?.garage)
  const cars = useStore((s) => s.cars), startBooking = useStore((s) => s.startBooking), startResched = useStore((s) => s.startResched)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const header = (
    <Box flexDirection="row" alignItems="center" gap="sm" height={56} paddingHorizontal="m">
      <BackButton />
      <Text w={800} fontSize={18} style={{ flex: 1 }}>{t.res_detail}</Text>
    </Box>
  )
  if (!r) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        {header}
        {q.error ? (
          <Box alignItems="center" gap="s" style={{ padding: 24 }}>
            <Text w={700} fontSize={17} align="center">{t[errorKey(q.error)]}</Text>
            <Button label={t.retry} icon="refresh" variant="secondary" height={44} fontSize={15} px={20} onPress={() => void q.reload()} />
          </Box>
        ) : (
          <Box gap="sm" padding="m"><CardSkeleton /><CardSkeleton /></Box>
        )}
      </View>
    )
  }

  const d = v(r)
  const bookAgain = () => {
    const sameCar = cars.find((c) => r.car?.plate && carPlate(c) === r.car.plate)
    startBooking(r.garage.id, { svc: r.lines.flatMap((l) => (l.serviceId ? [l.serviceId] : [])), ...(sameCar ? { car: sameCar.id } : {}) })
    navigation.navigate('Book1')
  }
  const cancel = async () => {
    if (busy) return
    setBusy(true)
    try {
      await api.reservations.cancel(r.id)
      setCancelOpen(false)
      invalidate()
      toast('cancelled_toast')
    } catch (x) {
      setCancelOpen(false)
      notifyError(x)
      invalidate()
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {header}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 40, gap: 20 }} showsVerticalScrollIndicator={false}>
        <Box flexDirection="row" alignItems="center" justifyContent="space-between">
          <Badge label={d.badge[2]} bg={d.badge[0]} fg={d.badge[1]} icon={d.badge[3]} size={14} />
          <Text latin w={700} fontSize={14} color="grey600">{d.ref}</Text>
        </Box>
        <Box flexDirection="row" alignItems="center" gap="sm">
          <Thumb size={64} radius={14} icon={28} />
          <Box flex={1} minWidth={0}>
            <Text w={800} fontSize={20} lh={1.3}>{d.name}</Text>
            <Text fontSize={14} color="grey600" style={{ marginTop: 2 }}>{d.addr}</Text>
          </Box>
        </Box>
        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.grey150 }}>
          <InfoRow icon="calendar_today" label={t.date} value={d.date} />
          <InfoRow icon="schedule" label={t.time} value={d.time} />
          <InfoRow icon="directions_car" label={t.car} value={d.car} />
          <InfoRow icon="payments" label={t.payment} value={t.cash} last />
        </View>
        {d.plate && <Box alignSelf="flex-start"><Plate ps={d.plate.ps} pn={d.plate.pn} /></Box>}
        <Box gap="s">
          {d.lines.map((l) => (
            <Box key={l.key} flexDirection="row" justifyContent="space-between" gap="s"><Text fontSize={15} style={{ flexShrink: 1 }}>{l.name}</Text><Text w={600} fontSize={15}>{l.price}</Text></Box>
          ))}
          <View style={{ height: 1, backgroundColor: colors.grey150 }} />
          <Box flexDirection="row" justifyContent="space-between" alignItems="baseline">
            <Text w={800} fontSize={17}>{t.total}</Text>
            <Text w={800} fontSize={22}>{d.total}</Text>
          </Box>
        </Box>
        {r.garage.location && <MiniMap lat={r.garage.location.latitude} lon={r.garage.location.longitude} />}
        <Box flexDirection="row" gap="sm">
          <Button label={t.directions} icon="directions" variant="secondary" height={48} fontSize={15} flex={1} onPress={act.directions} />
          {act.canCall && <Button label={t.call} icon="call" variant="secondary" height={48} fontSize={15} flex={1} onPress={act.call} />}
        </Box>

        {d.up && (
          <Box gap="s">
            <Button label={t.reschedule} icon="edit_calendar" onPress={() => { startResched(r); navigation.navigate('Book1') }} />
            <Button label={t.cancel} variant="destructiveSoft" onPress={() => setCancelOpen(true)} />
            <Text fontSize={13} color="grey600" align="center" style={{ marginTop: 4 }}>{t.cancel_note}</Text>
          </Box>
        )}
        {d.locked && (
          <Box gap="s">
            <Notice icon="lock_clock" tone="warning">{t.locked}</Notice>
            <Button label={t.reschedule} disabled />
            <Button label={t.cancel} disabled />
          </Box>
        )}
        {d.ended && <Button label={t.book_again} icon="replay" onPress={bookAgain} />}
        {d.cancelled && (
          <Box gap="s">
            <Notice icon="event_busy" tone="negative" align="center">{d.byGarage ? t.cancelled_by_garage : d.byYou ? t.cancelled_by_you : t.cancelled_on}</Notice>
            <Button label={t.book_again} onPress={bookAgain} />
          </Box>
        )}
      </ScrollView>

      <Sheet visible={cancelOpen} onClose={() => setCancelOpen(false)}>
        <Box gap="ml" style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <Box>
            <Text w={800} fontSize={24}>{t.cancel_t}</Text>
            <Text fontSize={15} color="grey600" style={{ marginTop: 6 }}>{d.date} · {d.time}</Text>
          </Box>
          <Box gap="s">
            <Button label={t.yes_cancel} variant="destructive" loading={busy} onPress={cancel} />
            <Button label={t.keep} variant="secondary" onPress={() => setCancelOpen(false)} />
          </Box>
        </Box>
      </Sheet>
    </View>
  )
}
