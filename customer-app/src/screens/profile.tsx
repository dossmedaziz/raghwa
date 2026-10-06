import { useState } from 'react'
import { Pressable, ScrollView, TextInput, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '@/theme'
import { Box, Button, Dialog, Field, FieldError, Icon, Input, PasswordInput, PhoneInput, Plate, Text, Toggle } from '@/components/ui'
import { Body, Footer, Screen } from '@/components/screen'
import { LangOptions } from '@/screens/onboarding'
import { useForm, validate } from '@/screens/auth'
import { digits, fmtPhone, iso } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { toast, useStore, type Appearance } from '@/store'
import type { ScreenProps } from '@/navigation/types'
import type { Color } from '@/theme'

function MenuRow({ icon, label, value, onPress, danger, chevron = true, sub }: { icon: string; label: string; value?: string; onPress: () => void; danger?: boolean; chevron?: boolean; sub?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, height: sub ? 64 : 60, borderBottomWidth: 1, borderBottomColor: colors.grey100, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: danger ? colors.negativeTint : colors.grey100, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={22} color={danger ? 'negativeInk' : 'ink'} />
      </View>
      <Box flex={1} gap="xxs">
        <Text w={600} fontSize={16} color={(danger ? 'negativeInk' : 'ink') as Color}>{label}</Text>
        {sub ? <Text latin fontSize={13} color="grey600">{sub}</Text> : null}
      </Box>
      {value ? <Text fontSize={14} color="grey600">{value}</Text> : null}
      {chevron && <Icon name="chevron_right" size={22} color="grey400" flip />}
    </Pressable>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Text w={700} fontSize={13} color="grey600" style={{ paddingBottom: 4 }}>{title}</Text>
      {children}
    </Box>
  )
}

export function ProfileScreen() {
  const { t, tr, L } = useT()
  const nav = useNavigation()
  const insets = useSafeAreaInsets()
  const cars = useStore((s) => s.cars), phone = useStore((s) => s.phone), logout = useStore((s) => s.logout)
  const appearance = useStore((s) => s.appearance)
  const [logoutOpen, setLogoutOpen] = useState(false)
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 24 }} showsVerticalScrollIndicator={false}>
        <Box flexDirection="row" alignItems="center" gap="m" style={{ paddingTop: 8 }}>
          <Box flex={1} minWidth={0}>
            <Text w={800} fontSize={30} lh={1.25}>{t.user_name}</Text>
            <Text latin fontSize={15} color="grey600" style={{ marginTop: 4 }}>{iso('+216 ' + phone, L)}</Text>
          </Box>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.aquaTint }}>
            <Text w={800} fontSize={24} color="white" align="center">{t.initials}</Text>
          </View>
        </Box>
        <Section title={t.account}>
          <MenuRow icon="directions_car" label={t.my_cars} value={tr('n_cars', { n: cars.length })} onPress={() => nav.navigate('Cars')} />
          <MenuRow icon="lock" label={t.change_pw} onPress={() => nav.navigate('ChangePw')} />
          <MenuRow icon="smartphone" label={t.change_phone} onPress={() => nav.navigate('ChangePhone')} />
        </Section>
        <Section title={t.settings}>
          <MenuRow icon="translate" label={t.language} value={t.lang_name} onPress={() => nav.navigate('Language')} />
          <MenuRow icon="dark_mode" label={t.appearance} value={t[`theme_${appearance}`]} onPress={() => nav.navigate('Appearance')} />
          <MenuRow icon="notifications" label={t.notifications} onPress={() => nav.navigate('Notif')} />
        </Section>
        <Section title={t.support}>
          <MenuRow icon="help" label={t.help} onPress={() => nav.navigate('Help')} />
          <MenuRow icon="description" label={t.terms} onPress={() => nav.navigate('Terms')} />
          <MenuRow icon="logout" label={t.logout} danger chevron={false} onPress={() => setLogoutOpen(true)} />
        </Section>
        <Text fontSize={12} color="grey450" align="center">Raghwa · v1.0</Text>
      </ScrollView>

      <Dialog visible={logoutOpen} onClose={() => setLogoutOpen(false)}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.negativeTint, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="logout" size={26} color="negativeInk" />
        </View>
        <Text w={800} fontSize={22}>{t.logout_t}</Text>
        <Text fontSize={15} color="grey600" lh={1.5}>{t.logout_s}</Text>
        <Box flexDirection="row" gap="s" style={{ marginTop: 8 }}>
          <Button label={t.stay} variant="secondary" height={52} fontSize={16} flex={1} px={8} onPress={() => setLogoutOpen(false)} />
          <Button label={t.logout} variant="destructive" height={52} fontSize={16} flex={1} px={8}
            onPress={() => { setLogoutOpen(false); logout(); nav.reset({ index: 0, routes: [{ name: 'Login' }] }) }} />
        </Box>
      </Dialog>
    </View>
  )
}

const THEMES: [Appearance, string][] = [['system', 'brightness_auto'], ['light', 'light_mode'], ['dark', 'dark_mode']]

export function CarsScreen({ navigation }: ScreenProps<'Cars'>) {
  const { t } = useT()
  const cars = useStore((s) => s.cars)
  return (
    <Screen back>
      <Body px={16} gap={12} pt={8}>
        <Text w={800} fontSize={30} style={{ marginBottom: 8 }}>{t.my_cars}</Text>
        {cars.map((c) => (
          <Pressable key={c.id} onPress={() => navigation.navigate('CarForm', { id: c.id })}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.grey150, backgroundColor: pressed ? colors.grey50 : colors.bg })}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.grey100, alignItems: 'center', justifyContent: 'center' }}><Icon name="directions_car" size={26} /></View>
            <Box flex={1} minWidth={0} gap="s">
              <Box flexDirection="row" alignItems="center" gap="s">
                <Text w={700} fontSize={16}>{c.b + ' ' + c.m}</Text>
                {c.def && <Box backgroundColor="aquaTint" borderRadius="pill" style={{ paddingHorizontal: 8, paddingVertical: 2 }}><Text w={700} fontSize={11} color="aquaInk">{t.default_car}</Text></Box>}
              </Box>
              <Plate ps={c.ps} pn={c.pn} />
            </Box>
            <Icon name="edit" size={22} color="grey400" />
          </Pressable>
        ))}
        <Pressable onPress={() => navigation.navigate('CarForm')}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 56, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.grey400 }}>
          <Icon name="add" size={22} />
          <Text w={700} fontSize={16}>{t.add_car}</Text>
        </Pressable>
      </Body>
    </Screen>
  )
}

/** Add / edit a car; the plate is typed on a black Tunisian plate (series · تونس · number). */
export function CarFormScreen({ navigation, route }: ScreenProps<'CarForm'>) {
  const { t } = useT()
  const id = route.params?.id
  const car = useStore((s) => s.cars.find((c) => c.id === id))
  const saveCar = useStore((s) => s.saveCar), deleteCar = useStore((s) => s.deleteCar)
  const { f, err, set, setErr } = useForm({ brand: car?.b ?? '', model: car?.m ?? '', ps: car?.ps ?? '', pn: car?.pn ?? '' })
  const plateErr = !!(err.ps || err.pn)
  const save = () => {
    const e: typeof err = {}
    if (!f.brand.trim()) e.brand = 'e_req'
    if (!f.model.trim()) e.model = 'e_req'
    if (!f.ps || !f.pn) e.ps = 'e_plate'
    setErr(e)
    if (Object.keys(e).length) return
    saveCar(id ?? null, { b: f.brand.trim(), m: f.model.trim(), ps: f.ps, pn: f.pn })
    toast('car_saved')
    navigation.goBack()
  }
  const plateInput = (k: 'ps' | 'pn', ph: string, max: number, flex: number) => (
    <TextInput value={f[k]} onChangeText={(v) => set(k, digits(v).slice(0, max))} keyboardType="number-pad" placeholder={ph} placeholderTextColor="#6B6B6B"
      style={{ flex, minWidth: 0, height: '100%', color: '#fff', textAlign: 'center', fontSize: 24, fontFamily: 'Inter_800ExtraBold' }} />
  )
  return (
    <Screen back>
      <Body gap={20} pt={8}>
        <Text w={800} fontSize={30}>{id ? t.edit_car : t.add_car_t}</Text>
        <Field label={t.brand} error={err.brand && t[err.brand]}>
          <Input value={f.brand} onChangeText={(v) => set('brand', v)} placeholder={t.brand_ph} error={!!err.brand} />
        </Field>
        <Field label={t.model} error={err.model && t[err.model]}>
          <Input value={f.model} onChangeText={(v) => set('model', v)} placeholder={t.model_ph} error={!!err.model} />
        </Field>
        <Box gap="s">
          <Text w={600} fontSize={14}>{t.plate}</Text>
          <View style={{ direction: 'rtl', flexDirection: 'row', alignItems: 'center', height: 64, borderRadius: 10, backgroundColor: colors.plate, paddingHorizontal: 6,
            borderWidth: 2, borderColor: plateErr ? colors.negative : colors.plate }}>
            {plateInput('ps', '215', 3, 1)}
            <Text w={700} fontSize={20} color="white" style={{ fontFamily: 'Cairo_700Bold', paddingHorizontal: 8 }}>تونس</Text>
            {plateInput('pn', '4521', 4, 1.3)}
          </View>
          <Text fontSize={13} color="grey600">{t.plate_hint}</Text>
          <FieldError>{plateErr ? t.e_plate : null}</FieldError>
        </Box>
        {id && (
          <Pressable onPress={() => { deleteCar(id); toast('car_deleted'); navigation.goBack() }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 8 }}>
            <Icon name="delete" size={20} color="negativeInk" />
            <Text w={700} fontSize={15} color="negativeInk">{t.delete_car}</Text>
          </Pressable>
        )}
      </Body>
      <Footer><Button label={t.save} onPress={save} /></Footer>
    </Screen>
  )
}

export function LanguageScreen() {
  const { t } = useT()
  return (
    <Screen back>
      <Box gap="sm" style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <Text w={800} fontSize={30} style={{ marginBottom: 8 }}>{t.language}</Text>
        <LangOptions onPick={() => toast('lang_saved')} />
      </Box>
    </Screen>
  )
}

/** System / light / dark picker, laid out like the language screen. */
export function AppearanceScreen() {
  const { t } = useT()
  const appearance = useStore((s) => s.appearance), setAppearance = useStore((s) => s.setAppearance)
  return (
    <Screen back>
      <Box gap="sm" style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <Text w={800} fontSize={30} style={{ marginBottom: 8 }}>{t.appearance}</Text>
        {THEMES.map(([k, icon]) => {
          const sel = appearance === k
          return (
            <Pressable key={k} accessibilityRole="radio" accessibilityState={{ checked: sel }}
              // Applying a theme remounts the app in the new palette; navigation state keeps us on this screen.
              onPress={() => { if (sel) return; setAppearance(k); toast('theme_saved') }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 76, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, borderWidth: 2,
                borderColor: sel ? colors.primary : colors.grey200, backgroundColor: sel ? colors.primaryTint : colors.bg }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.grey200, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={icon} size={22} />
              </View>
              <Box flex={1} gap="xxs">
                <Text w={700} fontSize={18}>{t[`theme_${k}`]}</Text>
                {k === 'system' ? <Text fontSize={13} color="grey600">{t.theme_system_s}</Text> : null}
              </Box>
              <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: sel ? colors.primary : colors.grey400, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: sel ? colors.primary : 'transparent' }} />
              </View>
            </Pressable>
          )
        })}
      </Box>
    </Screen>
  )
}

export function NotifScreen() {
  const { t } = useT()
  const notif = useStore((s) => s.notif), toggle = useStore((s) => s.toggleNotif)
  const rows: ['h1' | 'd1', string, string][] = [['h1', t.remind_1h, t.remind_1h_s], ['d1', t.remind_1d, t.remind_1d_s]]
  return (
    <Screen back>
      <Box gap="s" style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <Text w={800} fontSize={30}>{t.notifications}</Text>
        <Text fontSize={15} color="grey600" lh={1.5} style={{ marginBottom: 12 }}>{t.notif_s}</Text>
        <Text w={700} fontSize={13} color="grey600">{t.booking_rem}</Text>
        {rows.map(([k, label, sub]) => (
          <Box key={k} flexDirection="row" alignItems="center" gap="sm" style={{ minHeight: 72, borderBottomWidth: 1, borderBottomColor: colors.grey100 }}>
            <Box flex={1}>
              <Text w={700} fontSize={16}>{label}</Text>
              <Text fontSize={13} color="grey600" style={{ marginTop: 2 }}>{sub}</Text>
            </Box>
            <Toggle value={notif[k]} onChange={() => toggle(k)} label={label} />
          </Box>
        ))}
      </Box>
    </Screen>
  )
}

export function ChangePwScreen({ navigation }: ScreenProps<'ChangePw'>) {
  const { t } = useT()
  const { f, err, set, setErr } = useForm({ cpw: '', npw: '', npw2: '' })
  const [show, setShow] = useState(false)
  const save = () => {
    const e = validate(f, [['cpw', 'pwreq'], ['npw', 'pw'], ['npw2', { match: 'npw' }]])
    setErr(e)
    if (Object.keys(e).length) return
    toast('pw_changed')
    navigation.goBack()
  }
  return (
    <Screen back>
      <Body gap={20} pt={8}>
        <Text w={800} fontSize={30}>{t.change_pw}</Text>
        <Field label={t.current_pw} error={err.cpw && t[err.cpw]}>
          <PasswordInput value={f.cpw} onChangeText={(v) => set('cpw', v)} error={!!err.cpw} show={show} onToggle={() => setShow(!show)} />
        </Field>
        <Field label={t.new_pw} error={err.npw && t[err.npw]}>
          <Input value={f.npw} onChangeText={(v) => set('npw', v)} placeholder={t.pw_ph} error={!!err.npw} secureTextEntry={!show} latin autoCapitalize="none" />
        </Field>
        <Field label={t.confirm_pw} error={err.npw2 && t[err.npw2]}>
          <Input value={f.npw2} onChangeText={(v) => set('npw2', v)} placeholder={t.pw_ph} error={!!err.npw2} secureTextEntry={!show} latin autoCapitalize="none" />
        </Field>
      </Body>
      <Footer><Button label={t.save} onPress={save} /></Footer>
    </Screen>
  )
}

export function ChangePhoneScreen({ navigation }: ScreenProps<'ChangePhone'>) {
  const { t } = useT()
  const { f, err, set, setErr } = useForm({ phone: '' })
  const send = () => {
    const e = validate(f, [['phone', 'phone']])
    setErr(e)
    if (!Object.keys(e).length) navigation.navigate('Otp', { ctx: 'phone', phone: f.phone })
  }
  return (
    <Screen back>
      <Box flex={1} gap="ml" style={{ paddingHorizontal: 24, paddingTop: 8 }}>
        <Box>
          <Text w={800} fontSize={30}>{t.change_phone}</Text>
          <Text fontSize={15} color="grey600" lh={1.5} style={{ marginTop: 8 }}>{t.phone_s}</Text>
        </Box>
        <Field label={t.new_phone} error={err.phone && t[err.phone]}>
          <PhoneInput value={f.phone} onChangeText={(v) => set('phone', fmtPhone(v))} error={!!err.phone} />
        </Field>
      </Box>
      <Footer><Button label={t.send_code} onPress={send} /></Footer>
    </Screen>
  )
}

export function HelpScreen() {
  const { t, L } = useT()
  const rows: [string, string, string][] = [['call', t.call_us, iso('+216 70 100 200', L)], ['chat', t.whatsapp, iso('+216 22 100 200', L)], ['mail', t.email, 'aide@raghwa.tn']]
  return (
    <Screen back>
      <Body px={16} gap={20} pt={8}>
        <Text w={800} fontSize={30}>{t.help}</Text>
        <Box>
          <Text w={700} fontSize={13} color="grey600" style={{ paddingBottom: 4 }}>{t.contact}</Text>
          {rows.map(([icon, label, value]) => <MenuRow key={icon} icon={icon} label={label} sub={value} onPress={() => toast('calling')} />)}
        </Box>
        <Box gap="s">
          <Text w={700} fontSize={13} color="grey600">{t.faq}</Text>
          {([[t.q1, t.a1], [t.q2, t.a2], [t.q3, t.a3]] as const).map(([q, a]) => (
            <Box key={q} padding="m" borderRadius="card" backgroundColor="grey50" gap="xs">
              <Text w={700} fontSize={16}>{q}</Text>
              <Text fontSize={14} color="grey700" lh={1.55}>{a}</Text>
            </Box>
          ))}
        </Box>
      </Body>
    </Screen>
  )
}

export function TermsScreen() {
  const { t } = useT()
  const p = (s: string) => <Text fontSize={15} lh={1.65} style={{ color: colors.grey700 }}>{s}</Text>
  const h = (s: string) => <Text w={800} fontSize={18} style={{ marginTop: 8 }}>{s}</Text>
  return (
    <Screen back>
      <Body gap={14} pt={8}>
        <Text w={800} fontSize={30} lh={1.3}>{t.terms}</Text>
        <Text fontSize={13} color="grey500">{t.updated}</Text>
        {p(t.terms_1)}
        {h(t.terms_h1)}{p(t.terms_2)}
        {h(t.terms_h2)}{p(t.terms_3)}
        {h(t.terms_h3)}{p(t.terms_4)}
      </Body>
    </Screen>
  )
}
