import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native'
import { colors, elevation } from '@/theme'
import { Box, Bubbles, Button, Icon, InfoRow, Notice, Plate, Skeleton, Text, Thumb } from '@/components/ui'
import { BottomBar, Footer, NavHeader, Screen } from '@/components/screen'
import { DOW, FOAM_S, MON, MONS, SVM, avail, dayAt, gById, svcPrice } from '@/data/mock'
import { dLong, hm, price, range, toM } from '@/lib/format'
import { useGarageView } from '@/lib/garage'
import { useT } from '@/lib/i18n'
import { toast, useStore } from '@/store'
import type { ScreenProps } from '@/navigation/types'

/** Garage + current reservation for the booking / reschedule flow. */
function useFlow() {
  const s = useStore()
  const isR = s.mode === 'resched'
  const rr = s.res.find((r) => r.ref === s.rid) ?? s.res[0]
  const g = gById(isR ? rr.g : s.gid)
  return { s, isR, rr, g }
}

function Steps({ idx }: { idx: number }) {
  const { t } = useT()
  return (
    <Box flexDirection="row" gap="s" style={{ paddingHorizontal: 16, paddingTop: 4 }}>
      {[t.step_slot, t.step_services, t.step_confirm].map((label, i) => (
        <Box key={i} flex={1} gap="s">
          <View style={{ height: 4, borderRadius: 2, backgroundColor: i <= idx ? colors.primary : colors.grey200 }} />
          <Text w={i === idx ? 700 : 500} fontSize={12} color={i <= idx ? 'ink' : 'grey450'}>{i + 1 + '. ' + label}</Text>
        </Box>
      ))}
    </Box>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <Box flexDirection="row" alignItems="center" gap="s">
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text w={600} fontSize={12} color="grey600">{label}</Text>
    </Box>
  )
}

/** Step 1 (and reschedule): 14-day date strip + 30-min slot grid. */
export function Book1Screen({ navigation }: ScreenProps<'Book1'>) {
  const { t, L, ar } = useT()
  const { width } = useWindowDimensions()
  const { s, isR, rr, g } = useFlow()
  const gv = useGarageView()
  const sel = isR ? s.rs : s.bk
  const pick = (p: { di?: number; m?: number | null }) => (isR ? s.setRs(p) : s.setBk(p))
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const pickDate = (i: number) => {
    pick({ di: i, m: null })
    setLoading(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setLoading(false), 550)
  }
  const strip = useRef<ScrollView>(null)

  const times: number[] = []
  for (let m = 480; m + 30 <= toM(g.close); m += 30) times.push(m)
  const col = (width - 32 - 16) / 3
  const slot = (m: number) => {
    const old = isR && sel.di === rr.di && m === rr.m
    const a = old ? 0 : avail(g.id, sel.di, m)
    const on = sel.m === m, dis = a <= 0
    const sub = old ? (ar ? 'وقتك' : 'Actuel') : a < 0 ? t.past : a === 0 ? t.full : t[`left${a}` as 'left1']
    return (
      <Pressable key={m} disabled={dis} onPress={() => pick({ m })} accessibilityState={{ selected: on, disabled: dis }}
        style={{ width: col, height: 60, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 3,
          backgroundColor: on ? colors.primary : dis ? colors.grey50 : colors.bg, borderColor: on ? colors.primary : dis ? colors.grey50 : colors.grey200 }}>
        <Text latin w={700} fontSize={16} align="center" color={on ? 'white' : dis ? 'grey400' : 'ink'} style={a < 0 ? { textDecorationLine: 'line-through' } : undefined}>{hm(m)}</Text>
        <Box flexDirection="row" alignItems="center" gap="xs">
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: on ? colors.aqua : dis ? colors.grey300 : a === 1 ? colors.warning : colors.positive }} />
          <Text w={600} fontSize={12} style={{ color: on ? '#DCE7FF' : dis ? colors.grey450 : a === 1 ? colors.warningInk : colors.positiveInk }}>{sub}</Text>
        </Box>
      </Pressable>
    )
  }
  const group = (list: number[], icon: string, label: string) => {
    const free = list.filter((m) => avail(g.id, sel.di, m) > 0).length
    return (
      <Box gap="sm">
        <Box flexDirection="row" alignItems="center" gap="s">
          <Icon name={icon} size={20} />
          <Text w={700} fontSize={17} style={{ flex: 1 }}>{label}</Text>
          <Text fontSize={13} color="grey600">{free + ' ' + (ar ? 'متاح' : 'dispo.')}</Text>
        </Box>
        <Box flexDirection="row" flexWrap="wrap" gap="s">{list.map(slot)}</Box>
      </Box>
    )
  }
  const has = sel.m != null

  return (
    <Screen bottom={false}>
      <NavHeader title={isR ? t.resch_title : t.booking} sub={gv(g).name} />
      {!isR && <Steps idx={0} />}
      <ScrollView contentContainerStyle={{ paddingTop: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Text w={800} fontSize={24} style={{ paddingHorizontal: 16 }}>{t.pick_time}</Text>
        <Text w={600} fontSize={14} color="grey600" style={{ paddingHorizontal: 16, paddingTop: 4 }}>{MON[L][dayAt(sel.di).getMonth()] + ' 2026'}</Text>
        <ScrollView ref={strip} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}
          // With `direction: rtl` the strip is laid out from the right; start the scroll there too.
          onContentSizeChange={() => ar && strip.current?.scrollToEnd({ animated: false })}>
          {Array.from({ length: 14 }, (_, i) => {
            const d = dayAt(i), closed = d.getDay() === 0, on = sel.di === i
            const sub = on ? '#CFE0FF' : closed ? colors.grey400 : colors.grey500
            return (
              <Pressable key={i} disabled={closed} onPress={() => pickDate(i)} accessibilityState={{ selected: on, disabled: closed }}
                style={{ width: 60, height: 80, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 2,
                  backgroundColor: on ? colors.primary : closed ? colors.grey50 : colors.bg, borderColor: on ? colors.primary : closed ? colors.grey50 : colors.grey200 }}>
                <Text w={600} fontSize={12} align="center" style={{ color: sub }}>{i === 0 ? t.today_s : DOW[L][d.getDay()]}</Text>
                <Text latin w={800} fontSize={22} align="center" color={on ? 'white' : closed ? 'grey400' : 'ink'} style={closed ? { textDecorationLine: 'line-through' } : undefined}>{d.getDate()}</Text>
                <Text w={600} fontSize={11} align="center" style={{ color: sub }}>{MONS[L][d.getMonth()]}</Text>
              </Pressable>
            )
          })}
        </ScrollView>
        <Box flexDirection="row" gap="m" style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Legend color={colors.positive} label={t.available} />
          <Legend color={colors.warning} label={t.few} />
          <Legend color={colors.grey300} label={t.full} />
        </Box>
        {loading ? (
          <Box flexDirection="row" flexWrap="wrap" gap="s" style={{ paddingHorizontal: 16, paddingTop: 24 }}>
            {Array.from({ length: 9 }, (_, i) => <Skeleton key={i} w={col} h={60} r={12} />)}
          </Box>
        ) : (
          <Box gap="sm" style={{ paddingHorizontal: 16, paddingTop: 20 }}>
            {group(times.filter((m) => m < 720), 'wb_sunny', t.morning)}
            <View style={{ height: 12 }} />
            {group(times.filter((m) => m >= 720), 'wb_twilight', t.afternoon)}
          </Box>
        )}
      </ScrollView>
      <BottomBar shadow>
        <Box flex={1} minWidth={0}>
          <Text w={700} fontSize={15} numberOfLines={1}>{has ? dLong(sel.di, L) : t.pick_slot}</Text>
          {has ? <Text fontSize={14} color="grey600">{range(sel.m!, L)}</Text> : null}
        </Box>
        <Button label={t.continue} px={32} disabled={!has} onPress={() => navigation.navigate(isR ? 'Resched2' : 'Book2')} />
      </BottomBar>
    </Screen>
  )
}

/** Step 2: services (all in the same slot) + car. */
export function Book2Screen({ navigation }: ScreenProps<'Book2'>) {
  const { t, tr, li, L } = useT()
  const { s, g } = useFlow()
  const gv = useGarageView()
  const [err, setErr] = useState(false)
  const total = s.bk.svc.reduce((a, id) => a + svcPrice(g, id), 0)
  const has = s.bk.svc.length > 0
  return (
    <Screen bottom={false}>
      <NavHeader title={t.booking} sub={gv(g).name} />
      <Steps idx={1} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24, gap: 12 }} showsVerticalScrollIndicator={false}>
        <Text w={800} fontSize={24}>{t.pick_services}</Text>
        <Notice icon="info">{t.same_slot}</Notice>
        {err && <Notice icon="error" tone="negative" align="center">{t.e_services}</Notice>}
        {g.svc.map((id) => {
          const x = SVM[id], on = s.bk.svc.includes(id)
          return (
            <Pressable key={id} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
              onPress={() => { setErr(false); s.setBk({ svc: on ? s.bk.svc.filter((y) => y !== id) : [...s.bk.svc, id] }) }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, borderWidth: 1.5,
                borderColor: on ? colors.primary : colors.grey200, backgroundColor: on ? colors.primarySoft : colors.bg }}>
              <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: on ? colors.primary : colors.grey400, backgroundColor: on ? colors.primary : colors.bg, alignItems: 'center', justifyContent: 'center' }}>
                {on && <Icon name="check" size={18} color="white" />}
              </View>
              <Box flex={1} minWidth={0}>
                <Text w={700} fontSize={16}>{x.n[li]}</Text>
                <Text fontSize={13} color="grey600" lh={1.4} style={{ marginTop: 2 }}>{x.d[li]} · {tr('min', { n: x.dur })}</Text>
              </Box>
              <Text w={700} fontSize={16}>{price(svcPrice(g, id), L)}</Text>
            </Pressable>
          )
        })}
        <Text w={800} fontSize={18} style={{ marginTop: 16 }}>{t.your_car}</Text>
        <Box flexDirection="row" flexWrap="wrap" gap="s">
          {s.cars.map((c) => {
            const on = s.bk.car === c.id
            return (
              <Pressable key={c.id} onPress={() => s.setBk({ car: c.id })} accessibilityState={{ selected: on }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5,
                  borderColor: on ? colors.primary : colors.grey200, backgroundColor: on ? colors.primaryTint : colors.bg }}>
                <Icon name="directions_car" size={20} />
                <Text w={on ? 700 : 500} fontSize={14}>{c.b + ' ' + c.m}</Text>
                <Plate ps={c.ps} pn={c.pn} size="s" />
              </Pressable>
            )
          })}
          <Pressable onPress={() => navigation.navigate('CarForm')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 48, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.grey400 }}>
            <Icon name="add" size={20} />
            <Text w={600} fontSize={14}>{t.add_car}</Text>
          </Pressable>
        </Box>
      </ScrollView>
      <BottomBar shadow>
        <Box flex={1}>
          <Text fontSize={13} color="grey600">{t.total} · {s.bk.svc.length === 1 ? t.one_service : tr('n_services', { n: s.bk.svc.length })}</Text>
          <Text w={800} fontSize={22}>{price(total, L)}</Text>
        </Box>
        <Button label={t.continue} px={32} variant={has ? 'primary' : 'disabled'} onPress={() => (has ? navigation.navigate('Book3') : setErr(true))} />
      </BottomBar>
    </Screen>
  )
}

/** Step 3: summary, cash payment, confirm. */
export function Book3Screen({ navigation }: ScreenProps<'Book3'>) {
  const { t, li, L } = useT()
  const { s, g } = useFlow()
  const gd = useGarageView()(g)
  const [busy, setBusy] = useState(false)
  const total = s.bk.svc.reduce((a, id) => a + svcPrice(g, id), 0)
  const car = s.cars.find((x) => x.id === s.bk.car) ?? s.cars[0]
  const confirm = () => {
    if (busy) return
    setBusy(true)
    setTimeout(() => {
      s.confirmBooking()
      navigation.reset({ index: 1, routes: [{ name: 'Tabs', params: { screen: 'Map' } }, { name: 'Success' }] })
    }, 1100)
  }
  return (
    <Screen bottom={false}>
      <NavHeader title={t.booking} sub={gd.name} />
      <Steps idx={2} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24, gap: 20 }} showsVerticalScrollIndicator={false}>
        <Text w={800} fontSize={24}>{t.summary_t}</Text>
        <Box flexDirection="row" alignItems="center" gap="sm">
          <Thumb size={56} icon={24} />
          <Box flex={1} minWidth={0}>
            <Text w={700} fontSize={17}>{gd.name}</Text>
            <Text fontSize={14} color="grey600" style={{ marginTop: 2 }}>{gd.addr}</Text>
          </Box>
        </Box>
        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.grey150 }}>
          <InfoRow icon="calendar_today" label={t.date} value={dLong(s.bk.di, L)} />
          <InfoRow icon="schedule" label={t.time} value={s.bk.m != null ? range(s.bk.m, L) : ''} />
          <InfoRow icon="directions_car" label={t.car} value={car ? car.b + ' ' + car.m : '—'} last />
        </View>
        <Box gap="s">
          <Text w={800} fontSize={18}>{t.services}</Text>
          {s.bk.svc.map((id) => (
            <Box key={id} flexDirection="row" justifyContent="space-between">
              <Text fontSize={15}>{SVM[id].n[li]}</Text>
              <Text w={600} fontSize={15}>{price(svcPrice(g, id), L)}</Text>
            </Box>
          ))}
          <View style={{ height: 1, backgroundColor: colors.grey150, marginVertical: 4 }} />
          <Box flexDirection="row" justifyContent="space-between" alignItems="baseline">
            <Text w={800} fontSize={17}>{t.total}</Text>
            <Text w={800} fontSize={24}>{price(total, L)}</Text>
          </Box>
        </Box>
        <Box gap="s">
          <Text w={800} fontSize={18}>{t.payment}</Text>
          <Box flexDirection="row" alignItems="center" gap="sm" style={{ paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primarySoft }}>
            <Box width={40} height={40} borderRadius="pill" backgroundColor="bg" alignItems="center" justifyContent="center"><Icon name="payments" size={22} color="positiveInk" /></Box>
            <Box flex={1}>
              <Text w={700} fontSize={16}>{t.cash}</Text>
              <Text fontSize={13} color="grey600">{t.cash_s}</Text>
            </Box>
            <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary }} />
            </View>
          </Box>
          <Box flexDirection="row" alignItems="center" gap="sm" style={{ paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, borderWidth: 1.5, borderColor: colors.grey150, opacity: 0.55 }} accessibilityState={{ disabled: true }}>
            <Box width={40} height={40} borderRadius="pill" backgroundColor="grey100" alignItems="center" justifyContent="center"><Icon name="credit_card" size={22} /></Box>
            <Text w={700} fontSize={16} style={{ flex: 1 }}>{t.card}</Text>
            <Box backgroundColor="grey150" borderRadius="pill" style={{ paddingHorizontal: 10, paddingVertical: 3 }}><Text w={700} fontSize={12} style={{ color: colors.grey700 }}>{t.soon}</Text></Box>
          </Box>
        </Box>
        <Box flexDirection="row" alignItems="center" gap="s">
          <Icon name="verified_user" size={20} color="positiveInk" />
          <Text fontSize={14} color="grey600" lh={1.45} style={{ flex: 1 }}>{t.cancel_note}</Text>
        </Box>
      </ScrollView>
      <BottomBar>
        <Button label={busy ? t.confirming : t.confirm_res + ' · ' + price(total, L)} loading={busy} flex={1} onPress={confirm} />
      </BottomBar>
    </Screen>
  )
}

export function SuccessScreen({ navigation }: ScreenProps<'Success'>) {
  const { t, li, L } = useT()
  const s = useStore()
  const r = s.res.find((x) => x.ref === s.lastRef) ?? { g: 'marsa', di: 0, m: 660, svc: ['full', 'pol'] }
  const g = gById(r.g)
  const total = r.svc.reduce((a, id) => a + svcPrice(g, id), 0)
  const toTabs = (screen: 'Map' | 'Reservations') => navigation.reset({ index: 0, routes: [{ name: 'Tabs', params: { screen, params: screen === 'Reservations' ? { seg: 'up' } : undefined } }] })
  return (
    <Screen>
      <Bubbles items={FOAM_S} />
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingTop: 56, paddingHorizontal: 24, gap: 16 }}>
        <View style={{ width: 140, height: 140, borderRadius: 70, backgroundColor: colors.aquaTint, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', top: -6, end: 4, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.bg, borderWidth: 2, borderColor: colors.aquaLight }} />
          <View style={{ position: 'absolute', bottom: 6, start: -8, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.bg, borderWidth: 2, borderColor: colors.aquaLight }} />
          <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: colors.positive, alignItems: 'center', justifyContent: 'center', shadowColor: colors.positive, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 10 }, elevation: 8 }}>
            <Icon name="check" size={60} color="white" />
          </View>
        </View>
        <Text w={800} fontSize={30} align="center" style={{ marginTop: 8 }}>{t.success_t}</Text>
        <Text fontSize={16} color="grey600" lh={1.5} align="center" style={{ maxWidth: 300 }}>{t.success_s}</Text>
        <View style={[{ alignSelf: 'stretch', marginTop: 8, borderRadius: 20, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.grey150, padding: 16, gap: 12 }, elevation.float, { shadowOpacity: 0.06 }]}>
          <Box flexDirection="row" justifyContent="space-between" alignItems="center">
            <Text fontSize={14} color="grey600">{t.ref}</Text>
            <Text latin w={800} fontSize={18} style={{ fontFamily: 'Inter_800ExtraBold', letterSpacing: 0.7 }}>{s.lastRef}</Text>
          </Box>
          <View style={{ height: 1, backgroundColor: colors.grey120 }} />
          <Box flexDirection="row" alignItems="center" gap="s"><Icon name="local_car_wash" size={20} /><Text w={700} fontSize={15}>{g.n[li]}</Text></Box>
          <Box flexDirection="row" alignItems="center" gap="s"><Icon name="calendar_today" size={20} /><Text fontSize={15}>{dLong(r.di, L)}</Text></Box>
          <Box flexDirection="row" alignItems="center" gap="s">
            <Icon name="schedule" size={20} /><Text fontSize={15} style={{ flex: 1 }}>{range(r.m, L)}</Text><Text w={800} fontSize={15}>{price(total, L)}</Text>
          </Box>
        </View>
      </ScrollView>
      <Footer gap={8}>
        <Button label={t.add_cal} icon="event" variant="secondary" height={52} fontSize={16} onPress={() => toast('cal_added')} />
        <Button label={t.my_res} onPress={() => toTabs('Reservations')} />
        <Button label={t.back_map} variant="tertiary" height={48} fontSize={16} onPress={() => toTabs('Map')} />
      </Footer>
    </Screen>
  )
}

/** Reschedule: old slot (struck through) → new slot. */
export function Resched2Screen({ navigation }: ScreenProps<'Resched2'>) {
  const { t, li, L } = useT()
  const { s, rr, g } = useFlow()
  const confirm = () => {
    s.confirmResched()
    toast('resched_toast')
    navigation.popTo('ResDetail', { ref: rr.ref })
  }
  return (
    <Screen back>
      <Box flex={1} gap="ml" style={{ paddingTop: 16, paddingHorizontal: 16 }}>
        <Box>
          <Text w={800} fontSize={28} lh={1.3}>{t.resch_t}</Text>
          <Text fontSize={15} color="grey600" style={{ marginTop: 6 }}>{g.n[li]}</Text>
        </Box>
        <View>
          <Box padding="m" borderRadius="card" backgroundColor="grey50" gap="xs">
            <Text w={600} fontSize={13} color="grey600">{t.old_time}</Text>
            <Text w={700} fontSize={17} color="grey500" style={{ textDecorationLine: 'line-through' }}>{dLong(rr.di, L)}</Text>
            <Text fontSize={15} color="grey500" style={{ textDecorationLine: 'line-through' }}>{range(rr.m, L)}</Text>
          </Box>
          <Box alignItems="center" style={{ marginVertical: -10, zIndex: 1 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.grey200, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="arrow_downward" size={22} />
            </View>
          </Box>
          <Box padding="m" borderRadius="card" gap="xs" style={{ borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primarySoft }}>
            <Text w={700} fontSize={13} color="primary">{t.new_time}</Text>
            <Text w={800} fontSize={17}>{dLong(s.rs.di, L)}</Text>
            <Text w={600} fontSize={15}>{s.rs.m != null ? range(s.rs.m, L) : ''}</Text>
          </Box>
        </View>
        <Box flexDirection="row" alignItems="center" gap="s">
          <Icon name="verified_user" size={20} color="positiveInk" />
          <Text fontSize={14} color="grey600" style={{ flex: 1 }}>{t.resch_note}</Text>
        </Box>
      </Box>
      <Footer px={16}><Button label={t.confirm_change} onPress={confirm} /></Footer>
    </Screen>
  )
}
