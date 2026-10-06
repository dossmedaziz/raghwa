import { useEffect, useState } from 'react'
import { Pressable, ScrollView, TextInput, View } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '@/theme'
import { Badge, BackButton, Box, Button, Chip, Icon, InfoRow, Notice, Segmented, Sheet, Skeleton, Text, Thumb } from '@/components/ui'
import { MiniMap } from '@/components/GarageMap'
import { OfflineView, useOnline } from '@/components/offline'
import { useGarageActions } from '@/screens/garage'
import { CARS0, NOWM, SVM, gById, svcPrice, type Reservation } from '@/data/mock'
import type { SKey } from '@/data/strings'
import { dLong, price, range } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { toast, useStore } from '@/store'
import type { ScreenProps, TabParams } from '@/navigation/types'
import type { Color } from '@/theme'

type Seg = 'up' | 'past' | 'cancelled'

/** Display model for a reservation. */
function useResView() {
  const { t, tr, li, L } = useT()
  const cars = useStore((s) => s.cars)
  return (r: Reservation) => {
    const g = gById(r.g)
    const total = r.svc.reduce((a, id) => a + svcPrice(g, id), 0)
    const mins = r.di * 1440 + r.m - NOWM
    const badge: Record<Reservation['st'], [Color, Color, string, string]> = {
      up: ['positiveTint', 'positiveInk', t.st_up, 'check_circle'],
      done: ['positiveTint', 'positiveInk', t.st_done, 'task_alt'],
      cancelled: ['negativeTint', 'negativeInk', t.st_cancelled, 'cancel'],
    }
    const car = cars.find((x) => x.id === r.car) ?? CARS0[0]
    return {
      ref: r.ref, g, name: g.n[li], addr: g.a[li], date: dLong(r.di, L), time: range(r.m, L), total: price(total, L),
      chips: r.svc.map((id) => SVM[id].n[li]), lines: r.svc.map((id) => ({ id, name: SVM[id].n[li], price: price(svcPrice(g, id), L) })),
      badge: badge[r.st], car: car.b + ' ' + car.m,
      soon: r.st === 'up' && mins > 0 && mins < 24 * 60, soonText: tr('in_time', { h: Math.floor(mins / 60), m: String(mins % 60).padStart(2, '0') }),
      // Changes are allowed until 2 h before the slot.
      up: r.st === 'up' && mins >= 120, locked: r.st === 'up' && mins < 120, done: r.st === 'done', cancelled: r.st === 'cancelled', rating: r.rating ?? 0,
    }
  }
}

let resSeen = false

export function ReservationsScreen() {
  const { t } = useT()
  const insets = useSafeAreaInsets()
  const nav = useNavigation()
  const route = useRoute<RouteProp<TabParams, 'Reservations'>>()
  const online = useOnline()
  const res = useStore((s) => s.res)
  const rv = useResView()
  const [seg, setSeg] = useState<Seg>(route.params?.seg ?? 'up')
  // Follow a segment passed by navigation (e.g. "My reservations" after booking).
  const paramSeg = route.params?.seg
  const [lastParam, setLastParam] = useState(paramSeg)
  if (paramSeg !== lastParam) {
    setLastParam(paramSeg)
    if (paramSeg) setSeg(paramSeg)
  }
  const [loading, setLoading] = useState(!resSeen)
  useEffect(() => {
    if (resSeen) return
    resSeen = true
    const id = setTimeout(() => setLoading(false), 1000)
    return () => clearTimeout(id)
  }, [])

  const key = (r: Reservation) => r.di * 1440 + r.m
  const list = res
    .filter((r) => (seg === 'up' ? r.st === 'up' : seg === 'past' ? r.st === 'done' : r.st === 'cancelled'))
    .sort((a, b) => (seg === 'up' ? key(a) - key(b) : key(b) - key(a)))
  const empty = { up: ['event_available', t.empty_up_t, t.empty_up_s], past: ['history', t.empty_past_t, t.empty_past_s], cancelled: ['event_busy', t.empty_can_t, t.empty_can_s] }[seg]

  if (!online) return <OfflineView />

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <Text w={800} fontSize={32} style={{ padding: 16 }}>{t.my_res}</Text>
      <View style={{ marginHorizontal: 16 }}>
        <Segmented<Seg> value={seg} onChange={setSeg} items={[['up', t.upcoming], ['past', t.past_seg], ['cancelled', t.cancelled_seg]]} />
      </View>
      {loading ? (
        <Box gap="sm" padding="m">{[1, 2, 3, 4].map((k) => <CardSkeleton key={k} />)}</Box>
      ) : list.length === 0 ? (
        <Box flex={1} alignItems="center" justifyContent="center" gap="sm" style={{ padding: 24, paddingBottom: 48 }}>
          <View style={{ width: 150, height: 150, borderRadius: 75, backgroundColor: colors.skyTint, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <View style={{ position: 'absolute', top: 6, end: 10, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.decorA }} />
            <View style={{ position: 'absolute', bottom: 14, start: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.decorB }} />
            <Icon name={empty[0]} size={64} color="primary" />
          </View>
          <Text w={800} fontSize={22} align="center">{empty[1]}</Text>
          <Text fontSize={15} color="grey600" lh={1.5} align="center" style={{ maxWidth: 280 }}>{empty[2]}</Text>
          <Button label={t.find_garage} icon="search" height={52} fontSize={16} px={28} style={{ marginTop: 8 }} onPress={() => nav.navigate('Tabs', { screen: 'Map' })} />
        </Box>
      ) : (
        <FlashList data={list} keyExtractor={(r) => r.ref} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => <ResCard v={rv(item)} onPress={() => nav.navigate('ResDetail', { ref: item.ref })} />} />
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
        {v.chips.map((c) => <Box key={c} backgroundColor="grey100" borderRadius="pill" style={{ paddingHorizontal: 10, paddingVertical: 4 }}><Text w={600} fontSize={13}>{c}</Text></Box>)}
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

const REASONS: SKey[] = ['r1', 'r2', 'r3', 'r4', 'r5']

export function ResDetailScreen({ navigation, route }: ScreenProps<'ResDetail'>) {
  const { t, tr, li } = useT()
  const insets = useSafeAreaInsets()
  const s = useStore()
  const r = s.res.find((x) => x.ref === route.params.ref) ?? s.res[0]
  const v = useResView()(r)
  const act = useGarageActions(v.g)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reasons, setReasons] = useState<SKey[]>([])
  const [rateOpen, setRateOpen] = useState(false)
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')

  const bookAgain = () => { s.startBooking(r.g, { svc: [...r.svc], car: r.car }); navigation.navigate('Book1') }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <Box flexDirection="row" alignItems="center" gap="sm" height={56} paddingHorizontal="m">
        <BackButton />
        <Text w={800} fontSize={18} style={{ flex: 1 }}>{t.res_detail}</Text>
      </Box>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 40, gap: 20 }} showsVerticalScrollIndicator={false}>
        <Box flexDirection="row" alignItems="center" justifyContent="space-between">
          <Badge label={v.badge[2]} bg={v.badge[0]} fg={v.badge[1]} icon={v.badge[3]} size={14} />
          <Text latin w={700} fontSize={14} color="grey600">{v.ref}</Text>
        </Box>
        <Box flexDirection="row" alignItems="center" gap="sm">
          <Thumb size={64} radius={14} icon={28} />
          <Box flex={1} minWidth={0}>
            <Text w={800} fontSize={20} lh={1.3}>{v.name}</Text>
            <Text fontSize={14} color="grey600" style={{ marginTop: 2 }}>{v.addr}</Text>
          </Box>
        </Box>
        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.grey150 }}>
          <InfoRow icon="calendar_today" label={t.date} value={v.date} />
          <InfoRow icon="schedule" label={t.time} value={v.time} />
          <InfoRow icon="directions_car" label={t.car} value={v.car} />
          <InfoRow icon="payments" label={t.payment} value={t.cash} last />
        </View>
        <Box gap="s">
          {v.lines.map((l) => (
            <Box key={l.id} flexDirection="row" justifyContent="space-between"><Text fontSize={15}>{l.name}</Text><Text w={600} fontSize={15}>{l.price}</Text></Box>
          ))}
          <View style={{ height: 1, backgroundColor: colors.grey150 }} />
          <Box flexDirection="row" justifyContent="space-between" alignItems="baseline">
            <Text w={800} fontSize={17}>{t.total}</Text>
            <Text w={800} fontSize={22}>{v.total}</Text>
          </Box>
        </Box>
        <MiniMap lat={v.g.lat} lon={v.g.lon} />
        <Box flexDirection="row" gap="sm">
          <Button label={t.directions} icon="directions" variant="secondary" height={48} fontSize={15} flex={1} onPress={act.directions} />
          <Button label={t.call} icon="call" variant="secondary" height={48} fontSize={15} flex={1} onPress={act.call} />
        </Box>

        {v.up && (
          <Box gap="s">
            <Button label={t.reschedule} icon="edit_calendar" onPress={() => { s.startResched(r.ref); navigation.navigate('Book1') }} />
            <Button label={t.cancel} variant="destructiveSoft" onPress={() => { setReasons([]); setCancelOpen(true) }} />
            <Text fontSize={13} color="grey600" align="center" style={{ marginTop: 4 }}>{t.cancel_note}</Text>
          </Box>
        )}
        {v.locked && (
          <Box gap="s">
            <Notice icon="lock_clock" tone="warning">{t.locked}</Notice>
            <Button label={t.reschedule} disabled />
            <Button label={t.cancel} disabled />
          </Box>
        )}
        {v.done && (
          <Box gap="s">
            {v.rating > 0 && (
              <Box flexDirection="row" alignItems="center" justifyContent="space-between" borderRadius="card" backgroundColor="grey50" style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
                <Text w={600} fontSize={15}>{t.your_rating}</Text>
                <Box flexDirection="row" gap="xxs">{[1, 2, 3, 4, 5].map((i) => <Icon key={i} name="star" size={20} color={i <= v.rating ? 'ink' : 'grey300'} />)}</Box>
              </Box>
            )}
            <Button label={t.book_again} icon="replay" onPress={bookAgain} />
            {v.rating === 0 && <Button label={t.rate} icon="star" variant="secondary" onPress={() => { setStars(0); setComment(''); setRateOpen(true) }} />}
          </Box>
        )}
        {v.cancelled && (
          <Box gap="s">
            <Notice icon="event_busy" tone="negative" align="center">{t.cancelled_on}</Notice>
            <Button label={t.book_again} onPress={bookAgain} />
          </Box>
        )}
      </ScrollView>

      <Sheet visible={cancelOpen} onClose={() => setCancelOpen(false)}>
        <Box gap="ml" style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <Box>
            <Text w={800} fontSize={24}>{t.cancel_t}</Text>
            <Text fontSize={15} color="grey600" style={{ marginTop: 6 }}>{v.date} · {v.time}</Text>
          </Box>
          <Box gap="s">
            <Text w={700} fontSize={15}>{t.cancel_s}</Text>
            <Box flexDirection="row" flexWrap="wrap" gap="s">
              {REASONS.map((k) => {
                const on = reasons.includes(k)
                return <Chip key={k} label={t[k]} on={on} icon={on ? 'check' : undefined} onPress={() => setReasons(on ? reasons.filter((x) => x !== k) : [...reasons, k])} />
              })}
            </Box>
          </Box>
          <Box gap="s">
            <Button label={t.yes_cancel} variant="destructive" onPress={() => { s.cancelRes(r.ref); setCancelOpen(false); toast('cancelled_toast') }} />
            <Button label={t.keep} variant="secondary" onPress={() => setCancelOpen(false)} />
          </Box>
        </Box>
      </Sheet>

      <Sheet visible={rateOpen} onClose={() => setRateOpen(false)}>
        <Box gap="ml" style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <Box alignItems="center">
            <Text w={800} fontSize={24} align="center">{t.rate_t}</Text>
            <Text fontSize={15} color="grey600" align="center" style={{ marginTop: 6 }}>{v.g.n[li]}</Text>
          </Box>
          <Box flexDirection="row" justifyContent="center" gap="s" style={{ direction: 'ltr' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Pressable key={i} onPress={() => setStars(i)} accessibilityLabel={tr('plus', { r: i })} style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={i <= stars ? 'star' : 'star_border'} size={48} color={i <= stars ? 'warning' : 'grey300'} />
              </Pressable>
            ))}
          </Box>
          <TextInput value={comment} onChangeText={setComment} placeholder={t.comment_ph} placeholderTextColor={colors.grey450} multiline numberOfLines={3}
            style={{ minHeight: 90, borderRadius: 12, backgroundColor: colors.grey100, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, textAlignVertical: 'top', fontFamily: li === 0 ? 'Cairo_400Regular' : 'Inter_400Regular', textAlign: li === 0 ? 'right' : 'left' }} />
          <Button label={t.send} disabled={stars === 0} onPress={() => { s.rateRes(r.ref, stars); setRateOpen(false); toast('thanks_toast') }} />
        </Box>
      </Sheet>
    </View>
  )
}
