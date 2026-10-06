import { useState } from 'react'
import { Linking, Platform, Pressable, ScrollView, Share, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '@/theme'
import { BackButton, Box, Button, Icon, IconButton, Text } from '@/components/ui'
import { BottomBar } from '@/components/screen'
import { MiniMap } from '@/components/GarageMap'
import { DOWF, REV, SVM, gById, svcPrice, type Garage } from '@/data/mock'
import { iso, price } from '@/lib/format'
import { useGarageView } from '@/lib/garage'
import { useT } from '@/lib/i18n'
import { toast, useStore } from '@/store'
import type { ScreenProps } from '@/navigation/types'

/** Opens the dialer / maps app (toasts first, like the prototype). */
export function useGarageActions(g: Garage) {
  return {
    call: () => { toast('calling'); Linking.openURL('tel:' + (g.tel ?? '+21671000000').replace(/\s/g, '')).catch(() => {}) },
    directions: () => {
      toast('opening_maps')
      const url = Platform.OS === 'ios' ? `maps:?daddr=${g.lat},${g.lon}` : `https://www.google.com/maps/dir/?api=1&destination=${g.lat},${g.lon}`
      Linking.openURL(url).catch(() => {})
    },
  }
}

export function GarageScreen({ navigation, route }: ScreenProps<'Garage'>) {
  const { t, tr, li, L } = useT()
  const insets = useSafeAreaInsets()
  const g = gById(route.params.gid)
  const gd = useGarageView()(g)
  const act = useGarageActions(g)
  const startBooking = useStore((s) => s.startBooking)
  const [photo, setPhoto] = useState(0)
  const [hoursOpen, setHoursOpen] = useState(false)

  const share = async () => {
    try { await Share.share({ message: gd.name + ' · ' + gd.addr + ' — Raghwa' }) } catch { /* dismissed */ }
    toast('link_copied')
  }
  const hoursList = [1, 2, 3, 4, 5, 6, 0].map((d) => ({
    day: DOWF[L][d][0].toUpperCase() + DOWF[L][d].slice(1), h: d === 0 ? t.closed : iso('08:00 – ' + g.close, L), today: d === 6, sunday: d === 0,
  }))

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => setPhoto((photo + 1) % 3)} style={{ height: 300 + insets.top, backgroundColor: colors.thumb, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="local_car_wash" size={56} color="thumbInk" />
          <View style={{ marginTop: 8, backgroundColor: 'rgba(255,255,255,.75)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
            <Text latin fontSize={12} style={{ color: '#5F7390' }}>{(li === 0 ? 'صورة الڨراج ' : 'photo station ') + (photo + 1) + '/3'}</Text>
          </View>
          <Box flexDirection="row" gap="xs" style={{ position: 'absolute', bottom: 16, direction: 'ltr' }}>
            {[0, 1, 2].map((i) => <View key={i} style={{ height: 6, width: i === photo ? 20 : 6, borderRadius: 3, backgroundColor: i === photo ? '#fff' : 'rgba(255,255,255,.6)' }} />)}
          </Box>
        </Pressable>

        <Box gap="l" style={{ paddingTop: 20, paddingHorizontal: 16 }}>
          <Box gap="s">
            <Text w={800} fontSize={28} lh={1.25}>{gd.name}</Text>
            <Box flexDirection="row" alignItems="center" gap="xs">
              <Icon name="star" size={18} />
              <Text w={700} fontSize={15}>{gd.rating}</Text>
              <Text fontSize={15} color="grey600">({gd.reviews}) · {gd.dist}</Text>
            </Box>
            <Box flexDirection="row" alignItems="center" gap="xs">
              <Icon name="location_on" size={18} color="grey600" />
              <Text fontSize={15} color="grey600" style={{ flex: 1 }}>{gd.addr}</Text>
            </Box>
            <Box flexDirection="row" alignItems="center" gap="s">
              <Box backgroundColor={gd.sBg} borderRadius="pill" style={{ paddingHorizontal: 10, paddingVertical: 3 }}><Text w={700} fontSize={13} color={gd.sFg}>{gd.status}</Text></Box>
              <Text fontSize={15} color="grey600">{gd.hours}</Text>
            </Box>
          </Box>

          <Box flexDirection="row" gap="sm">
            <Button label={t.call} icon="call" variant="secondary" height={48} fontSize={15} flex={1} onPress={act.call} />
            <Button label={t.directions} icon="directions" variant="secondary" height={48} fontSize={15} flex={1} onPress={act.directions} />
          </Box>
          <Pressable onPress={act.directions}><MiniMap lat={g.lat} lon={g.lon} /></Pressable>

          <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.grey150 }}>
            <Pressable onPress={() => setHoursOpen(!hoursOpen)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 60 }} accessibilityState={{ expanded: hoursOpen }}>
              <Icon name="schedule" size={22} />
              <Box flex={1} gap="xxs">
                <Text w={700} fontSize={16}>{t.hours}</Text>
                <Text fontSize={13} color="grey600">{t.today + ' · ' + iso('08:00 – ' + g.close, L)}</Text>
              </Box>
              <Icon name="expand_more" style={{ transform: [{ rotate: hoursOpen ? '180deg' : '0deg' }] }} />
            </Pressable>
            {hoursOpen && (
              <Box gap="s" style={{ paddingBottom: 16, paddingStart: 34 }}>
                {hoursList.map((h) => (
                  <Box key={h.day} flexDirection="row" justifyContent="space-between">
                    <Text w={h.today ? 700 : 400} fontSize={15}>{h.day}</Text>
                    <Text w={h.today ? 700 : 400} fontSize={15} color={h.sunday ? 'negativeInk' : 'ink'}>{h.h}</Text>
                  </Box>
                ))}
              </Box>
            )}
          </View>

          <Box gap="xs">
            <Text w={800} fontSize={20} style={{ marginBottom: 4 }}>{t.services_prices}</Text>
            {g.svc.map((id) => (
              <Box key={id} flexDirection="row" alignItems="center" gap="sm" style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.grey120 }}>
                <Box flex={1} minWidth={0}>
                  <Text w={600} fontSize={16}>{SVM[id].n[li]}</Text>
                  <Text fontSize={13} color="grey600" style={{ marginTop: 2 }}>{SVM[id].d[li]} · {tr('min', { n: SVM[id].dur })}</Text>
                </Box>
                <Text w={700} fontSize={16}>{price(svcPrice(g, id), L)}</Text>
              </Box>
            ))}
          </Box>

          <Box gap="sm">
            <Box flexDirection="row" justifyContent="space-between" alignItems="center">
              <Text w={800} fontSize={20}>{t.reviews}</Text>
              <Text w={700} fontSize={15} color="primary">{t.see_all}</Text>
            </Box>
            <Box flexDirection="row" alignItems="center" gap="sm" padding="m" borderRadius="card" backgroundColor="grey50">
              <Text latin w={800} fontSize={36}>{gd.rating}</Text>
              <Box gap="xxs">
                <Box flexDirection="row">{[1, 2, 3, 4, 5].map((i) => <Icon key={i} name="star" size={16} />)}</Box>
                <Text fontSize={13} color="grey600">{gd.reviews}</Text>
              </Box>
            </Box>
            {REV.map((r) => (
              <Box key={r.n[1]} gap="s" style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.grey120 }}>
                <Box flexDirection="row" alignItems="center" gap="s">
                  <Box width={36} height={36} borderRadius="pill" backgroundColor="primaryTint" alignItems="center" justifyContent="center">
                    <Text w={800} fontSize={15} color="primary" align="center">{r.n[li][0]}</Text>
                  </Box>
                  <Box flex={1}>
                    <Text w={700} fontSize={15}>{r.n[li]}</Text>
                    <Box flexDirection="row">{[1, 2, 3, 4, 5].map((i) => <Icon key={i} name="star" size={14} color={i <= r.s ? 'ink' : 'grey300'} />)}</Box>
                  </Box>
                  <Text fontSize={12} color="grey500">{r.d[li]}</Text>
                </Box>
                <Text fontSize={15} lh={1.5}>{r.x[li]}</Text>
              </Box>
            ))}
          </Box>
        </Box>
      </ScrollView>

      <Box flexDirection="row" justifyContent="space-between" style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16 }}>
        <BackButton floating />
        <IconButton icon="ios_share" floating iconSize={22} label="share" onPress={share} />
      </Box>

      <BottomBar>
        <Box>
          <Text fontSize={13} color="grey600">{t.starting}</Text>
          <Text w={800} fontSize={20} numberOfLines={1}>{gd.from}</Text>
        </Box>
        <Button label={t.book_now} flex={1} onPress={() => { startBooking(g.id); navigation.navigate('Book1') }} />
      </BottomBar>
    </View>
  )
}
