import { useState } from 'react'
import { Linking, Platform, Pressable, ScrollView, Share, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '@/theme'
import { BackButton, Box, Button, Icon, IconButton, Skeleton, Text } from '@/components/ui'
import { BottomBar } from '@/components/screen'
import { MiniMap } from '@/components/GarageMap'
import { DOWF } from '@/data/constants'
import { api } from '@/lib/api'
import { apiWeekday, today } from '@/lib/clock'
import { errorKey } from '@/lib/errors'
import { num, price } from '@/lib/format'
import { dayHoursText, openState, svcDesc, svcName } from '@/lib/garage'
import { useT } from '@/lib/i18n'
import { useQuery } from '@/lib/query'
import { toast, useStore } from '@/store'
import type { GeoPoint } from '@/lib/types'
import type { ScreenProps } from '@/navigation/types'

/** Opens the dialer / maps app (toasts first, like the prototype). */
export function useGarageActions(g: { phone: string; address: string; location: GeoPoint | null } | undefined) {
  return {
    canCall: !!g?.phone,
    call: () => {
      if (!g?.phone) return
      toast('calling')
      Linking.openURL('tel:+216' + g.phone.replace(/\D/g, '')).catch(() => {})
    },
    directions: () => {
      if (!g) return
      toast('opening_maps')
      const dest = g.location ? `${g.location.latitude},${g.location.longitude}` : encodeURIComponent(g.address)
      const url = Platform.OS === 'ios' ? `maps:?daddr=${dest}` : `https://www.google.com/maps/dir/?api=1&destination=${dest}`
      Linking.openURL(url).catch(() => {})
    },
  }
}

/** Grey photo placeholder (photo uploads are not built yet on the API). */
function Hero({ height }: { height: number }) {
  return (
    <View style={{ height, backgroundColor: colors.thumb, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="local_car_wash" size={56} color="thumbInk" />
    </View>
  )
}

export function GarageScreen({ navigation, route }: ScreenProps<'Garage'>) {
  const { t, tr, L } = useT()
  const insets = useSafeAreaInsets()
  const { gid, km } = route.params
  const q = useQuery('garage|' + gid, () => api.garages.get(gid))
  const g = q.data
  const act = useGarageActions(g)
  const startBooking = useStore((s) => s.startBooking)
  const [hoursOpen, setHoursOpen] = useState(false)

  const share = async () => {
    if (!g) return
    try { await Share.share({ message: g.name + ' · ' + g.address + ' — Raghwa' }) } catch { /* dismissed */ }
  }

  const header = (
    <Box flexDirection="row" justifyContent="space-between" style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16 }}>
      <BackButton floating />
      {g ? <IconButton icon="ios_share" floating iconSize={22} label="share" onPress={share} /> : null}
    </Box>
  )

  if (!g) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Hero height={300 + insets.top} />
        {q.error ? (
          <Box alignItems="center" gap="s" style={{ padding: 24 }}>
            <Icon name="cloud_off" size={40} color="grey400" />
            <Text w={700} fontSize={17} align="center">{t[errorKey(q.error)]}</Text>
            <Button label={t.retry} icon="refresh" variant="secondary" height={44} fontSize={15} px={20} onPress={() => void q.reload()} />
          </Box>
        ) : (
          <Box gap="sm" style={{ padding: 16 }}>
            <Skeleton w="70%" h={24} />
            <Skeleton w="50%" h={14} c="grey100" />
            <Skeleton w="60%" h={14} c="grey100" />
          </Box>
        )}
        {header}
      </View>
    )
  }

  const st = openState(g.hours)
  const status = st.open ? t.open : t.closed
  const statusHours = st.closes ? tr('closes_at', { t: st.closes }) : st.opens ? tr('opens_at', { t: st.opens }) : ''
  const todayDow = apiWeekday(today())
  // API weekdays run Monday (0) → Sunday (6); DOWF is indexed like Date#getDay (Sunday first).
  const hoursList = [0, 1, 2, 3, 4, 5, 6].map((d) => {
    const name = DOWF[L][(d + 1) % 7]
    const text = dayHoursText(g.hours.find((h) => h.dayOfWeek === d), L)
    return { day: name[0].toUpperCase() + name.slice(1), h: text ?? t.closed, closed: !text, today: d === todayDow }
  })
  const from = g.services.length ? Math.min(...g.services.map((s) => s.price)) : null

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <Hero height={300 + insets.top} />

        <Box gap="l" style={{ paddingTop: 20, paddingHorizontal: 16 }}>
          <Box gap="s">
            <Text w={800} fontSize={28} lh={1.25}>{g.name}</Text>
            <Text fontSize={15} color="grey600">
              {[km != null ? tr('km', { d: num(km) }) : null, [g.area, g.city].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
            </Text>
            <Box flexDirection="row" alignItems="center" gap="xs">
              <Icon name="location_on" size={18} color="grey600" />
              <Text fontSize={15} color="grey600" style={{ flex: 1 }}>{g.address}</Text>
            </Box>
            <Box flexDirection="row" alignItems="center" gap="s">
              <Box backgroundColor={st.open ? 'positiveTint' : 'negativeTint'} borderRadius="pill" style={{ paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text w={700} fontSize={13} color={st.open ? 'positiveInk' : 'negativeInk'}>{status}</Text>
              </Box>
              <Text fontSize={15} color="grey600">{statusHours}</Text>
            </Box>
          </Box>

          {g.description ? <Text fontSize={15} lh={1.5}>{g.description}</Text> : null}

          <Box flexDirection="row" gap="sm">
            {act.canCall && <Button label={t.call} icon="call" variant="secondary" height={48} fontSize={15} flex={1} onPress={act.call} />}
            <Button label={t.directions} icon="directions" variant="secondary" height={48} fontSize={15} flex={1} onPress={act.directions} />
          </Box>
          {g.location && <Pressable onPress={act.directions}><MiniMap lat={g.location.latitude} lon={g.location.longitude} /></Pressable>}

          <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.grey150 }}>
            <Pressable onPress={() => setHoursOpen(!hoursOpen)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 60 }} accessibilityState={{ expanded: hoursOpen }}>
              <Icon name="schedule" size={22} />
              <Box flex={1} gap="xxs">
                <Text w={700} fontSize={16}>{t.hours}</Text>
                <Text fontSize={13} color="grey600" numberOfLines={1}>{t.today + ' · ' + hoursList[todayDow].h}</Text>
              </Box>
              <Icon name="expand_more" style={{ transform: [{ rotate: hoursOpen ? '180deg' : '0deg' }] }} />
            </Pressable>
            {hoursOpen && (
              <Box gap="s" style={{ paddingBottom: 16, paddingStart: 34 }}>
                {hoursList.map((h) => (
                  <Box key={h.day} flexDirection="row" justifyContent="space-between" gap="s">
                    <Text w={h.today ? 700 : 400} fontSize={15}>{h.day}</Text>
                    <Text w={h.today ? 700 : 400} fontSize={15} color={h.closed ? 'negativeInk' : 'ink'} style={{ flexShrink: 1 }}>{h.h}</Text>
                  </Box>
                ))}
              </Box>
            )}
          </View>

          <Box gap="xs">
            <Text w={800} fontSize={20} style={{ marginBottom: 4 }}>{t.services_prices}</Text>
            {g.services.length === 0 && <Text fontSize={15} color="grey600">{t.no_services}</Text>}
            {g.services.map((s) => (
              <Box key={s.id} flexDirection="row" alignItems="center" gap="sm" style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.grey120 }}>
                <Box flex={1} minWidth={0}>
                  <Text w={600} fontSize={16}>{svcName(s, L)}</Text>
                  {svcDesc(s, L) ? <Text fontSize={13} color="grey600" style={{ marginTop: 2 }}>{svcDesc(s, L)}</Text> : null}
                </Box>
                <Text w={700} fontSize={16}>{price(s.price, L)}</Text>
              </Box>
            ))}
          </Box>
        </Box>
      </ScrollView>

      {header}

      <BottomBar>
        <Box>
          <Text fontSize={13} color="grey600">{t.starting}</Text>
          <Text w={800} fontSize={20} numberOfLines={1}>{from === null ? '—' : price(from, L)}</Text>
        </Box>
        <Button label={t.book_now} flex={1} disabled={!g.services.length} onPress={() => { startBooking(g.id); navigation.navigate('Book1') }} />
      </BottomBar>
    </View>
  )
}
