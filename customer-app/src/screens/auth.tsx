import { useState } from 'react'
import { View } from 'react-native'
import { Box, Button, Field, Input, LinkButton, PasswordInput, PhoneInput, Text } from '@/components/ui'
import { Body, Footer, Screen, Title } from '@/components/screen'
import type { SKey } from '@/data/strings'
import { api } from '@/lib/api'
import { errorCode, notifyError } from '@/lib/errors'
import { digits, fmtPhone } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { toast, useStore } from '@/store'
import type { ScreenProps } from '@/navigation/types'

type Rule = 'phone' | 'name' | 'pwreq' | 'pw' | { match: string }
/** Validation rules; returns error string keys per field. */
export function validate(f: Record<string, string>, rules: [string, Rule][]) {
  const err: Record<string, SKey> = {}
  for (const [k, r] of rules) {
    const v = f[k] || ''
    if (r === 'phone') { const d = digits(v); if (!d) err[k] = 'e_phone_req'; else if (d.length !== 8) err[k] = 'e_phone_len' }
    if (r === 'name' && v.trim().length < 2) err[k] = 'e_name_req'
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

/** After login or sign-up: ask for the location permission, then the map. */
const enter = (navigation: ScreenProps<'Login'>['navigation'] | ScreenProps<'Signup'>['navigation']) =>
  navigation.reset({ index: 0, routes: [{ name: 'Location' }] })

export function LoginScreen({ navigation }: ScreenProps<'Login'>) {
  const { t } = useT()
  const lastPhone = useStore((s) => s.customer?.phone), signIn = useStore((s) => s.signIn)
  const { f, err, set, setErr } = useForm({ phone: fmtPhone(lastPhone ?? ''), pw: '' })
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    const e = validate(f, [['phone', 'phone'], ['pw', 'pwreq']])
    setErr(e)
    if (Object.keys(e).length || busy) return
    setBusy(true)
    try {
      const s = await api.auth.login(digits(f.phone), f.pw)
      signIn(s.tokens, s.customer)
      enter(navigation)
    } catch (x) {
      notifyError(x)
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
        <Field label={t.password} error={err.pw && t[err.pw]}>
          <PasswordInput value={f.pw} onChangeText={(v) => set('pw', v)} placeholder="••••••••" error={!!err.pw} show={show} onToggle={() => setShow(!show)}
            autoComplete="current-password" textContentType="password" onSubmitEditing={submit} />
        </Field>
      </Body>
      <Footer center>
        <Button label={t.login_btn} onPress={submit} loading={busy} style={{ alignSelf: 'stretch' }} />
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
  const signIn = useStore((s) => s.signIn)
  const { f, err, set, setErr } = useForm({ name: '', phone: '', pw: '', pw2: '' })
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    const e = validate(f, [['name', 'name'], ['phone', 'phone'], ['pw', 'pw'], ['pw2', { match: 'pw' }]])
    setErr(e)
    if (Object.keys(e).length || busy) return
    setBusy(true)
    try {
      const s = await api.auth.register(f.name.trim(), digits(f.phone), f.pw)
      signIn(s.tokens, s.customer)
      enter(navigation)
    } catch (x) {
      if (errorCode(x) === 'PHONE_TAKEN') setErr({ phone: 'e_PHONE_TAKEN' })
      else notifyError(x)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Screen foam back>
      <Body gap={20}>
        <Title title={t.signup_t} sub={t.signup_s} />
        <Field label={t.fullname} error={err.name && t[err.name]}>
          <Input value={f.name} onChangeText={(v) => set('name', v)} placeholder={t.name_ph} error={!!err.name} autoComplete="name" maxLength={100} />
        </Field>
        <Field label={t.phone} error={err.phone && t[err.phone]}>
          <PhoneInput value={f.phone} onChangeText={(v) => set('phone', fmtPhone(v))} error={!!err.phone} />
        </Field>
        <Field label={t.password} error={err.pw && t[err.pw]}>
          <PasswordInput value={f.pw} onChangeText={(v) => set('pw', v)} placeholder={t.pw_ph} error={!!err.pw} show={show} onToggle={() => setShow(!show)}
            autoComplete="new-password" maxLength={72} />
        </Field>
        <Field label={t.confirm_pw} error={err.pw2 && t[err.pw2]}>
          <Input value={f.pw2} onChangeText={(v) => set('pw2', v)} placeholder={t.pw_ph} error={!!err.pw2} secureTextEntry={!show} latin autoCapitalize="none"
            maxLength={72} onSubmitEditing={submit} />
        </Field>
      </Body>
      <Footer center>
        <Button label={t.signup_btn} onPress={submit} loading={busy} style={{ alignSelf: 'stretch' }} />
        <Box flexDirection="row" alignItems="center" gap="xs">
          <Text fontSize={15} color="grey600">{t.have_account}</Text>
          <LinkButton label={t.login_btn} onPress={() => navigation.navigate('Login')} />
        </Box>
      </Footer>
    </Screen>
  )
}

/** Edit the name (from the profile). */
export function NameScreen({ navigation }: ScreenProps<'Name'>) {
  const { t } = useT()
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
      toast('name_saved')
      navigation.goBack()
    } catch (x) {
      notifyError(x)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Screen foam back>
      <Body>
        <Title title={t.name_t} sub={t.name_s} />
        <Field label={t.fullname} error={err.name && t[err.name]}>
          <Input value={f.name} onChangeText={(v) => set('name', v)} placeholder={t.name_ph} error={!!err.name} autoComplete="name" autoFocus
            maxLength={100} onSubmitEditing={save} />
        </Field>
      </Body>
      <Footer><Button label={t.save} onPress={save} loading={busy} /></Footer>
    </Screen>
  )
}
