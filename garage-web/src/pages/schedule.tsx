import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Field, Icon, SectionLabel } from '@/components/common'
import { CapacityStepper, CopyHoursButton, HoursEditor, SlotDurationPicker, SlotStats } from '@/components/garage-editors'
import { useResActions, useResFormat } from '@/components/reservations'
import { ownerApi } from '@/lib/api'
import { nowTime, today } from '@/lib/clock'
import { notifyError } from '@/lib/errors'
import { invalidate, useQuery } from '@/lib/query'
import type { BlockReason } from '@/lib/types'
import { DAYS_S } from '@/data/i18n-strings'
import { cn } from '@/lib/utils'
import { addDays, dow, fmtDate, fx, mt, tm } from '@/lib/format'
import { notify, useT } from '@/lib/i18n'
import { useSlotDuration, useStore } from '@/store'
import { Page } from '@/layouts/app-layout'
import { Legend } from '@/pages/dashboard'

type Cell = { d: string; t: string }

/** One week of slot occupancy from the API (bookings, capacity, blocks). */
function useWeek(ws: string) {
  const garageId = useStore((s) => s.activeGarageId)!
  const we = addDays(ws, 6)
  const q = useQuery(`schedule:${garageId}:${ws}:${we}`, () => ownerApi.schedule.get(garageId, ws, we), { keepPrevious: true })
  const byDate = new Map((q.data ?? []).map((d) => [d.date, d]))
  const slot = (d: string, tt: string) => byDate.get(d)?.slots.find((x) => x.time === tt)
  return {
    ...q,
    day: (d: string) => byDate.get(d),
    slot,
    occ: (d: string, tt: string) => slot(d, tt)?.booked ?? 0,
    dayCount: (d: string) => (byDate.get(d)?.slots ?? []).reduce((a, x) => a + x.booked, 0),
  }
}

/** The day's reservations starting inside one slot (slot dialog). */
function useSlotBookings(cell: Cell | null, dur: number) {
  const garageId = useStore((s) => s.activeGarageId)!
  const q = useQuery(cell ? `slot-res:${garageId}:${cell.d}` : null, () =>
    ownerApi.reservations.list(garageId, { from: cell!.d, to: cell!.d, order: 'asc', limit: 100 }),
  )
  if (!cell) return []
  const start = tm(cell.t)
  return (q.data?.items ?? []).filter((r) => r.status !== 'cancelled' && tm(r.time) >= start && tm(r.time) < start + dur)
}

const fill = (o: number, cap: number) => {
  const r = o / cap
  return o === 0 ? 'bg-[#F1F5FA] text-[#7A879C] border-border' : r < 0.5 ? 'bg-[#C9EEF5] text-teal-ink border-[#C9EEF5]' : r < 1 ? 'bg-[#5FC6DC] text-[#05323B] border-[#5FC6DC]' : 'bg-primary text-white border-primary'
}

export function SchedulePage() {
  const { t, L, ic } = useT()
  const garageId = useStore((s) => s.activeGarageId)!
  const cap = useStore((s) => s.capacity)
  const [week, setWeek] = useState(0)
  const [hoursOpen, setHoursOpen] = useState(false)
  const [slot, setSlot] = useState<Cell | null>(null)
  const [blockDay, setBlockDay] = useState<string | null>(null)
  const td = today(), now = tm(nowTime())
  const dur = useSlotDuration()
  const reasonL = (r: BlockReason) => ({ holiday: t.rHoliday, maintenance: t.rMaintenance, other: t.rOther })[r] ?? t.rOther

  const ws = addDays(td, -dow(td) + week * 7)
  const sched = useWeek(ws)
  const wd = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const d = addDays(ws, i), day = sched.day(d)
    return { d, i, open: !!day?.isOpen, blocked: day?.blockedReason ?? null, slots: day?.slots.map((x) => x.time) ?? [] }
  })
  const times = [...new Set(wd.flatMap((x) => x.slots))].sort((a, b) => tm(a) - tm(b))
  const unblock = async (d: string) => {
    try {
      await ownerApi.schedule.unblockDay(garageId, d)
      invalidate()
      notify('toastUnblocked')
    } catch (err) {
      notifyError(err)
    }
  }

  return (
    <Page title={t.navSchedule} sub={t.schedSub} loading={sched.loading} error={sched.error} onRetry={sched.reload}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeek(week - 1)} aria-label="prev" className="border border-input text-ink-2"><Icon name={ic.back} /></Button>
          <span className="min-w-[190px] text-center text-[15.5px] font-bold">{fmtDate(ws, L, 'dm')} – {fmtDate(addDays(ws, 6), L, 'dm')}</span>
          <Button variant="outline" size="icon" onClick={() => setWeek(week + 1)} aria-label="next" className="border border-input text-ink-2"><Icon name={ic.fwd} /></Button>
          {week !== 0 && <Button variant="secondary" size="sm" onClick={() => setWeek(0)} className="bg-sky text-[13px] text-primary">{t.thisWeek}</Button>}
        </div>
        <div className="flex flex-wrap items-center gap-3.5">
          <div className="flex flex-wrap gap-3 text-[12.5px] text-ink-2">
            <Legend swatch="border border-[#DCE4EE] bg-[#F1F5FA]" label={t.lgFree} />
            <Legend swatch="bg-[#C9EEF5]" label={t.lgPartial} />
            <Legend swatch="bg-[#5FC6DC]" label="2/3+" />
            <Legend swatch="bg-primary" label={t.lgFull} />
            <Legend swatch="bg-stripes" label={t.lgBlocked} />
          </div>
          <Button onClick={() => setHoursOpen(true)} className="h-10 text-sm"><Icon name="tune" size={19} />{t.editHours}</Button>
        </div>
      </div>

      <Card className={cn('max-h-[calc(100vh-250px)] gap-0 overflow-auto py-0 transition-opacity', sched.refreshing && 'opacity-60')}>
        <div className="min-w-[820px] px-3.5 pb-3.5">
          <div className="sticky top-0 z-2 mb-2 grid grid-cols-[58px_repeat(7,minmax(0,1fr))] gap-[5px] border-b border-line bg-white pt-3.5 pb-2">
            <span />
            {wd.map((x) => {
              const isT = x.d === td, bl = x.blocked, canBlock = x.open && !bl && x.d >= td
              const places = x.slots.length * cap, bk = x.slots.reduce((a, tt) => a + Math.min(sched.occ(x.d, tt), cap), 0)
              const sum = x.open ? bk + '/' + places : t.closed
              return (
                <div key={x.d} className={cn('flex flex-col items-center gap-1 rounded-xl px-1 py-1.5', isT && 'bg-primary')}>
                  <span className={cn('text-[12.5px] font-semibold', isT ? 'text-[#C9DBF5]' : 'text-muted-foreground')}>{DAYS_S[L][x.i]}</span>
                  <span className={cn('font-latin text-lg font-bold', isT ? 'text-white' : 'text-foreground')}>{+x.d.slice(8)}</span>
                  {bl ? (
                    <button type="button" onClick={() => void unblock(x.d)} title={t.unblockDay}
                      className="flex items-center gap-[3px] rounded-md bg-danger-soft px-2 py-0.5 text-[11.5px] font-bold text-danger-ink">
                      <Icon name="lock_open" size={14} />{reasonL(bl)}
                    </button>
                  ) : canBlock ? (
                    <button type="button" onClick={() => setBlockDay(x.d)} title={t.blockDay}
                      className={cn('flex items-center gap-[3px] rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold hover:bg-primary/8', isT ? 'text-[#C9DBF5] hover:bg-white/10' : 'text-muted-foreground')}>
                      <Icon name="block" size={14} />{sum}
                    </button>
                  ) : (
                    <span className={cn('py-0.5 text-[11.5px]', isT ? 'text-[#C9DBF5]' : 'text-muted-foreground')}>{sum}</span>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex flex-col gap-[5px]">
            {times.map((tt) => (
              <div key={tt} className="grid grid-cols-[58px_repeat(7,minmax(0,1fr))] gap-[5px]">
                <span className="flex items-center font-latin text-xs font-semibold text-muted-foreground">{tt}</span>
                {wd.map((x) => {
                  if (!x.open) return <span key={x.d} title={t.closed} className="h-[34px] rounded-lg border border-dashed border-border bg-[#F7F8FA]" />
                  if (!x.slots.includes(tt)) return <span key={x.d} className="h-[34px]" />
                  const past = x.d < td || (x.d === td && tm(tt) + dur <= now)
                  const bl = sched.slot(x.d, tt)?.blockedReason ?? null
                  const o = sched.occ(x.d, tt)
                  return (
                    <button key={x.d} type="button" onClick={() => setSlot({ d: x.d, t: tt })}
                      title={bl ? t.blockedShort + ' · ' + reasonL(bl) : tt + ' · ' + o + '/' + cap}
                      className={cn('flex h-[34px] items-center justify-center gap-1 rounded-lg border font-latin text-[12.5px] font-bold hover:brightness-96',
                        bl ? 'bg-stripes border-[#D3DAE5] text-ink-2' : fill(o, cap), past && 'opacity-50')}>
                      {bl ? <Icon name="lock" size={14} /> : o + '/' + cap}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <HoursDialog open={hoursOpen} onClose={() => setHoursOpen(false)} />
      {/* keyed so the reason picker resets for each slot/day */}
      <SlotDialog key={slot ? 'slot-' + slot.d + slot.t : 'slot'} cell={slot} week={sched} onClose={() => setSlot(null)} />
      <BlockDayDialog key={'day-' + (blockDay ?? '')} day={blockDay} bookings={blockDay ? sched.dayCount(blockDay) : 0} onClose={() => setBlockDay(null)} />
    </Page>
  )
}

function HoursDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT()
  const { isCustom, customDur, saveHours, saveSlots, loadGarage } = useStore()
  const [busy, setBusy] = useState(false)
  const bad = isCustom && !(+customDur >= 10 && +customDur <= 240)
  // Closing without saving drops the edits (reload the saved values).
  const dismiss = () => { loadGarage().catch(() => undefined); onClose() }
  const save = async () => {
    setBusy(true)
    try {
      await saveHours()
      await saveSlots()
      notify('toastSaved')
      onClose()
    } catch (err) {
      notifyError(err)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && dismiss()}>
      <DialogContent className="max-h-[calc(100vh-40px)] grid-rows-[auto_1fr_auto] gap-0 overflow-hidden rounded-[20px] p-0 shadow-modal sm:max-w-[880px]">
        <DialogHeader className="border-b border-line px-[22px] py-[18px]">
          <DialogTitle className="text-[17px] font-bold">{t.hoursTitle}</DialogTitle>
          <DialogDescription className="sr-only">{t.schedSub}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-[22px] overflow-auto px-[22px] py-[18px]">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <span className="text-[15px] font-bold">{t.reviewHours}</span>
              <CopyHoursButton />
            </div>
            <HoursEditor dense />
          </div>
          <div className="flex flex-wrap gap-7">
            <div className="flex flex-col gap-2.5">
              <span className="text-[15px] font-bold">{t.slotDuration}</span>
              <SlotDurationPicker inline error={bad} />
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="text-[15px] font-bold">{t.capacity}</span>
              <CapacityStepper />
            </div>
          </div>
          <SlotStats />
        </div>
        <DialogFooter className="mx-0 mb-0 rounded-none border-line bg-white px-[22px] pt-3.5 pb-[18px]">
          <Button variant="outline" onClick={dismiss}>{t.cancel}</Button>
          <Button disabled={bad || busy} onClick={() => void save()}>{t.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ReasonSelect({ value, onChange, order, id }: { value: BlockReason; onChange: (r: BlockReason) => void; order: BlockReason[]; id?: string }) {
  const { t } = useT()
  const label = { holiday: t.rHoliday, maintenance: t.rMaintenance, other: t.rOther }
  return (
    <Select value={value} onValueChange={(v) => onChange(v as BlockReason)}>
      <SelectTrigger id={id} aria-label={t.reason} className="w-full flex-1 data-[size=default]:h-[42px]"><SelectValue /></SelectTrigger>
      <SelectContent>{order.map((r) => <SelectItem key={r} value={r}>{label[r]}</SelectItem>)}</SelectContent>
    </Select>
  )
}

function SlotDialog({ cell, week, onClose }: { cell: Cell | null; week: ReturnType<typeof useWeek>; onClose: () => void }) {
  const { t, L } = useT()
  const garageId = useStore((s) => s.activeGarageId)!
  const cap = useStore((s) => s.capacity)
  const dur = useSlotDuration()
  const lst = useSlotBookings(cell, dur)
  const f = useResFormat()
  const act = useResActions()
  const [reason, setReason] = useState<BlockReason>('maintenance')
  const [busy, setBusy] = useState(false)
  const reasonL = (r: BlockReason) => ({ holiday: t.rHoliday, maintenance: t.rMaintenance, other: t.rOther })[r]
  if (!cell) return <Dialog open={false} />
  const { d, t: tt } = cell
  const dayBlocked = week.day(d)?.blockedReason ?? null
  const o = week.occ(d, tt), slBl = dayBlocked ? null : (week.slot(d, tt)?.blockedReason ?? null), canEdit = !dayBlocked && d >= today()
  const toggle = async () => {
    setBusy(true)
    try {
      if (slBl) await ownerApi.schedule.unblockSlot(garageId, d, tt)
      else await ownerApi.schedule.blockSlot(garageId, d, tt, reason)
      invalidate()
      notify(slBl ? 'toastUnblocked' : 'toastBlocked')
      onClose()
    } catch (err) {
      notifyError(err)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent showCloseButton={false} className="gap-0 rounded-[20px] p-0 shadow-modal sm:max-w-[440px]">
        <DialogHeader className="flex-row items-start gap-3 border-b border-line px-5 py-[18px]">
          <div className="flex flex-1 flex-col gap-0.5">
            <DialogTitle className="text-[16.5px] leading-normal font-bold">{fmtDate(d, L, 'long')}</DialogTitle>
            <DialogDescription dir="ltr" className="text-start font-latin text-ink-2 [unicode-bidi:isolate]">{tt} – {mt(tm(tt) + dur)}</DialogDescription>
          </div>
          <span className={cn('rounded-[10px] px-2.5 py-1.5 font-latin text-[15px] font-extrabold', fill(o, cap))}>{o}/{cap}</span>
          <Button variant="secondary" size="icon" onClick={onClose} aria-label={t.close}><Icon name="close" /></Button>
        </DialogHeader>
        <div className="flex flex-col gap-2.5 px-5 py-4">
          <SectionLabel>{t.slotBookings}</SectionLabel>
          {lst.map((r) => (
            <button key={r.id} type="button" onClick={() => { onClose(); act.view(r.id) }}
              className="flex w-full items-center gap-2.5 rounded-xl border bg-white px-3 py-2.5 text-start hover:bg-[#F7F9FC]">
              <span className="flex flex-1 flex-col"><span className="font-bold">{f.name(r)}</span><span className="text-[12.5px] text-muted-foreground">{f.svcText(r)}</span></span>
              <span className="font-latin font-bold">{r.time}</span>
            </button>
          ))}
          {o > lst.length && <span className="text-[13px] text-muted-foreground">{fx(t.moreBookings, { n: o - lst.length })}</span>}
          {o === 0 && <span className="rounded-xl bg-muted p-3 text-[13.5px] text-muted-foreground">{t.noBookingsSlot}</span>}
        </div>
        {canEdit && (
          <div className="flex flex-wrap items-center gap-2.5 border-t border-line px-5 pt-3.5 pb-[18px]">
            {slBl ? (
              <>
                <span className="flex flex-1 items-center gap-1.5 font-semibold text-danger-ink"><Icon name="lock" size={18} />{t.blockedShort} · {reasonL(slBl)}</span>
                <Button variant="outline" disabled={busy} onClick={() => void toggle()} className="text-primary">
                  <Icon name="lock_open" size={18} />{t.unblockSlot}
                </Button>
              </>
            ) : (
              <>
                <ReasonSelect value={reason} onChange={setReason} order={['maintenance', 'holiday', 'other']} />
                <Button disabled={busy} onClick={() => void toggle()} className="bg-ink-2 hover:bg-[#28344A]">
                  <Icon name="block" size={18} />{t.blockSlot}
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function BlockDayDialog({ day, bookings: n, onClose }: { day: string | null; bookings: number; onClose: () => void }) {
  const { t, L } = useT()
  const garageId = useStore((s) => s.activeGarageId)!
  const [reason, setReason] = useState<BlockReason>('holiday')
  const [busy, setBusy] = useState(false)
  const block = async () => {
    if (!day) return
    setBusy(true)
    try {
      await ownerApi.schedule.blockDay(garageId, day, reason)
      invalidate()
      notify('toastBlocked')
      onClose()
    } catch (err) {
      notifyError(err)
    } finally {
      setBusy(false)
    }
  }
  return (
    <AlertDialog open={!!day} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="gap-3.5 rounded-[20px] p-6 shadow-modal data-[size=default]:max-w-[420px] data-[size=default]:sm:max-w-[420px]">
        <AlertDialogHeader className="place-items-start gap-3.5 text-start">
          <span className="flex size-12 items-center justify-center rounded-[14px] bg-secondary text-ink-2"><Icon name="event_busy" size={26} /></span>
          <AlertDialogTitle className="text-lg font-bold">{day ? fx(t.blockDayTitle, { d: fmtDate(day, L) }) : ''}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-ink-2">{t.blockDayBody}</AlertDialogDescription>
        </AlertDialogHeader>
        {n > 0 && (
          <span className="flex gap-2 rounded-xl bg-[#FFF5E6] px-3 py-2.5 text-[13.5px] text-[#8A4B06]">
            <Icon name="warning" size={18} />{fx(t.blockDayWarn, { n })}
          </span>
        )}
        <Field id="bd-r" label={t.reason}>
          <ReasonSelect id="bd-r" value={reason} onChange={setReason} order={['holiday', 'maintenance', 'other']} />
        </Field>
        <AlertDialogFooter className="mx-0 mb-0 mt-1 border-0 bg-transparent p-0">
          <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
          <Button disabled={busy} onClick={() => void block()} className="bg-ink-2 hover:bg-[#28344A]">{t.blockDay}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
