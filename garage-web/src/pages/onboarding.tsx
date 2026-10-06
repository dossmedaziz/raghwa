import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Eyebrow, Field, Icon, InfoNote, LangSwitch, LogoMark, PhoneInput } from '@/components/common'
import {
  CapacityStepper, CitySelect, CopyHoursButton, HoursEditor, LocationMap, PhotoSlots, SlotDurationPicker, SlotStats,
  coordsLabel, useServiceEditor, useServiceRows, useSlotPreview,
} from '@/components/garage-editors'
import { DAYS } from '@/data/i18n-strings'
import type { DayHours } from '@/data/mock'
import { cn } from '@/lib/utils'
import { digits, fx, iso, phoneLocal } from '@/lib/format'
import { notify, useT } from '@/lib/i18n'
import { useStore } from '@/store'

type Errors = Partial<Record<'gName' | 'gPhone' | 'gAddress' | 'gArea' | 'customDur', string>>

export function OnboardingPage() {
  const { t, ic } = useT()
  const nav = useNavigate()
  const [step, setStep] = useState(1)
  const [max, setMax] = useState(1)
  const [err, setErr] = useState<Errors>({})
  const g = useStore((s) => s.garage)
  const { isCustom, customDur } = useStore()

  const go = (n: number) => { setStep(n); setErr({}); window.scrollTo(0, 0) }
  const next = () => {
    const e: Errors = {}
    if (step === 1) {
      if (!g.name.trim()) e.gName = t.errRequired
      if (digits(g.phone).length !== 8) e.gPhone = t.errPhone
    }
    if (step === 2) {
      if (!g.address.trim()) e.gAddress = t.errRequired
      if (!g.area.trim()) e.gArea = t.errRequired
    }
    if (step === 4 && isCustom && !(+customDur >= 10 && +customDur <= 240)) e.customDur = t.errDur
    setErr(e)
    if (Object.keys(e).length) return
    if (step === 6) {
      notify('toastPublished')
      return nav('/dashboard')
    }
    setMax(Math.max(max, step + 1))
    go(step + 1)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-white">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3.5 px-7 py-3.5">
          <LogoMark size={32} />
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="text-base font-bold text-navy">{t.obTitle}</span>
            <span className="text-[12.5px] text-muted-foreground">{t.obSub}</span>
          </div>
          <LangSwitch />
        </div>
        <div className="h-1 bg-[#E8EEF6]">
          <div className="h-full bg-aqua transition-[width] duration-300" style={{ width: Math.round((step / 6) * 100) + '%' }} />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1200px] flex-1 items-start gap-8 px-7 pt-8 pb-12">
        <nav aria-label="steps" className="sticky top-[110px] hidden w-[250px] shrink-0 flex-col gap-1 min-[980px]:flex">
          {t.obSteps.map((label, i) => {
            const n = i + 1, cur = n === step, reach = n <= max, done = !cur && n < max
            return (
              <button key={n} type="button" onClick={() => reach && go(n)} aria-current={cur ? 'step' : undefined}
                className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start', cur && 'bg-accent', reach ? 'cursor-pointer' : 'cursor-default')}>
                <span className={cn('flex size-[30px] shrink-0 items-center justify-center rounded-full border-[1.5px] font-latin text-[13px] font-bold',
                  cur ? 'border-primary bg-primary text-white' : done ? 'border-cyan-wash bg-cyan-wash text-teal' : 'border-input bg-white text-subtle')}>
                  {done ? <Icon name="check" size={18} /> : n}
                </span>
                <span className={cn('text-sm', cur ? 'font-bold text-navy' : reach ? 'font-semibold text-ink-2' : 'font-semibold text-subtle')}>{label}</span>
              </button>
            )
          })}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-teal">{fx(t.stepOf, { a: step, b: 6 })}</span>
            <h1 className="text-[28px] font-bold text-navy">{t.obSteps[step - 1]}</h1>
            <p className="text-[15px] text-muted-foreground">{t.obSubs[step - 1]}</p>
          </div>
          <Card key={step} className="animate-rg-in gap-[22px] px-7 py-7">
            {step === 1 && <StepInfo err={err} clear={(k) => setErr({ ...err, [k]: undefined })} />}
            {step === 2 && <StepLocation err={err} clear={(k) => setErr({ ...err, [k]: undefined })} />}
            {step === 3 && <StepHours />}
            {step === 4 && <StepSlots err={err} />}
            {step === 5 && <StepServices />}
            {step === 6 && <StepReview goStep={go} />}
          </Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              {step > 1 && (
                <Button variant="outline" size="lg" onClick={() => go(step - 1)} className="text-[15px]">
                  <Icon name={ic.back} />{t.prev}
                </Button>
              )}
            </div>
            <Button size="lg" onClick={next} className={cn('px-[22px] text-[15px] shadow-[0_6px_16px_rgba(14,59,140,.22)]', step === 6 && 'bg-teal hover:bg-[#086C7D]')}>
              {step === 6 ? t.publish : t.next}
              <Icon name={step === 6 ? 'rocket_launch' : ic.next} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

type StepProps = { err: Errors; clear: (k: keyof Errors) => void }

function StepInfo({ err, clear }: StepProps) {
  const { t } = useT()
  const g = useStore((s) => s.garage), update = useStore((s) => s.updateGarage)
  return (
    <>
      <div className="grid gap-[18px] sm:grid-cols-2">
        <Field id="g-name" label={t.garageName} error={err.gName}>
          <Input id="g-name" value={g.name} aria-invalid={!!err.gName || undefined} onChange={(e) => { update({ name: e.target.value }); clear('gName') }} />
        </Field>
        <Field id="g-phone" label={t.contactPhone} error={err.gPhone}>
          <PhoneInput id="g-phone" value={g.phone} invalid={!!err.gPhone} onChange={(v) => { update({ phone: phoneLocal(v) }); clear('gPhone') }} />
        </Field>
      </div>
      <Field id="g-desc" label={t.description}>
        <Textarea id="g-desc" dir="auto" rows={3} placeholder={t.descPh} value={g.desc} onChange={(e) => update({ desc: e.target.value })} className="resize-y" />
      </Field>
      <div className="flex flex-col gap-2.5">
        <span className="text-[13px] font-semibold text-ink-2">{t.logo} · {t.photos}</span>
        <PhotoSlots hint />
      </div>
    </>
  )
}

function StepLocation({ err, clear }: StepProps) {
  const { t } = useT()
  const g = useStore((s) => s.garage), update = useStore((s) => s.updateGarage)
  return (
    <>
      <InfoNote>{t.mapNote}</InfoNote>
      <LocationMap height={360} />
      <Field id="g-addr" label={t.address} error={err.gAddress}>
        <Input id="g-addr" value={g.address} aria-invalid={!!err.gAddress || undefined} onChange={(e) => { update({ address: e.target.value }); clear('gAddress') }} />
      </Field>
      <div className="grid gap-[18px] sm:grid-cols-2">
        <Field id="g-area" label={t.area} error={err.gArea}>
          <Input id="g-area" value={g.area} aria-invalid={!!err.gArea || undefined} onChange={(e) => { update({ area: e.target.value }); clear('gArea') }} />
        </Field>
        <Field id="g-city" label={t.city}><CitySelect id="g-city" /></Field>
      </div>
    </>
  )
}

function StepHours() {
  return (
    <>
      <div className="flex justify-end"><CopyHoursButton /></div>
      <HoursEditor />
    </>
  )
}

function StepSlots({ err }: { err: Errors }) {
  const { t } = useT()
  const p = useSlotPreview()
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-[22px]">
        <div className="flex flex-col gap-2.5">
          <span className="text-sm font-bold">{t.slotDuration}</span>
          <SlotDurationPicker error={!!err.customDur} />
        </div>
        <div className="flex flex-col gap-2.5">
          <span className="text-sm font-bold">{t.capacity}</span>
          <span className="-mt-1.5 text-[13px] text-muted-foreground">{t.capacityHint}</span>
          <CapacityStepper />
        </div>
      </div>
      <div className="flex flex-col gap-3.5 rounded-2xl border bg-[#F4F8FC] p-[18px]">
        <div className="flex items-center justify-between gap-2">
          <Eyebrow>{t.preview}</Eyebrow>
          <span className="text-[13px] font-semibold text-ink-2">{p.title}</span>
        </div>
        <div dir="ltr" className="flex flex-wrap gap-1.5">
          {p.slots.map((s) => (
            <span key={s} className="rounded-lg border border-input bg-white px-2 py-[5px] font-latin text-[12.5px] font-semibold">{s}</span>
          ))}
        </div>
        <div className="border-t border-dashed border-input pt-2"><SlotStats /></div>
      </div>
    </div>
  )
}

function StepServices() {
  const { t } = useT()
  const { services, countLabel, label } = useServiceRows()
  const toggle = useStore((s) => s.toggleService)
  const ed = useServiceEditor()
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-muted-foreground">{countLabel}</span>
        <Button size="sm" className="h-10 text-sm" onClick={ed.openNew}><Icon name="add" size={18} />{t.addService}</Button>
      </div>
      <div className="flex flex-col overflow-hidden rounded-[14px] border">
        {services.map((sv) => {
          const l = label(sv)
          return (
            <div key={sv.id} className={cn('flex items-center gap-3.5 border-b border-line bg-white px-4 py-3.5 last:border-b-0', !sv.active && 'opacity-60')}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-soft text-teal"><Icon name="local_car_wash" size={22} /></span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="text-[15px] font-bold">{l.name}</span>
                  <span className="text-[13px] text-muted-foreground">{l.other}</span>
                </div>
                <span className="text-[13px] text-muted-foreground">{l.desc}</span>
              </div>
              <span className="text-[15px] font-bold whitespace-nowrap text-navy">{l.price}</span>
              <Switch checked={sv.active} onCheckedChange={() => toggle(sv.id)} aria-label={sv.active ? t.active : t.inactive} title={sv.active ? t.active : t.inactive} />
              <Button variant="ghost" size="icon" onClick={() => ed.openEdit(sv)} aria-label={t.edit} title={t.edit} className="text-ink-2"><Icon name="edit" /></Button>
              <Button variant="ghost" size="icon" onClick={() => ed.askDelete(sv)} aria-label={t.del} title={t.del} className="text-destructive hover:bg-danger-soft hover:text-destructive">
                <Icon name="delete" />
              </Button>
            </div>
          )
        })}
      </div>
      {ed.dialogs}
    </>
  )
}

function ReviewCard({ label, onEdit, children, className }: { label: ReactNode; onEdit: () => void; children: ReactNode; className?: string }) {
  const { t } = useT()
  return (
    <div className={cn('flex flex-col gap-2 rounded-[14px] border p-[18px]', className)}>
      <div className="flex items-center justify-between">
        <Eyebrow>{label}</Eyebrow>
        <button type="button" onClick={onEdit} className="text-[13px] font-semibold text-primary hover:text-teal hover:underline">{t.edit}</button>
      </div>
      {children}
    </div>
  )
}

/** Groups consecutive days with identical hours, e.g. "Lundi – Vendredi". */
export function useHoursSummary() {
  const { t, L } = useT()
  const hours = useStore((s) => s.hours)
  const sig = (h: DayHours) => (h.open ? iso(h.from + '–' + h.to) + (h.brk ? ' · ' + t.break + ' ' + iso(h.bFrom + '–' + h.bTo) : '') : t.closed)
  const groups: { sig: string; start: number; end: number }[] = []
  hours.forEach((h, i) => {
    const last = groups[groups.length - 1]
    if (last && last.sig === sig(h)) last.end = i
    else groups.push({ sig: sig(h), start: i, end: i })
  })
  return groups.map((g) => ({ days: g.start === g.end ? DAYS[L][g.start] : DAYS[L][g.start] + ' – ' + DAYS[L][g.end], val: g.sig }))
}

function StepReview({ goStep }: { goStep: (n: number) => void }) {
  const { t } = useT()
  const g = useStore((s) => s.garage)
  const p = useSlotPreview()
  const summary = useHoursSummary()
  const { active, countLabel, label } = useServiceRows()
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <ReviewCard label={t.reviewGarage} onEdit={() => goStep(1)}>
          <span className="text-[17px] font-bold">{g.name}</span>
          <span dir="ltr" className="text-start font-latin text-ink-2">+216 {g.phone}</span>
          <span className="text-[13.5px] leading-relaxed text-muted-foreground">{g.desc}</span>
        </ReviewCard>
        <ReviewCard label={t.reviewLocation} onEdit={() => goStep(2)}>
          <span className="text-[15px] font-bold">{g.address}</span>
          <span className="text-ink-2">{g.area}, {g.city}</span>
          <span dir="ltr" className="text-start font-latin text-[12.5px] text-muted-foreground">{coordsLabel(g.lat, g.lng)}</span>
        </ReviewCard>
        <ReviewCard label={t.reviewHours} onEdit={() => goStep(3)}>
          {summary.map((s) => (
            <div key={s.days} className="flex flex-col gap-0.5">
              <span className="font-bold">{s.days}</span>
              <span className="text-[13.5px] text-ink-2 [unicode-bidi:plaintext]">{s.val}</span>
            </div>
          ))}
        </ReviewCard>
        <ReviewCard label={t.reviewSlots} onEdit={() => goStep(4)}>
          <span className="text-[15px] font-bold">{fx(t.durationVal, { n: p.dur })}</span>
          <span className="text-ink-2">{fx(t.capVal, { n: p.cap })}</span>
          <span className="text-[13.5px] text-muted-foreground">{p.pvSlots} · {p.pvPlaces}</span>
        </ReviewCard>
      </div>
      <ReviewCard label={<>{t.reviewServices} · {countLabel}</>} onEdit={() => goStep(5)} className="gap-2.5">
        <div className="flex flex-wrap gap-2">
          {active.map((sv) => (
            <span key={sv.id} className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-[13.5px]">
              <span className="font-semibold">{label(sv).name}</span>
              <span className="font-bold text-primary">{label(sv).price}</span>
            </span>
          ))}
        </div>
      </ReviewCard>
      <InfoNote icon="visibility">{t.publishNote}</InfoNote>
    </>
  )
}
