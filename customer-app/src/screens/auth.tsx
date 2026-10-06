import { useEffect, useRef, useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { colors } from '@/theme'
import { Box, Button, Field, FieldError, Input, LinkButton, PasswordInput, PhoneInput, Text } from '@/components/ui'
import { Body, Footer, Screen, Title } from '@/components/screen'
import { DEMO_OTP, USER_PHONE } from '@/data/mock'
import type { SKey } from '@/data/strings'
import { digits, fmtPhone } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { toast, useStore } from '@/store'
import type { ScreenProps } from '@/navigation/types'

type Rule = 'phone' | 'pwreq' | 'pw' | 'name' | { match: string }
/** Validation rules from the prototype; returns error string keys per field. */
export function validate(f: Record<string, string>, rules: [string, Rule][]) {
  const err: Record<string, SKey> = {}
  for (const [k, r] of rules) {
    const v = f[k] || ''
    if (r === 'phone') { const d = digits(v); if (!d) err[k] = 'e_phone_req'; else if (d.length !== 8) err[k] = 'e_phone_len' }
    if (r === 'name' && !v.trim()) err[k] = 'e_name_req'
    if (r === 'pwreq' && !v) err[k] = 'e_pw_req'
    if (r === 'pw') { if (!v) err[k] = 'e_pw_req'; else if (v.length < 8) err[k] = 'e_pw_len' }
    if (typeof r === 'object' && v !== f[r.match]) err[k] = 'e_pw_match'
  }
  return err
}

/** Small form-state helper: values, error keys, and a setter that clears the field's error. */
export function useForm<K extends string>(init: Record<K, string>) {
  const [f, setF] = useState(init)
  const [err, setErr] = useState<Partial<Record<K, SKey>>>({})
  const set = (k: K, v: string) => { setF((x) => ({ ...x, [k]: v })); setErr((e) => ({ ...e, [k]: undefined })) }
  return { f, err, set, setErr }
}

export function LoginScreen({ navigation }: ScreenProps<'Login'>) {
  const { t } = useT()
  const login = useStore((s) => s.login)
  const { f, err, set, setErr } = useForm({ phone: USER_PHONE, pw: '' })
  const [show, setShow] = useState(false)
  const submit = () => {
    const e = validate(f, [['phone', 'phone'], ['pw', 'pwreq']])
    setErr(e)
    if (Object.keys(e).length) return
    login()
    navigation.reset({ index: 0, routes: [{ name: 'Location' }] })
  }
  return (
    <Screen foam>
      <View style={{ height: 56 }} />
      <Body>
        <Title title={t.login_t} sub={t.login_s} />
        <Field label={t.phone} error={err.phone && t[err.phone]}>
          <PhoneInput value={f.phone} onChangeText={(v) => set('phone', fmtPhone(v))} error={!!err.phone} />
        </Field>
        <Field label={t.password} error={err.pw && t[err.pw]}>
          <PasswordInput value={f.pw} onChangeText={(v) => set('pw', v)} placeholder="••••••••" error={!!err.pw} show={show} onToggle={() => setShow(!show)}
            autoComplete="current-password" textContentType="password" onSubmitEditing={submit} />
        </Field>
        <Box alignSelf="flex-start"><LinkButton label={t.forgot_link} underline onPress={() => navigation.navigate('Forgot', { phone: f.phone })} /></Box>
      </Body>
      <Footer center>
        <Button label={t.login_btn} onPress={submit} style={{ alignSelf: 'stretch' }} />
        <Box flexDirection="row" alignItems="center" gap="xs">
          <Text fontSize={15} color="grey600">{t.no_account}</Text>
          <LinkButton label={t.signup_link} onPress={() => navigation.navigate('Signup')} />
        </Box>
      </Footer>
    </Screen>
  )
}

export function SignupScreen({ navigation }: ScreenProps<'Signup'>) {
  const { t } = useT()
  const { f, err, set, setErr } = useForm({ name: '', phone: '', pw: '', pw2: '' })
  const [show, setShow] = useState(false)
  const submit = () => {
    const e = validate(f, [['name', 'name'], ['phone', 'phone'], ['pw', 'pw'], ['pw2', { match: 'pw' }]])
    setErr(e)
    if (!Object.keys(e).length) navigation.navigate('Otp', { ctx: 'signup', phone: f.phone })
  }
  return (
    <Screen foam back>
      <Body gap={20}>
        <Title title={t.signup_t} sub={t.signup_s} />
        <Field label={t.fullname} error={err.name && t[err.name]}>
          <Input value={f.name} onChangeText={(v) => set('name', v)} placeholder={t.name_ph} error={!!err.name} autoComplete="name" />
        </Field>
        <Field label={t.phone} error={err.phone && t[err.phone]}>
          <PhoneInput value={f.phone} onChangeText={(v) => set('phone', fmtPhone(v))} error={!!err.phone} />
        </Field>
        <Field label={t.password} error={err.pw && t[err.pw]}>
          <PasswordInput value={f.pw} onChangeText={(v) => set('pw', v)} placeholder={t.pw_ph} error={!!err.pw} show={show} onToggle={() => setShow(!show)} autoComplete="new-password" />
        </Field>
        <Field label={t.confirm_pw} error={err.pw2 && t[err.pw2]}>
          <Input value={f.pw2} onChangeText={(v) => set('pw2', v)} placeholder={t.pw_ph} error={!!err.pw2} secureTextEntry={!show} latin autoCapitalize="none" />
        </Field>
      </Body>
      <Footer center>
        <Button label={t.signup_btn} onPress={submit} style={{ alignSelf: 'stretch' }} />
        <Box flexDirection="row" alignItems="center" gap="xs">
          <Text fontSize={15} color="grey600">{t.have_account}</Text>
          <LinkButton label={t.login_btn} onPress={() => navigation.navigate('Login')} />
        </Box>
      </Footer>
    </Screen>
  )
}

/** 4 boxes over a hidden input; the demo code is 1234 (any other code shows the error state). */
export function OtpScreen({ navigation, route }: ScreenProps<'Otp'>) {
  const { t, ar } = useT()
  const { ctx, phone } = route.params
  const login = useStore((s) => s.login), setPhone = useStore((s) => s.setPhone)
  const [code, setCode] = useState('')
  const [bad, setBad] = useState(false)
  const [timer, setTimer] = useState(45)
  const input = useRef<TextInput>(null)
  useEffect(() => {
    if (timer <= 0) return
    const id = setTimeout(() => setTimer((x) => x - 1), 1000)
    return () => clearTimeout(id)
  }, [timer])
  const ok = code.length === 4
  const verify = () => {
    if (!ok) return
    if (code !== DEMO_OTP) return setBad(true)
    if (ctx === 'signup') { login(); navigation.reset({ index: 0, routes: [{ name: 'Location' }] }) }
    else if (ctx === 'forgot') navigation.navigate('NewPass')
    else { setPhone(phone); toast('phone_changed'); navigation.navigate('Tabs', { screen: 'Profile' }) }
  }
  return (
    <Screen foam back>
      <Box flex={1} gap="l" style={{ paddingTop: 16, paddingHorizontal: 24 }}>
        <Box gap="s">
          <Text w={800} fontSize={32} lh={1.25}>{t.otp_t}</Text>
          <Text fontSize={16} color="grey600" lh={1.5}>
            {t.otp_s} <Text w={700} latin fontSize={16}>{(ar ? '⁦' : '') + '+216 ' + (phone || USER_PHONE) + (ar ? '⁩' : '')}</Text>
          </Text>
        </Box>
        <Pressable onPress={() => input.current?.focus()} accessibilityLabel={t.otp_t}>
          <View style={{ direction: 'ltr', flexDirection: 'row', gap: 12 }}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={{
                width: 64, height: 72, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center',
                backgroundColor: bad ? colors.negativeTint : colors.grey100,
                borderColor: bad ? colors.negative : i === Math.min(code.length, 3) ? colors.primary : 'transparent',
              }}>
                <Text latin w={700} fontSize={28} align="center">{code[i] ?? ''}</Text>
              </View>
            ))}
          </View>
          <TextInput ref={input} value={code} autoFocus keyboardType="number-pad" maxLength={4} autoComplete="one-time-code" textContentType="oneTimeCode"
            onChangeText={(v) => { setCode(digits(v).slice(0, 4)); setBad(false) }} onSubmitEditing={verify}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.01, color: 'transparent' }} caretHidden />
        </Pressable>
        {bad ? <View style={{ marginTop: -12 }}><FieldError>{t.e_otp}</FieldError></View> : null}
        <Box gap="s">
          {timer > 0 ? (
            <Text fontSize={15} color="grey600">{t.resend_in} <Text latin w={700} fontSize={15}>00:{String(timer).padStart(2, '0')}</Text></Text>
          ) : (
            <Box alignSelf="flex-start"><LinkButton label={t.resend} onPress={() => { setTimer(45); toast('code_sent') }} /></Box>
          )}
          <Box alignSelf="flex-start" backgroundColor="aquaTint" borderRadius="pill" style={{ paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text w={600} fontSize={13} color="aquaInk">{t.otp_hint}</Text>
          </Box>
        </Box>
      </Box>
      <Footer><Button label={t.verify} onPress={verify} disabled={!ok} /></Footer>
    </Screen>
  )
}

export function ForgotScreen({ navigation, route }: ScreenProps<'Forgot'>) {
  const { t } = useT()
  const { f, err, set, setErr } = useForm({ phone: route.params?.phone ?? '' })
  const submit = () => {
    const e = validate(f, [['phone', 'phone']])
    setErr(e)
    if (!Object.keys(e).length) navigation.navigate('Otp', { ctx: 'forgot', phone: f.phone })
  }
  return (
    <Screen foam back>
      <Body>
        <Title title={t.forgot_t} sub={t.forgot_s} />
        <Field label={t.phone} error={err.phone && t[err.phone]}>
          <PhoneInput value={f.phone} onChangeText={(v) => set('phone', fmtPhone(v))} error={!!err.phone} />
        </Field>
      </Body>
      <Footer><Button label={t.send_code} onPress={submit} /></Footer>
    </Screen>
  )
}

export function NewPassScreen({ navigation }: ScreenProps<'NewPass'>) {
  const { t } = useT()
  const { f, err, set, setErr } = useForm({ pw: '', pw2: '' })
  const [show, setShow] = useState(false)
  const submit = () => {
    const e = validate(f, [['pw', 'pw'], ['pw2', { match: 'pw' }]])
    setErr(e)
    if (Object.keys(e).length) return
    toast('pw_changed')
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] })
  }
  return (
    <Screen foam back>
      <Body gap={20}>
        <Title title={t.newpw_t} sub={t.newpw_s} />
        <Field label={t.new_pw} error={err.pw && t[err.pw]}>
          <PasswordInput value={f.pw} onChangeText={(v) => set('pw', v)} placeholder={t.pw_ph} error={!!err.pw} show={show} onToggle={() => setShow(!show)} />
        </Field>
        <Field label={t.confirm_pw} error={err.pw2 && t[err.pw2]}>
          <Input value={f.pw2} onChangeText={(v) => set('pw2', v)} placeholder={t.pw_ph} error={!!err.pw2} secureTextEntry={!show} latin autoCapitalize="none" />
        </Field>
      </Body>
      <Footer><Button label={t.save} onPress={submit} /></Footer>
    </Screen>
  )
}
