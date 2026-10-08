import { useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Field, Icon, IconTile, PhoneInput } from '@/components/common'
import { OtpField, useOtp } from '@/components/otp'
import { cn } from '@/lib/utils'
import { digits, phone, phoneLocal } from '@/lib/format'
import { notify, useT } from '@/lib/i18n'
import { ownerApi } from '@/lib/api'
import { errorCode, errorText, notifyError } from '@/lib/errors'
import type { OwnerDto } from '@/lib/types'
import { PREF_FIELDS, useStore, type PrefKey } from '@/store'
import type { TKey } from '@/data/i18n-strings'
import { Page } from '@/layouts/app-layout'

type Errors = Record<string, string | undefined>

export function SettingsPage() {
  const { t, ar } = useT()
  const owner = useStore((s) => s.owner), setOwner = useStore((s) => s.setOwner)
  const setLang = useStore((s) => s.setLang)
  const togglePref = useStore((s) => s.togglePref)
  const [pw, setPw] = useState({ cur: '', next: '', next2: '' })
  const [newPhone, setNewPhone] = useState('')
  const [err, setErr] = useState<Errors>({})
  const [otpOpen, setOtpOpen] = useState(false)
  const [busy, setBusy] = useState<'password' | 'phone' | null>(null)

  const savePassword = async () => {
    const e: Errors = {
      cur: !pw.cur ? t.errPassword : undefined,
      next: pw.next.length < 8 ? t.errPwShort : undefined,
      next2: !pw.next2 || pw.next2 !== pw.next ? t.errPwMatch : undefined,
    }
    setErr(e)
    if (Object.values(e).some(Boolean)) return
    setBusy('password')
    try {
      await ownerApi.me.changePassword(pw.cur, pw.next)
      setPw({ cur: '', next: '', next2: '' })
      notify('toastPwChanged')
    } catch (error) {
      if (errorCode(error) === 'WRONG_PASSWORD') setErr({ cur: errorText(error, t) })
      else notifyError(error)
    } finally {
      setBusy(null)
    }
  }
  const sendPhoneOtp = async () => {
    if (digits(newPhone).length !== 8) return setErr({ phone: t.errPhone })
    setBusy('phone')
    try {
      await ownerApi.me.requestPhoneChange(digits(newPhone))
      setOtpOpen(true)
    } catch (error) {
      const code = errorCode(error)
      if (code === 'OTP_COOLDOWN') setOtpOpen(true) // a code was sent moments ago: still valid
      else if (code === 'PHONE_TAKEN' || code === 'SAME_PHONE') setErr({ phone: errorText(error, t) })
      else notifyError(error)
    } finally {
      setBusy(null)
    }
  }
  const phoneChanged = (o: OwnerDto) => {
    setOwner(o)
    setNewPhone('')
    setOtpOpen(false)
    notify('toastPhoneChanged')
  }
  const pwField = (k: keyof typeof pw, id: string, label: string, autoComplete: string) => (
    <Field id={id} label={label} error={err[k]}>
      <Input id={id} type="password" autoComplete={autoComplete} value={pw[k]} aria-invalid={!!err[k] || undefined}
        onChange={(e) => { setPw({ ...pw, [k]: e.target.value }); setErr({ ...err, [k]: undefined }) }} />
    </Field>
  )

  return (
    <Page title={t.navSettings} sub={t.settingsSub} loading={!owner}>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))] items-start gap-4">
        <Section icon="lock" title={t.secPassword}>
          {pwField('cur', 'st-cur', t.currentPw, 'current-password')}
          {pwField('next', 'st-new', t.newPw, 'new-password')}
          {pwField('next2', 'st-new2', t.confirmPw, 'new-password')}
          <div className="flex justify-end">
            <Button onClick={() => void savePassword()} disabled={busy === 'password'} className="h-10 text-sm">{t.savePw}</Button>
          </div>
        </Section>

        <Section icon="smartphone" title={t.secPhone}>
          <div className="flex items-center justify-between rounded-xl bg-muted px-3.5 py-3">
            <span className="text-[13px] text-muted-foreground">{t.currentPhone}</span>
            <span dir="ltr" className="font-latin font-bold">{owner ? phone(owner.phone) : ''}</span>
          </div>
          <Field id="st-ph" label={t.newPhone} error={err.phone}>
            <PhoneInput id="st-ph" value={newPhone} invalid={!!err.phone} onChange={(v) => { setNewPhone(phoneLocal(v)); setErr({}) }} />
          </Field>
          <OtpFooter onSend={() => void sendPhoneOtp()} busy={busy === 'phone'} />
        </Section>

        <Section icon="translate" title={t.secLang}>
          <span className="-mt-1.5 text-[13px] text-muted-foreground">{t.langHint}</span>
          <div role="radiogroup" className="grid grid-cols-2 gap-2.5">
            <LangOption on={ar} onClick={() => setLang('ar')} label="عربي (تونسي)" sub="RTL" className="font-arabic" />
            <LangOption on={!ar} onClick={() => setLang('fr')} label="Français" sub="LTR" className="font-latin" />
          </div>
        </Section>

        <Section icon="notifications" title={t.secNotif} gap="gap-1.5">
          {(['n1', 'n2', 'n3', 'n4'] as PrefKey[]).map((k) => (
            <div key={k} className="flex items-center gap-3 border-b border-line-soft py-2.5 last:border-b-0">
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="font-semibold">{t[k as TKey]}</span>
                <span className="text-[12.5px] text-muted-foreground">{t[(k + 'd') as TKey]}</span>
              </div>
              <Switch checked={!!owner?.notifications[PREF_FIELDS[k]]} aria-label={t[k as TKey]}
                onCheckedChange={() => togglePref(k).then(() => notify('toastSaved'), notifyError)} />
            </div>
          ))}
        </Section>
      </div>

      <OtpDialog open={otpOpen} phoneDigits={digits(newPhone)} onClose={() => setOtpOpen(false)} onVerified={phoneChanged} />
    </Page>
  )
}

function Section({ icon, title, children, gap = 'gap-3.5' }: { icon: string; title: string; children: ReactNode; gap?: string }) {
  return (
    <Card className={cn('px-[22px]', gap)}>
      <div className={cn('flex items-center gap-2.5', gap === 'gap-1.5' && 'mb-1.5')}>
        <IconTile name={icon} className="bg-sky text-primary" />
        <span className="text-base font-bold">{title}</span>
      </div>
      {children}
    </Card>
  )
}

function OtpFooter({ onSend, busy }: { onSend: () => void; busy?: boolean }) {
  const { t } = useT()
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground"><Icon name="sms" size={16} />{t.otpNeeded}</span>
      <Button onClick={onSend} disabled={busy} className="h-10 text-sm">{t.sendOtp}</Button>
    </div>
  )
}

function LangOption({ on, onClick, label, sub, className }: { on: boolean; onClick: () => void; label: string; sub: string; className?: string }) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onClick}
      className={cn('flex items-center gap-2.5 rounded-[14px] border-[1.5px] p-3.5 text-start', on ? 'border-primary bg-[#F2F7FD]' : 'border-input bg-white')}>
      <span className={cn('flex size-[18px] items-center justify-center rounded-full border-2', on ? 'border-primary' : 'border-[#B9C6D8]')}>
        <span className={cn('size-2 rounded-full', on ? 'bg-primary' : 'bg-transparent')} />
      </span>
      <span className="flex flex-col leading-snug">
        <span className={cn('font-bold', className)}>{label}</span>
        <span className="font-latin text-xs text-muted-foreground">{sub}</span>
      </span>
    </button>
  )
}

/** Code sent to the new phone number; confirming it switches the account to that number. */
function OtpDialog({ open, phoneDigits, onClose, onVerified }: { open: boolean; phoneDigits: string; onClose: () => void; onVerified: (o: OwnerDto) => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      {/* Remount the body each time so the code and timer start fresh. */}
      {open && <OtpDialogBody key={phoneDigits} phoneDigits={phoneDigits} onClose={onClose} onVerified={onVerified} />}
    </Dialog>
  )
}

function OtpDialogBody({ phoneDigits, onClose, onVerified }: { phoneDigits: string; onClose: () => void; onVerified: (o: OwnerDto) => void }) {
  const { t } = useT()
  const otp = useOtp(async () => { await ownerApi.me.requestPhoneChange(phoneDigits) })
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!otp.validate()) return
    setBusy(true)
    try {
      onVerified(await ownerApi.me.confirmPhoneChange(phoneDigits, otp.code))
    } catch (error) {
      if (errorCode(error).startsWith('OTP_')) otp.fail(errorText(error, t))
      else notifyError(error)
    } finally {
      setBusy(false)
    }
  }
  return (
    <DialogContent showCloseButton={false} className="rounded-[20px] p-6 shadow-modal sm:max-w-[420px]">
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <span className="flex size-12 items-center justify-center rounded-[14px] bg-teal-soft text-teal"><Icon name="sms" size={26} /></span>
          <Button type="button" variant="secondary" size="icon" onClick={onClose} aria-label={t.close}><Icon name="close" /></Button>
        </div>
        <div className="flex flex-col gap-1">
          <DialogTitle className="text-lg font-bold">{t.otpModalTitle}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t.otpSent} <span dir="ltr" className="font-latin font-bold whitespace-nowrap text-foreground">{phone(phoneDigits)}</span>
          </DialogDescription>
        </div>
        <OtpField otp={otp} large={false} />
        <Button type="submit" size="lg" disabled={busy} className="text-[15px]">{t.verify}</Button>
        {import.meta.env.DEV && <span className="text-center text-xs text-muted-foreground">{t.otpDemo}</span>}
      </form>
    </DialogContent>
  )
}
