import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, Icon, LangSwitch, LogoMark, PasswordInput, PhoneInput } from '@/components/common'
import { OtpField, useOtp } from '@/components/otp'
import { digits, fx, phone, phoneLocal } from '@/lib/format'
import { ownerApi } from '@/lib/api'
import { errorCode, errorText, notifyError } from '@/lib/errors'
import { notify, useT } from '@/lib/i18n'
import { useStore } from '@/store'

/** Split screen: navy brand panel (wide screens) + form column. */
export function AuthLayout() {
  const { t } = useT()
  return (
    <div className="flex min-h-screen bg-white">
      <aside className="relative hidden max-w-[640px] flex-[0_0_44%] flex-col justify-between gap-10 overflow-hidden bg-navy px-14 py-12 text-white min-[980px]:flex">
        <Bubbles />
        <div className="relative flex items-center gap-3">
          <LogoMark size={42} tone="white" dot />
          <div className="flex flex-col leading-[1.1]">
            <span className="font-arabic text-2xl font-bold">رغوة</span>
            <span className="font-latin text-xs font-semibold tracking-[.14em] text-aqua-soft">RAGHWA</span>
          </div>
        </div>
        <div className="relative flex max-w-[440px] flex-col gap-4">
          <p className="text-[38px] leading-tight font-bold text-balance">{t.brandHeadline}</p>
          <p className="text-[17px] leading-relaxed text-pretty text-[#C9DBF5]">{t.brandSub}</p>
        </div>
        <p className="relative text-[13px] text-[#9FB8E0]">{t.brandFoot}</p>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col px-[clamp(20px,4vw,48px)] py-6">
        <div className="flex min-h-10 items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-[980px]:invisible">
            <LogoMark size={32} />
            <span className="text-xl font-bold text-navy">{t.appName}</span>
          </div>
          <LangSwitch />
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="flex w-full max-w-[400px] animate-rg-in flex-col gap-[26px]">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}

function Bubbles() {
  const glass = 'radial-gradient(circle at 35% 30%,rgba(255,255,255,.16),rgba(255,255,255,.02) 62%)'
  return (
    <>
      <span className="absolute -bottom-[150px] -end-[120px] size-[420px] rounded-full border border-white/12" style={{ background: glass }} />
      <span className="absolute top-[16%] end-[10%] size-[190px] rounded-full border border-[rgba(159,220,234,.25)]"
        style={{ background: 'radial-gradient(circle at 35% 30%,rgba(34,195,214,.32),rgba(34,195,214,.04) 65%)' }} />
      <span className="absolute bottom-[30%] start-[10%] size-[86px] rounded-full border border-white/18 bg-white/4" />
      <span className="absolute top-[42%] end-[42%] size-[38px] rounded-full border border-white/22" />
      <span className="absolute top-[12%] start-[42%] size-[18px] rounded-full bg-[rgba(159,220,234,.35)]" />
      <span className="absolute bottom-[22%] end-[46%] size-3 rounded-full bg-white/30" />
    </>
  )
}

function Heading({ title, sub, step, children }: { title: string; sub?: ReactNode; step?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {step && <span className="text-[13px] font-bold text-teal">{step}</span>}
      {children}
      <h1 className="text-[28px] leading-tight font-bold text-balance text-navy">{title}</h1>
      {sub && <p className="text-[15px] text-pretty text-muted-foreground">{sub}</p>}
    </div>
  )
}

function BackLink({ to, label }: { to: string; label: string }) {
  const { ic } = useT()
  return (
    <Link to={to} className="flex items-center gap-1.5 self-start py-1 font-semibold text-ink-2 hover:text-primary">
      <Icon name={ic.back} />{label}
    </Link>
  )
}

function Submit({ children, busy }: { children: ReactNode; busy?: boolean }) {
  return <Button type="submit" size="lg" disabled={busy} aria-busy={busy || undefined} className="mt-1 h-[50px] text-base">{children}</Button>
}

type Errors = Record<string, string | undefined>
const hasErrors = (e: Errors) => Object.values(e).some(Boolean)

/** Runs an async submit once at a time and exposes the pending state for the button. */
function useBusy() {
  const [busy, setBusy] = useState(false)
  const run = async (fn: () => Promise<void>) => {
    if (busy) return
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }
  return { busy, run }
}

/* ───────────── Login ───────────── */

// Development only: the account created by raghwa-api's seeder (`npm run seed`).
const DEV_LOGIN = import.meta.env.DEV ? { phone: '52 226 876', password: 'testtest' } : { phone: '', password: '' }

export function LoginPage() {
  const { t } = useT()
  const nav = useNavigate()
  const signIn = useStore((s) => s.signIn), startOtp = useStore((s) => s.startOtp)
  const prefill = (useLocation().state as { phone?: string } | null)?.phone
  const [ph, setPh] = useState(prefill ? phoneLocal(prefill) : DEV_LOGIN.phone)
  const [pw, setPw] = useState(prefill ? '' : DEV_LOGIN.password)
  const [show, setShow] = useState(false)
  const [err, setErr] = useState<Errors>({})
  const { busy, run } = useBusy()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const er: Errors = { phone: digits(ph).length !== 8 ? t.errPhone : undefined, pw: !pw ? t.errPassword : undefined }
    setErr(er)
    if (hasErrors(er)) return
    void run(async () => {
      try {
        signIn(await ownerApi.auth.login(digits(ph), pw))
        nav('/garages')
      } catch (error) {
        const code = errorCode(error)
        if (code === 'INVALID_CREDENTIALS') setErr({ pw: errorText(error, t) })
        else if (code === 'PHONE_NOT_VERIFIED') {
          // Sign-up never confirmed: send a fresh code and finish it.
          await ownerApi.auth.resendSignup(digits(ph)).catch(() => undefined)
          startOtp('signup', digits(ph))
          nav('/verify')
        } else notifyError(error)
      }
    })
  }
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-[30px] font-bold text-navy">{t.loginTitle}</h1>
        <p className="text-[15px] text-muted-foreground">{t.loginSub}</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-[18px]" noValidate>
        <Field id="l-phone" label={t.phone} error={err.phone}>
          <PhoneInput id="l-phone" autoComplete="tel" value={ph} invalid={!!err.phone} onChange={(v) => { setPh(phoneLocal(v)); setErr({ ...err, phone: undefined }) }} />
        </Field>
        <Field id="l-pw" label={t.password} error={err.pw}
          labelExtra={<Link to="/forgot" state={{ phone: ph }} className="text-[13px] font-semibold text-primary hover:text-teal hover:underline">{t.forgot}</Link>}>
          <PasswordInput id="l-pw" autoComplete="current-password" value={pw} invalid={!!err.pw} show={show} onToggle={() => setShow(!show)}
            onChange={(v) => { setPw(v); setErr({ ...err, pw: undefined }) }} />
        </Field>
        <Submit busy={busy}>{t.loginBtn}</Submit>
      </form>
      <p className="flex justify-center gap-1.5 text-muted-foreground">
        <span>{t.noAccount}</span>
        <Link to="/signup" className="font-semibold text-primary hover:text-teal hover:underline">{t.signupLink}</Link>
      </p>
    </>
  )
}

/* ───────────── Sign up ───────────── */

export function SignupPage() {
  const { t } = useT()
  const nav = useNavigate()
  const startOtp = useStore((s) => s.startOtp)
  const [f, setF] = useState({ name: '', phone: '', pw: '', pw2: '' })
  const [show, setShow] = useState(false)
  const [err, setErr] = useState<Errors>({})
  const { busy, run } = useBusy()
  const up = (k: keyof typeof f, v: string) => { setF({ ...f, [k]: k === 'phone' ? phoneLocal(v) : v }); setErr({ ...err, [k]: undefined }) }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const er: Errors = {
      name: f.name.trim().length < 3 ? t.errName : undefined,
      phone: digits(f.phone).length !== 8 ? t.errPhone : undefined,
      pw: f.pw.length < 8 ? t.errPwShort : undefined,
      pw2: !f.pw2 || f.pw2 !== f.pw ? t.errPwMatch : undefined,
    }
    setErr(er)
    if (hasErrors(er)) return
    void run(async () => {
      try {
        await ownerApi.auth.signup(f.name.trim(), digits(f.phone), f.pw)
      } catch (error) {
        const code = errorCode(error)
        if (code === 'PHONE_TAKEN') return setErr({ phone: errorText(error, t) })
        // A code was already sent a moment ago: it is still valid, go and type it.
        if (code !== 'OTP_COOLDOWN') return notifyError(error)
      }
      startOtp('signup', digits(f.phone))
      nav('/verify')
    })
  }
  return (
    <>
      <Heading title={t.signupTitle} sub={t.signupSub} />
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field id="s-name" label={t.fullName} error={err.name}>
          <Input id="s-name" autoComplete="name" placeholder={t.namePh} value={f.name} aria-invalid={!!err.name || undefined} onChange={(e) => up('name', e.target.value)} />
        </Field>
        <Field id="s-phone" label={t.phone} error={err.phone}>
          <PhoneInput id="s-phone" value={f.phone} invalid={!!err.phone} onChange={(v) => up('phone', v)} />
        </Field>
        <Field id="s-pw" label={t.password} error={err.pw} hint={t.pwHint}>
          <PasswordInput id="s-pw" autoComplete="new-password" value={f.pw} invalid={!!err.pw} show={show} onToggle={() => setShow(!show)} onChange={(v) => up('pw', v)} />
        </Field>
        <Field id="s-pw2" label={t.confirmPw} error={err.pw2}>
          <Input id="s-pw2" type={show ? 'text' : 'password'} autoComplete="new-password" value={f.pw2} aria-invalid={!!err.pw2 || undefined} onChange={(e) => up('pw2', e.target.value)} />
        </Field>
        <Submit busy={busy}>{t.signupBtn}</Submit>
      </form>
      <p className="flex justify-center gap-1.5 text-muted-foreground">
        <span>{t.haveAccount}</span>
        <Link to="/login" className="font-semibold text-primary hover:text-teal hover:underline">{t.loginLink}</Link>
      </p>
    </>
  )
}

/* ───────────── Forgot password (step 1/3) ───────────── */

export function ForgotPage() {
  const { t } = useT()
  const nav = useNavigate()
  const startOtp = useStore((s) => s.startOtp)
  const prefill = (useLocation().state as { phone?: string } | null)?.phone ?? ''
  const [ph, setPh] = useState(prefill)
  const [err, setErr] = useState<string>()
  const { busy, run } = useBusy()
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (digits(ph).length !== 8) return setErr(t.errPhone)
    void run(async () => {
      try {
        await ownerApi.auth.forgot(digits(ph))
      } catch (error) {
        if (errorCode(error) !== 'OTP_COOLDOWN') return notifyError(error)
      }
      startOtp('forgot', digits(ph))
      nav('/verify')
    })
  }
  return (
    <>
      <BackLink to="/login" label={t.backToLogin} />
      <Heading step={fx(t.stepOf, { a: 1, b: 3 })} title={t.forgotTitle} sub={t.forgotSub} />
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field id="f-phone" label={t.phone} error={err}>
          <PhoneInput id="f-phone" value={ph} invalid={!!err} onChange={(v) => { setPh(phoneLocal(v)); setErr(undefined) }} />
        </Field>
        <Submit busy={busy}>{t.sendCode}</Submit>
      </form>
    </>
  )
}

/* ───────────── OTP (sign-up, or forgot step 2/3) ───────────── */

export function VerifyPage() {
  const { t } = useT()
  const nav = useNavigate()
  const { purpose, phone: ph } = useStore((s) => s.otp)
  const signIn = useStore((s) => s.signIn), setResetToken = useStore((s) => s.setResetToken), createGarage = useStore((s) => s.createGarage)
  const isForgot = purpose === 'forgot'
  const otp = useOtp(async () => {
    if (isForgot) await ownerApi.auth.forgot(ph)
    else await ownerApi.auth.resendSignup(ph)
  })
  const { busy, run } = useBusy()

  // The phone lives in memory only: after a reload, start the flow again.
  if (!ph) return <Navigate to={isForgot ? '/forgot' : '/signup'} replace />

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!otp.validate()) return
    void run(async () => {
      try {
        if (isForgot) {
          setResetToken((await ownerApi.auth.verifyReset(ph, otp.code)).resetToken)
          nav('/reset-password')
          return
        }
        signIn(await ownerApi.auth.verifySignup(ph, otp.code))
        notify('toastVerified')
        // New owner: open onboarding on a fresh draft garage.
        await createGarage()
        nav('/onboarding')
      } catch (error) {
        const code = errorCode(error)
        if (code.startsWith('OTP_') || code === 'NO_PENDING_SIGNUP') otp.fail(errorText(error, t))
        else notifyError(error)
      }
    })
  }
  return (
    <>
      <BackLink to={isForgot ? '/forgot' : '/signup'} label={t.back} />
      <div className="flex flex-col gap-2.5">
        {isForgot && <span className="text-[13px] font-bold text-teal">{fx(t.stepOf, { a: 2, b: 3 })}</span>}
        <span className="flex size-[52px] items-center justify-center rounded-2xl bg-teal-soft text-teal"><Icon name="sms" size={28} /></span>
        <h1 className="text-[28px] font-bold text-navy">{t.otpTitle}</h1>
        <p className="text-[15px] text-muted-foreground">
          {t.otpSent} <span dir="ltr" className="font-latin font-bold whitespace-nowrap text-foreground">{phone(ph)}</span>
        </p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-[18px]">
        <OtpField otp={otp} />
        <Submit busy={busy}>{t.verify}</Submit>
        {import.meta.env.DEV && (
          <span className="rounded-[10px] bg-muted px-3 py-2 text-center text-[12.5px] text-muted-foreground">{t.otpDemo}</span>
        )}
      </form>
    </>
  )
}

/* ───────────── New password (forgot step 3/3) ───────────── */

export function NewPasswordPage() {
  const { t } = useT()
  const nav = useNavigate()
  const { phone: ph, resetToken } = useStore((s) => s.otp)
  const [f, setF] = useState({ pw: '', pw2: '' })
  const [show, setShow] = useState(false)
  const [err, setErr] = useState<Errors>({})
  const { busy, run } = useBusy()

  if (!resetToken) return <Navigate to="/forgot" replace />

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const er: Errors = { pw: f.pw.length < 8 ? t.errPwShort : undefined, pw2: !f.pw2 || f.pw2 !== f.pw ? t.errPwMatch : undefined }
    setErr(er)
    if (hasErrors(er)) return
    void run(async () => {
      try {
        await ownerApi.auth.reset(resetToken, f.pw)
        notify('toastPwReset')
        nav('/login', { state: { phone: ph } })
      } catch (error) {
        notifyError(error)
        if (errorCode(error) === 'INVALID_RESET_TOKEN') nav('/forgot', { state: { phone: ph } })
      }
    })
  }
  return (
    <>
      <Heading step={fx(t.stepOf, { a: 3, b: 3 })} title={t.newPwTitle} sub={t.newPwSub} />
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field id="n-pw" label={t.newPw} error={err.pw} hint={t.pwHint}>
          <PasswordInput id="n-pw" autoComplete="new-password" value={f.pw} invalid={!!err.pw} show={show} onToggle={() => setShow(!show)}
            onChange={(v) => { setF({ ...f, pw: v }); setErr({ ...err, pw: undefined }) }} />
        </Field>
        <Field id="n-pw2" label={t.confirmPw} error={err.pw2}>
          <Input id="n-pw2" type={show ? 'text' : 'password'} value={f.pw2} aria-invalid={!!err.pw2 || undefined}
            onChange={(e) => { setF({ ...f, pw2: e.target.value }); setErr({ ...err, pw2: undefined }) }} />
        </Field>
        <Submit busy={busy}>{t.savePw}</Submit>
      </form>
    </>
  )
}
