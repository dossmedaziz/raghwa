import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, Icon, PhoneInput } from '@/components/common'
import { CitySelect, LocationMap, PhotoSlots, useServiceRows } from '@/components/garage-editors'
import { digits, dow, fx, money, phoneLocal } from '@/lib/format'
import { today } from '@/lib/clock'
import { notifyError } from '@/lib/errors'
import { notify, useT } from '@/lib/i18n'
import { useStore } from '@/store'
import { Page } from '@/layouts/app-layout'

type Errors = Partial<Record<'name' | 'phone' | 'address', string>>

export function ProfilePage() {
  const { t } = useT()
  const g = useStore((s) => s.garage), update = useStore((s) => s.updateGarage), saveProfile = useStore((s) => s.saveProfile)
  const [err, setErr] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const save = () => {
    const e: Errors = {
      name: !g.name.trim() ? t.errRequired : undefined,
      phone: digits(g.phone).length !== 8 ? t.errPhone : undefined,
      address: !g.address.trim() ? t.errRequired : undefined,
    }
    setErr(e)
    if (Object.values(e).some(Boolean)) return
    setBusy(true)
    saveProfile().then(() => notify('toastSaved'), notifyError).finally(() => setBusy(false))
  }
  return (
    <Page title={t.navProfile} sub={t.profileSub}
      action={<Button onClick={save} disabled={busy} className="shrink-0 text-[14.5px]"><Icon name="check" />{t.saveChanges}</Button>}>
      <div className="flex flex-wrap items-start gap-5">
        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-4">
          <Card className="gap-4 px-[22px]">
            <span className="text-base font-bold">{t.profileInfo}</span>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="p-name" label={t.garageName} error={err.name}>
                <Input id="p-name" value={g.name} aria-invalid={!!err.name || undefined} onChange={(e) => { update({ name: e.target.value }); setErr({ ...err, name: undefined }) }} />
              </Field>
              <Field id="p-phone" label={t.contactPhone} error={err.phone}>
                <PhoneInput id="p-phone" value={g.phone} invalid={!!err.phone} onChange={(v) => { update({ phone: phoneLocal(v) }); setErr({ ...err, phone: undefined }) }} />
              </Field>
            </div>
            <Field id="p-desc" label={t.description}>
              <Textarea id="p-desc" dir="auto" rows={3} value={g.desc} onChange={(e) => update({ desc: e.target.value })} className="resize-y" />
            </Field>
          </Card>
          <Card className="gap-3.5 px-[22px]">
            <span className="text-base font-bold">{t.logo} · {t.photos}</span>
            <PhotoSlots />
          </Card>
          <Card className="gap-3.5 px-[22px]">
            <span className="text-base font-bold">{t.reviewLocation}</span>
            <LocationMap height={300} />
            <span className="text-[13px] text-muted-foreground">{t.mapNote}</span>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="p-addr" label={t.address} error={err.address}>
                <Input id="p-addr" value={g.address} aria-invalid={!!err.address || undefined} onChange={(e) => { update({ address: e.target.value }); setErr({ ...err, address: undefined }) }} />
              </Field>
              <Field id="p-area" label={t.area}>
                <Input id="p-area" value={g.area} onChange={(e) => update({ area: e.target.value })} />
              </Field>
              <Field id="p-city" label={t.city}><CitySelect id="p-city" /></Field>
            </div>
          </Card>
        </div>
        <CustomerPreview />
      </div>
    </Page>
  )
}

/** Phone mock-up of the garage card in the customer app. */
function CustomerPreview() {
  const { t, L } = useT()
  const g = useStore((s) => s.garage), hours = useStore((s) => s.hours)
  const { active } = useServiceRows()
  const minPrice = active.length ? Math.min(...active.map((x) => x.price)) : 0
  return (
    <div className="sticky top-[92px] flex min-w-[280px] flex-[0_1_340px] flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-base font-bold">{t.customerPreview}</span>
        <span className="text-[13px] text-muted-foreground">{t.previewHint}</span>
      </div>
      <div className="rounded-[36px] bg-foreground p-2.5 shadow-[0_20px_40px_rgba(11,27,58,.22)]">
        <div className="flex flex-col overflow-hidden rounded-[28px] bg-muted">
          <div className="relative flex h-[120px] items-center justify-center" style={{ background: 'repeating-linear-gradient(135deg,#DCE7F2 0 10px,#D0DDEB 10px 20px)' }}>
            <span className="font-mono text-[11px] text-[#4A5B78]">map · {g.area}</span>
            <span className="absolute top-1/2 left-1/2 -mt-[9px] -ml-[9px] size-[18px] rounded-full border-[3px] border-white bg-primary shadow-[0_0_0_6px_rgba(14,59,140,.18)]" />
          </div>
          <div className="flex flex-col gap-2.5 px-3.5 pt-3.5 pb-[18px]">
            <span className="text-xs font-bold text-muted-foreground">{t.nearby}</span>
            <div className="overflow-hidden rounded-[18px] bg-white shadow-[0_4px_14px_rgba(11,27,58,.08)]">
              <div className="bg-photo relative flex h-[110px] items-center justify-center">
                <span className="font-mono text-[11px] text-muted-foreground">garage-cover.jpg</span>
                <span className="absolute start-2.5 top-2.5 flex items-center gap-[5px] rounded-full bg-white px-[9px] py-[3px] text-[11.5px] font-bold text-success">
                  <span className="size-1.5 rounded-full bg-success-dot" />{t.openNow} · {fx(t.closesAt, { t: hours[dow(today())].to })}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 px-3.5 py-3">
                <span className="text-[15.5px] font-bold">{g.name}</span>
                <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-ink-2">
                  <span className="flex items-center gap-0.5 font-bold"><Icon name="star" size={16} fill className="text-amber" />4,8</span>
                  <span className="text-muted-foreground">(126 {t.reviews})</span><span>·</span><span>1,2 {t.km}</span><span>·</span><span>{g.area}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[13px] text-muted-foreground">{t.from} <span className="text-[15px] font-bold text-primary">{money(minPrice, L)}</span></span>
                  <span className="rounded-[10px] bg-primary px-3.5 py-[7px] text-[13px] font-bold text-white">{t.book}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
