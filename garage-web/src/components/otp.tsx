import { useEffect, useState } from 'react'
import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { FieldError } from '@/components/common'
import { cn } from '@/lib/utils'
import { notify, useT } from '@/lib/i18n'

const RESEND_SECONDS = 45

/** 4-digit OTP state + resend countdown. */
export function useOtp() {
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)
  const [timer, setTimer] = useState(RESEND_SECONDS)
  useEffect(() => {
    if (timer <= 0) return
    const id = setTimeout(() => setTimer((x) => x - 1), 1000)
    return () => clearTimeout(id)
  }, [timer])
  return {
    code, error, timer,
    setCode: (v: string) => { setCode(v); setError(false) },
    /** Returns true when the code is complete (any 4 digits pass in the demo). */
    validate: () => { const ok = code.length === 4; setError(!ok); return ok },
    resend: () => { setTimer(RESEND_SECONDS); setCode(''); notify('toastCodeSent') },
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
              <InputOTPSlot key={i} index={i} aria-invalid={otp.error || undefined}
                className={cn(slot, otp.code[i] ? 'border-primary' : otp.error ? 'border-destructive' : 'border-input')} />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>
      <FieldError center>{otp.error ? t.errOtp : null}</FieldError>
      <div className="flex min-h-[22px] items-center justify-center gap-1.5 text-sm text-muted-foreground">
        {otp.timer > 0 ? (
          <>
            <span>{t.resendIn}</span>
            <span dir="ltr" className="font-latin font-bold text-foreground">00:{String(otp.timer).padStart(2, '0')}</span>
          </>
        ) : (
          <button type="button" onClick={otp.resend} className="font-bold text-primary underline">{t.resend}</button>
        )}
      </div>
    </div>
  )
}
