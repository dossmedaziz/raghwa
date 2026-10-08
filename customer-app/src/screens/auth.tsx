import { useEffect, useRef, useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { colors } from '@/theme'
import { Box, Button, Field, FieldError, Input, LinkButton, PhoneInput, Text } from '@/components/ui'
import { Body, Footer, Screen, Title } from '@/components/screen'
import type { SKey } from '@/data/strings'
import { api } from '@/lib/api'
import { errorCode, notifyError, retryAfter } from '@/lib/errors'
import { digits, fmtPhone } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { toast, useStore } from '@/store'
import type { ScreenProps } from '@/navigation/types'

const OTP_LENGTH = 4

type Rule = 'phone' | 'name'
/** Validation rules; returns error string keys per field. */
export function validate(f: Record<string, string>, rules: [string, Rule][]) {
  const err: Record<string, SKey> = {}
  for (const [k, r] of rules) {
    const v = f[k] || ''
    if (r === 'phone') { const d = digits(v); if (!d) err[k] = 'e_phone_req'; else if (d.length !== 8) err[k] = 'e_phone_len' }
    if (r === 'name' && v.trim().length < 2) err[k] = 'e_name_req'
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

/** Phone number → SMS code. The account is created on the first login. */
export function LoginScreen({ navigation }: ScreenProps<'Login'>) {
  const { t } = useT()
  const lastPhone = useStore((s) => s.customer?.phone)
  const { f, err, set, setErr } = useForm({ phone: fmtPhone(lastPhone ?? '') })
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    const e = validate(f, [['phone', 'phone']])
    setErr(e)
    if (Object.keys(e).length || busy) return
    setBusy(true)
    try {
      const sent = await api.auth.requestCode(digits(f.phone))
      navigation.navigate('Otp', { phone: f.phone, resendAfter: sent.resendAfterSeconds })
    } catch (x) {
      // A code was sent moments ago and is still valid: go and type it.
      if (errorCode(x) === 'OTP_COOLDOWN') navigation.navigate('Otp', { phone: f.phone, resendAfter: retryAfter(x) })
      else notifyError(x)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Screen foam>
      <View style={{ height: 56 }} />
      <Body>
        <Title title={t.login_t} sub={t.login_s} />
        <Field label={t.phone} error={err.phone && t[err.phone]}>
          <PhoneInput value={f.phone} onChangeText={(v) => set('phone', fmtPhone(v))} error={!!err.phone} />
        </Field>
      </Body>
      <Footer center>
        <Button label={t.send_code} onPress={submit} loading={busy} style={{ alignSelf: 'stretch' }} />
        <Text fontSize={14} color="grey600" align="center">{t.new_here}</Text>
      </Footer>
    </Screen>
  )
}

/** 4 boxes over a hidden input. */
export function OtpScreen({ navigation, route }: ScreenProps<'Otp'>) {
  const { t, ar } = useT()
  const { phone, resendAfter } = route.params
  const signIn = useStore((s) => s.signIn)
  const [code, setCode] = useState('')
  const [bad, setBad] = useState(false)
  const [busy, setBusy] = useState(false)
  const [timer, setTimer] = useState(resendAfter)
  const input = useRef<TextInput>(null)
  useEffect(() => {
    if (timer <= 0) return
    const id = setTimeout(() => setTimer((x) => x - 1), 1000)
    return () => clearTimeout(id)
  }, [timer])
  const ok = code.length === OTP_LENGTH
  const verify = async () => {
    if (!ok || busy) return
    setBusy(true)
    try {
      const s = await api.auth.verify(digits(phone), code)
      signIn(s.tokens, s.customer)
      navigation.reset({ index: 0, routes: [s.isNew ? { name: 'Name', params: { first: true } } : { name: 'Location' }] })
    } catch (x) {
      if (errorCode(x) === 'OTP_INVALID') setBad(true)
      else {
        notifyError(x)
        setCode('')
      }
    } finally {
      setBusy(false)
    }
  }
  const resend = async () => {
    try {
      setTimer((await api.auth.requestCode(digits(phone))).resendAfterSeconds)
      setCode('')
      setBad(false)
      toast('code_sent')
    } catch (x) {
      if (errorCode(x) === 'OTP_COOLDOWN') setTimer(retryAfter(x))
      else notifyError(x)
    }
  }
  const mmss = String(Math.floor(timer / 60)).padStart(2, '0') + ':' + String(timer % 60).padStart(2, '0')
  return (
    <Screen foam back>
      <Box flex={1} gap="l" style={{ paddingTop: 16, paddingHorizontal: 24 }}>
        <Box gap="s">
          <Text w={800} fontSize={32} lh={1.25}>{t.otp_t}</Text>
          <Text fontSize={16} color="grey600" lh={1.5}>
            {t.otp_s} <Text w={700} latin fontSize={16}>{(ar ? '⁦' : '') + '+216 ' + phone + (ar ? '⁩' : '')}</Text>
          </Text>
        </Box>
        <Pressable onPress={() => input.current?.focus()} accessibilityLabel={t.otp_t}>
          <View style={{ direction: 'ltr', flexDirection: 'row', gap: 12 }}>
            {Array.from({ length: OTP_LENGTH }, (_, i) => (
              <View key={i} style={{
                width: 64, height: 72, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center',
                backgroundColor: bad ? colors.negativeTint : colors.grey100,
                borderColor: bad ? colors.negative : i === Math.min(code.length, OTP_LENGTH - 1) ? colors.primary : 'transparent',
              }}>
                <Text latin w={700} fontSize={28} align="center">{code[i] ?? ''}</Text>
              </View>
            ))}
          </View>
          <TextInput ref={input} value={code} autoFocus keyboardType="number-pad" maxLength={OTP_LENGTH} autoComplete="one-time-code" textContentType="oneTimeCode"
            onChangeText={(v) => { setCode(digits(v).slice(0, OTP_LENGTH)); setBad(false) }} onSubmitEditing={verify}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.01, color: 'transparent' }} caretHidden />
        </Pressable>
        {bad ? <View style={{ marginTop: -12 }}><FieldError>{t.e_OTP_INVALID}</FieldError></View> : null}
        <Box gap="s">
          {timer > 0 ? (
            <Text fontSize={15} color="grey600">{t.resend_in} <Text latin w={700} fontSize={15}>{mmss}</Text></Text>
          ) : (
            <Box alignSelf="flex-start"><LinkButton label={t.resend} onPress={resend} /></Box>
          )}
        </Box>
      </Box>
      <Footer><Button label={t.verify} onPress={verify} loading={busy} disabled={!ok} /></Footer>
    </Screen>
  )
}

/** Name step: required after the first login, editable later from the profile. */
export function NameScreen({ navigation, route }: ScreenProps<'Name'>) {
  const { t } = useT()
  const first = !!route.params?.first
  const name = useStore((s) => s.customer?.name), setCustomer = useStore((s) => s.setCustomer)
  const { f, err, set, setErr } = useForm({ name: name ?? '' })
  const [busy, setBusy] = useState(false)
  const save = async () => {
    const e = validate(f, [['name', 'name']])
    setErr(e)
    if (Object.keys(e).length || busy) return
    setBusy(true)
    try {
      setCustomer(await api.me.update(f.name.trim()))
      if (first) navigation.reset({ index: 0, routes: [{ name: 'Location' }] })
      else {
        toast('name_saved')
        navigation.goBack()
      }
    } catch (x) {
      notifyError(x)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Screen foam back={!first}>
      {first && <View style={{ height: 56 }} />}
      <Body>
        <Title title={t.name_t} sub={t.name_s} />
        <Field label={t.fullname} error={err.name && t[err.name]}>
          <Input value={f.name} onChangeText={(v) => set('name', v)} placeholder={t.name_ph} error={!!err.name} autoComplete="name" autoFocus
            maxLength={100} onSubmitEditing={save} />
        </Field>
      </Body>
      <Footer><Button label={first ? t.continue : t.save} onPress={save} loading={busy} /></Footer>
    </Screen>
  )
}
