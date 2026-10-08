import { useEffect, useState } from 'react'
import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { FieldError } from '@/components/common'
import { cn } from '@/lib/utils'
import { notifyError } from '@/lib/errors'
import { notify, useT } from '@/lib/i18n'

// Matches the API cooldown (OTP_RESEND_COOLDOWN_SECONDS).
const RESEND_SECONDS = 60

/** 4-digit OTP state + resend countdown. `onResend` asks the API for a new code. */
export function useOtp(onResend?: () => Promise<void>) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [timer, setTimer] = useState(RESEND_SECONDS)
  const { t } = useT()
  useEffect(() => {
    if (timer <= 0) return
    const id = setTimeout(() => setTimer((x) => x - 1), 1000)
    return () => clearTimeout(id)
  }, [timer])
  return {
    code, error, timer,
    setCode: (v: string) => { setCode(v); setError(null) },
    /** True when 4 digits were typed; the API decides whether they are right. */
    validate: () => { const ok = code.length === 4; setError(ok ? null : t.errOtp); return ok },
    /** Shows a message from the API (wrong or expired code) under the field. */
    fail: (message: string) => { setError(message); setCode('') },
    resend: async () => {
      try {
        await onResend?.()
        setTimer(RESEND_SECONDS); setCode(''); setError(null); notify('toastCodeSent')
      } catch (err) {
        notifyError(err)
      }
    },
  }
}

export function OtpField({ otp, large = true }: { otp: ReturnType<typeof useOtp>; large?: boolean }) {
  const { t } = useT()
  const slot = cn(
    'rounded-[14px] border-[1.5px] bg-white font-latin font-bold first:rounded-s-[14px] first:border-s-[1.5px] last:rounded-e-[14px] data-[active=true]:border-primary data-[active=true]:ring-ring/30',
    large ? 'h-[68px] w-16 text-[28px]' : 'h-[62px] w-[58px] text-[26px]',
  )
  return (
    <div className="flex flex-col gap-3">
      <div dir="ltr" className="flex justify-center">
        <InputOTP maxLength={4} pattern={REGEXP_ONLY_DIGITS} value={otp.code} onChange={otp.setCode} autoFocus inputMode="numeric" autoComplete="one-time-code">
          <InputOTPGroup className={large ? 'gap-3' : 'gap-2.5'}>
            {[0, 1, 2, 3].map((i) => (
              <InputOTPSlot key={i} index={i} aria-invalid={!!otp.error || undefined}
                className={cn(slot, otp.code[i] ? 'border-primary' : otp.error ? 'border-destructive' : 'border-input')} />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>
      <FieldError center>{otp.error}</FieldError>
      <div className="flex min-h-[22px] items-center justify-center gap-1.5 text-sm text-muted-foreground">
        {otp.timer > 0 ? (
          <>
            <span>{t.resendIn}</span>
            <span dir="ltr" className="font-latin font-bold text-foreground">00:{String(otp.timer).padStart(2, '0')}</span>
          </>
        ) : (
          <button type="button" onClick={() => void otp.resend()} className="font-bold text-primary underline">{t.resend}</button>
        )}
      </div>
    </div>
  )
}
