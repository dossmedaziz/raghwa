import { useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native'
import { colors, elevation } from '@/theme'
import { Box, Bubbles, Button, Icon, InfoRow, Notice, Plate, Skeleton, Text, Thumb } from '@/components/ui'
import { BottomBar, Footer, NavHeader, Screen } from '@/components/screen'
import { DOW, FOAM_S, MON, MONS } from '@/data/constants'
import { api } from '@/lib/api'
import { addDays, apiWeekday, dateParts, nowTime, today } from '@/lib/clock'
import { errorCode, notifyError } from '@/lib/errors'
import { dLong, iso, price, range } from '@/lib/format'
import { svcDesc, svcName } from '@/lib/garage'
import { useT } from '@/lib/i18n'
import { invalidate, useQuery } from '@/lib/query'
import { carPlate, toast, useStore } from '@/store'
import type { GarageDetail } from '@/lib/types'
import type { ScreenProps } from '@/navigation/types'

/** The booking window shown in the date strip. */
const DAYS = 14
/** Errors that mean "pick another slot". */
const SLOT_ERRORS = ['SLOT_FULL', 'SLOT_IN_PAST', 'SLOT_BLOCKED', 'NOT_A_SLOT', 'DAY_BLOCKED', 'GARAGE_CLOSED', 'BOOKING_TOO_FAR', 'DUPLICATE_BOOKING', 'SAME_SLOT']

/** Garage (cached from its page) + the reservation being moved, for the booking / reschedule flow. */
function useFlow() {
  const s = useStore()
  const gq = useQuery('garage|' + s.gid, () => api.garages.get(s.gid))
  return { s, isR: s.mode === 'resched', rr: s.rr, g: gq.data }
}

const isClosed = (g: GarageDetail | undefined, date: string) => !!g && !g.hours.find((h) => h.dayOfWeek === apiWeekday(date))?.isOpen
/** No slot left today: closed, or past closing time. */
const doneToday = (g: GarageDetail | undefined, date: string) =>
  isClosed(g, date) || (!!g && nowTime() >= (g.hours.find((h) => h.dayOfWeek === apiWeekday(date))?.closesAt ?? '24:00'))

/** Selected services that the garage still offers. */
const chosenServices = (g: GarageDetail | undefined, ids: string[]) => (g ? g.services.filter((x) => ids.includes(x.id)) : [])

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

/** Step 1 (and reschedule): 14-day date strip + the garage's slot grid for the picked day. */
export function Book1Screen({ navigation }: ScreenProps<'Book1'>) {
  const { t, tr, L, ar } = useT()
  const { width } = useWindowDimensions()
  const { s, isR, rr, g } = useFlow()
  const sel = isR ? s.rs : s.bk
  const pick = (p: { date?: string; time?: string | null }) => (isR ? s.setRs(p) : s.setBk(p))
  const strip = useRef<ScrollView>(null)

  const first = today()
  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => addDays(first, i)), [first])
  // Until a day is picked: the first day the garage still takes bookings.
  const date = sel.date ?? days.find((d) => (d === first ? !doneToday(g, d) : !isClosed(g, d))) ?? first
  const avq = useQuery(`avail|${s.gid}|${date}`, () => api.garages.availability(s.gid, date))
  const slots = avq.data?.slots ?? []
  const dur = g?.slotDurationMinutes ?? 30
  const dp = dateParts(date)

  const col = (width - 32 - 16) / 3
  const slot = ({ time, available }: { time: string; available: number }) => {
    const old = isR && !!rr && date === rr.date && time === rr.time
    const a = old ? 0 : available
    const on = sel.time === time, dis = a <= 0
    const sub = old ? (ar ? 'وقتك' : 'Actuel') : a === 0 ? t.full : a === 1 ? t.left1 : a === 2 ? t.left2 : tr('left_n', { n: a })
    return (
      <Pressable key={time} disabled={dis} onPress={() => pick({ date, time })} accessibilityState={{ selected: on, disabled: dis }}
        style={{ width: col, height: 60, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 3,
          backgroundColor: on ? colors.primary : dis ? colors.grey50 : colors.bg, borderColor: on ? colors.primary : dis ? colors.grey50 : colors.grey200 }}>
        <Text latin w={700} fontSize={16} align="center" color={on ? 'white' : dis ? 'grey400' : 'ink'}>{time}</Text>
        <Box flexDirection="row" alignItems="center" gap="xs">
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: on ? colors.aqua : dis ? colors.grey300 : a === 1 ? colors.warning : colors.positive }} />
          <Text w={600} fontSize={12} style={{ color: on ? '#DCE7FF' : dis ? colors.grey450 : a === 1 ? colors.warningInk : colors.positiveInk }}>{sub}</Text>
        </Box>
      </Pressable>
    )
  }
  const group = (list: typeof slots, icon: string, label: string) => {
    if (!list.length) return null
    const free = list.filter((x) => x.available > 0).length
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
  const has = sel.time != null && sel.date === date

  return (
    <Screen bottom={false}>
      <NavHeader title={isR ? t.resch_title : t.booking} sub={g?.name} />
      {!isR && <Steps idx={0} />}
      <ScrollView contentContainerStyle={{ paddingTop: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Text w={800} fontSize={24} style={{ paddingHorizontal: 16 }}>{t.pick_time}</Text>
        <Text w={600} fontSize={14} color="grey600" style={{ paddingHorizontal: 16, paddingTop: 4 }}>{MON[L][dp.month] + ' ' + dp.year}</Text>
        <ScrollView ref={strip} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}
          // With `direction: rtl` the strip is laid out from the right; start the scroll there too.
          onContentSizeChange={() => ar && strip.current?.scrollToEnd({ animated: false })}>
          {days.map((d, i) => {
            const p = dateParts(d), closed = isClosed(g, d), on = date === d
            const sub = on ? '#CFE0FF' : closed ? colors.grey400 : colors.grey500
            return (
              <Pressable key={d} disabled={closed} onPress={() => pick({ date: d, time: null })} accessibilityState={{ selected: on, disabled: closed }}
                style={{ width: 60, height: 80, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 2,
                  backgroundColor: on ? colors.primary : closed ? colors.grey50 : colors.bg, borderColor: on ? colors.primary : closed ? colors.grey50 : colors.grey200 }}>
                <Text w={600} fontSize={12} align="center" style={{ color: sub }}>{i === 0 ? t.today_s : DOW[L][p.dow]}</Text>
                <Text latin w={800} fontSize={22} align="center" color={on ? 'white' : closed ? 'grey400' : 'ink'} style={closed ? { textDecorationLine: 'line-through' } : undefined}>{p.day}</Text>
                <Text w={600} fontSize={11} align="center" style={{ color: sub }}>{MONS[L][p.month]}</Text>
              </Pressable>
            )
          })}
        </ScrollView>
        <Box flexDirection="row" gap="m" style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Legend color={colors.positive} label={t.available} />
          <Legend color={colors.warning} label={t.few} />
          <Legend color={colors.grey300} label={t.full} />
        </Box>
        {avq.loading ? (
          <Box flexDirection="row" flexWrap="wrap" gap="s" style={{ paddingHorizontal: 16, paddingTop: 24 }}>
            {Array.from({ length: 9 }, (_, i) => <Skeleton key={i} w={col} h={60} r={12} />)}
          </Box>
        ) : avq.error && !avq.data ? (
          <Box alignItems="center" gap="s" style={{ padding: 24 }}>
            <Text w={700} fontSize={16} align="center">{t.load_err_t}</Text>
            <Button label={t.retry} icon="refresh" variant="secondary" height={44} fontSize={15} px={20} onPress={() => void avq.reload()} />
          </Box>
        ) : !slots.length ? (
          <Box alignItems="center" gap="s" style={{ padding: 32 }}>
            <Icon name="event_busy" size={40} color="grey400" />
            <Text w={700} fontSize={16} color="grey600" align="center">{avq.data?.isOpen === false ? t.closed_day : t.no_slots}</Text>
          </Box>
        ) : (
          <Box gap="sm" style={{ paddingHorizontal: 16, paddingTop: 20 }}>
            {group(slots.filter((x) => x.time < '12:00'), 'wb_sunny', t.morning)}
            <View style={{ height: 12 }} />
            {group(slots.filter((x) => x.time >= '12:00'), 'wb_twilight', t.afternoon)}
          </Box>
        )}
      </ScrollView>
      <BottomBar shadow>
        <Box flex={1} minWidth={0}>
          <Text w={700} fontSize={15} numberOfLines={1}>{has ? dLong(date, L) : t.pick_slot}</Text>
          {has ? <Text fontSize={14} color="grey600">{range(sel.time!, dur, L)}</Text> : null}
        </Box>
        <Button label={t.continue} px={32} disabled={!has} onPress={() => navigation.navigate(isR ? 'Resched2' : 'Book2')} />
      </BottomBar>
    </Screen>
  )
}

/** Step 2: services (all in the same slot) + car. */
export function Book2Screen({ navigation }: ScreenProps<'Book2'>) {
  const { t, tr, L } = useT()
  const { s, g } = useFlow()
  const [err, setErr] = useState(false)
  const chosen = chosenServices(g, s.bk.svc)
  const total = chosen.reduce((a, x) => a + x.price, 0)
  const has = chosen.length > 0
  return (
    <Screen bottom={false}>
      <NavHeader title={t.booking} sub={g?.name} />
      <Steps idx={1} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24, gap: 12 }} showsVerticalScrollIndicator={false}>
        <Text w={800} fontSize={24}>{t.pick_services}</Text>
        <Notice icon="info">{t.same_slot}</Notice>
        {err && <Notice icon="error" tone="negative" align="center">{t.e_services}</Notice>}
        {(g?.services ?? []).map((x) => {
          const on = s.bk.svc.includes(x.id)
          return (
            <Pressable key={x.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
              onPress={() => { setErr(false); s.setBk({ svc: on ? s.bk.svc.filter((y) => y !== x.id) : [...s.bk.svc, x.id] }) }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, borderWidth: 1.5,
                borderColor: on ? colors.primary : colors.grey200, backgroundColor: on ? colors.primarySoft : colors.bg }}>
              <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: on ? colors.primary : colors.grey400, backgroundColor: on ? colors.primary : colors.bg, alignItems: 'center', justifyContent: 'center' }}>
                {on && <Icon name="check" size={18} color="white" />}
              </View>
              <Box flex={1} minWidth={0}>
                <Text w={700} fontSize={16}>{svcName(x, L)}</Text>
                {svcDesc(x, L) ? <Text fontSize={13} color="grey600" lh={1.4} style={{ marginTop: 2 }}>{svcDesc(x, L)}</Text> : null}
              </Box>
              <Text w={700} fontSize={16}>{price(x.price, L)}</Text>
            </Pressable>
          )
        })}
        <Text w={800} fontSize={18} style={{ marginTop: 16 }}>{t.your_car}</Text>
        <Box flexDirection="row" flexWrap="wrap" gap="s">
          {s.cars.map((c) => {
            const on = s.bk.car === c.id
            return (
              <Pressable key={c.id} onPress={() => s.setBk({ car: on ? null : c.id })} accessibilityState={{ selected: on }}
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
          <Text fontSize={13} color="grey600">{t.total} · {chosen.length === 1 ? t.one_service : tr('n_services', { n: chosen.length })}</Text>
          <Text w={800} fontSize={22}>{price(total, L)}</Text>
        </Box>
        <Button label={t.continue} px={32} variant={has ? 'primary' : 'disabled'}
          onPress={() => { if (!has) return setErr(true); s.setBk({ svc: chosen.map((x) => x.id) }); navigation.navigate('Book3') }} />
      </BottomBar>
    </Screen>
  )
}

/** Step 3: summary, cash payment, confirm. */
export function Book3Screen({ navigation }: ScreenProps<'Book3'>) {
  const { t, L } = useT()
  const { s, g } = useFlow()
  const [busy, setBusy] = useState(false)
  const chosen = chosenServices(g, s.bk.svc)
  const total = chosen.reduce((a, x) => a + x.price, 0)
  const car = s.cars.find((x) => x.id === s.bk.car)
  const { date, time } = s.bk
  const confirm = async () => {
    if (busy || !g || !date || !time) return
    setBusy(true)
    try {
      const r = await api.reservations.book({
        garageId: g.id, date, time, serviceIds: chosen.map((x) => x.id), car: car ? { brand: car.b, model: car.m, plate: carPlate(car) } : undefined,
      })
      s.setLast(r)
      invalidate()
      navigation.reset({ index: 1, routes: [{ name: 'Tabs', params: { screen: 'Map' } }, { name: 'Success' }] })
    } catch (x) {
      notifyError(x)
      const code = errorCode(x)
      if (SLOT_ERRORS.includes(code)) {
        s.setBk({ time: null })
        invalidate()
        navigation.popTo('Book1')
      } else if (code === 'INVALID_SERVICES') {
        invalidate()
        navigation.popTo('Book2')
      }
    } finally {
      setBusy(false)
    }
  }
  return (
    <Screen bottom={false}>
      <NavHeader title={t.booking} sub={g?.name} />
      <Steps idx={2} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24, gap: 20 }} showsVerticalScrollIndicator={false}>
        <Text w={800} fontSize={24}>{t.summary_t}</Text>
        <Box flexDirection="row" alignItems="center" gap="sm">
          <Thumb size={56} icon={24} />
          <Box flex={1} minWidth={0}>
            <Text w={700} fontSize={17}>{g?.name}</Text>
            <Text fontSize={14} color="grey600" style={{ marginTop: 2 }}>{g?.address}</Text>
          </Box>
        </Box>
        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.grey150 }}>
          <InfoRow icon="calendar_today" label={t.date} value={date ? dLong(date, L) : ''} />
          <InfoRow icon="schedule" label={t.time} value={time ? range(time, g?.slotDurationMinutes ?? 30, L) : ''} />
          <InfoRow icon="directions_car" label={t.car} value={car ? car.b + ' ' + car.m : '—'} last />
        </View>
        <Box gap="s">
          <Text w={800} fontSize={18}>{t.services}</Text>
          {chosen.map((x) => (
            <Box key={x.id} flexDirection="row" justifyContent="space-between" gap="s">
              <Text fontSize={15} style={{ flexShrink: 1 }}>{svcName(x, L)}</Text>
              <Text w={600} fontSize={15}>{price(x.price, L)}</Text>
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
        <Button label={busy ? t.confirming : t.confirm_res + ' · ' + price(total, L)} loading={busy} disabled={!g || !chosen.length} flex={1} onPress={confirm} />
      </BottomBar>
    </Screen>
  )
}

export function SuccessScreen({ navigation }: ScreenProps<'Success'>) {
  const { t, L } = useT()
  const r = useStore((s) => s.last)
  // The garage page is cached, so the slot length is known without waiting.
  const gq = useQuery(r ? 'garage|' + r.garage.id : null, () => api.garages.get(r!.garage.id))
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
        {r && (
          <View style={[{ alignSelf: 'stretch', marginTop: 8, borderRadius: 20, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.grey150, padding: 16, gap: 12 }, elevation.float, { shadowOpacity: 0.06 }]}>
            <Box flexDirection="row" justifyContent="space-between" alignItems="center">
              <Text fontSize={14} color="grey600">{t.ref}</Text>
              <Text latin w={800} fontSize={18} style={{ fontFamily: 'Inter_800ExtraBold', letterSpacing: 0.7 }}>{r.ref}</Text>
            </Box>
            <View style={{ height: 1, backgroundColor: colors.grey120 }} />
            <Box flexDirection="row" alignItems="center" gap="s"><Icon name="local_car_wash" size={20} /><Text w={700} fontSize={15}>{r.garage.name}</Text></Box>
            <Box flexDirection="row" alignItems="center" gap="s"><Icon name="calendar_today" size={20} /><Text fontSize={15}>{dLong(r.date, L)}</Text></Box>
            <Box flexDirection="row" alignItems="center" gap="s">
              <Icon name="schedule" size={20} />
              <Text fontSize={15} style={{ flex: 1 }}>{gq.data ? range(r.time, gq.data.slotDurationMinutes, L) : iso(r.time, L)}</Text>
              <Text w={800} fontSize={15}>{price(r.total, L)}</Text>
            </Box>
          </View>
        )}
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
  const { t, L } = useT()
  const { s, rr, g } = useFlow()
  const [busy, setBusy] = useState(false)
  const dur = g?.slotDurationMinutes ?? 30
  const { date, time } = s.rs
  const confirm = async () => {
    if (busy || !rr || !date || !time) return
    setBusy(true)
    try {
      const r = await api.reservations.reschedule(rr.id, date, time)
      invalidate()
      toast('resched_toast')
      navigation.popTo('ResDetail', { id: r.id })
    } catch (x) {
      notifyError(x)
      if (SLOT_ERRORS.includes(errorCode(x))) {
        s.setRs({ time: null })
        invalidate()
        navigation.popTo('Book1')
      }
    } finally {
      setBusy(false)
    }
  }
  if (!rr) return <Screen back>{null}</Screen>
  return (
    <Screen back>
      <Box flex={1} gap="ml" style={{ paddingTop: 16, paddingHorizontal: 16 }}>
        <Box>
          <Text w={800} fontSize={28} lh={1.3}>{t.resch_t}</Text>
          <Text fontSize={15} color="grey600" style={{ marginTop: 6 }}>{rr.garage.name}</Text>
        </Box>
        <View>
          <Box padding="m" borderRadius="card" backgroundColor="grey50" gap="xs">
            <Text w={600} fontSize={13} color="grey600">{t.old_time}</Text>
            <Text w={700} fontSize={17} color="grey500" style={{ textDecorationLine: 'line-through' }}>{dLong(rr.date, L)}</Text>
            <Text fontSize={15} color="grey500" style={{ textDecorationLine: 'line-through' }}>{range(rr.time, dur, L)}</Text>
          </Box>
          <Box alignItems="center" style={{ marginVertical: -10, zIndex: 1 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.grey200, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="arrow_downward" size={22} />
            </View>
          </Box>
          <Box padding="m" borderRadius="card" gap="xs" style={{ borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primarySoft }}>
            <Text w={700} fontSize={13} color="primary">{t.new_time}</Text>
            <Text w={800} fontSize={17}>{date ? dLong(date, L) : ''}</Text>
            <Text w={600} fontSize={15}>{time ? range(time, dur, L) : ''}</Text>
          </Box>
        </View>
        <Box flexDirection="row" alignItems="center" gap="s">
          <Icon name="verified_user" size={20} color="positiveInk" />
          <Text fontSize={14} color="grey600" style={{ flex: 1 }}>{t.resch_note}</Text>
        </Box>
      </Box>
      <Footer px={16}><Button label={t.confirm_change} onPress={confirm} loading={busy} /></Footer>
    </Screen>
  )
}
