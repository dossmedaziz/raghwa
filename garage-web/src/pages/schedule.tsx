import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Field, Icon, SectionLabel } from '@/components/common'
import { CapacityStepper, CopyHoursButton, HoursEditor, SlotDurationPicker, SlotStats } from '@/components/garage-editors'
import { useResActions, useResFormat } from '@/components/reservations'
import { NOW, TODAY, type BlockReason, type Reservation } from '@/data/mock'
import { DAYS_S } from '@/data/i18n-strings'
import { cn } from '@/lib/utils'
import { addDays, dow, fmtDate, fx, genSlots, hash, mt, tm } from '@/lib/format'
import { notify, useT } from '@/lib/i18n'
import { useSlotDuration, useStore } from '@/store'
import { Page } from '@/layouts/app-layout'
import { Legend } from '@/pages/dashboard'

type Cell = { d: string; t: string }

/** Occupancy per slot: real bookings, plus deterministic fake load on other days so the week looks lived-in. */
function useOccupancy() {
  const reservations = useStore((s) => s.reservations), cap = useStore((s) => s.capacity)
  const dur = useSlotDuration()
  const live = reservations.filter((r) => r.status !== 'cancelled')
  const inSlot = (r: Reservation, d: string, tt: string) => r.date === d && tm(r.time) >= tm(tt) && tm(r.time) < tm(tt) + dur
  const occ = (d: string, tt: string) => {
    const real = live.filter((r) => inSlot(r, d, tt)).length
    if (d === TODAY) return Math.min(cap, real)
    const hr = tm(tt) / 60
    let w = (hr >= 9 && hr < 12) || (hr >= 16 && hr < 18.5) ? 0.85 : 0.45
    if (dow(d) === 5) w += 0.25
    if (d > addDays(TODAY, 4)) w *= 0.45
    return Math.min(cap, Math.floor(hash(d + tt) * w * (cap + 0.99)) + real)
  }
  return { occ, cap, dur, list: (d: string, tt: string) => live.filter((r) => inSlot(r, d, tt)), dayCount: (d: string) => live.filter((r) => r.date === d).length }
}

const fill = (o: number, cap: number) => {
  const r = o / cap
  return o === 0 ? 'bg-[#F1F5FA] text-[#7A879C] border-border' : r < 0.5 ? 'bg-[#C9EEF5] text-teal-ink border-[#C9EEF5]' : r < 1 ? 'bg-[#5FC6DC] text-[#05323B] border-[#5FC6DC]' : 'bg-primary text-white border-primary'
}

export function SchedulePage() {
  const { t, L, ic } = useT()
  const hours = useStore((s) => s.hours), blocks = useStore((s) => s.blocks), slotBlocks = useStore((s) => s.slotBlocks)
  const unblockDay = useStore((s) => s.unblockDay)
  const { occ, cap, dur } = useOccupancy()
  const [week, setWeek] = useState(0)
  const [hoursOpen, setHoursOpen] = useState(false)
  const [slot, setSlot] = useState<Cell | null>(null)
  const [blockDay, setBlockDay] = useState<string | null>(null)
  const now = tm(NOW)
  const reasonL = (r: BlockReason) => ({ holiday: t.rHoliday, maintenance: t.rMaintenance, other: t.rOther })[r] ?? t.rOther

  const ws = addDays(TODAY, -dow(TODAY) + week * 7)
  const wd = [0, 1, 2, 3, 4, 5, 6].map((i) => { const d = addDays(ws, i), h = hours[i]; return { d, i, h, slots: h.open ? genSlots(h, dur) : [] } })
  const times = [...new Set(wd.flatMap((x) => x.slots))].sort((a, b) => tm(a) - tm(b))

  return (
    <Page title={t.navSchedule} sub={t.schedSub}>
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

      <Card className="max-h-[calc(100vh-250px)] gap-0 overflow-auto py-0">
        <div className="min-w-[820px] px-3.5 pb-3.5">
          <div className="sticky top-0 z-2 mb-2 grid grid-cols-[58px_repeat(7,minmax(0,1fr))] gap-[5px] border-b border-line bg-white pt-3.5 pb-2">
            <span />
            {wd.map((x) => {
              const isT = x.d === TODAY, bl = blocks[x.d], canBlock = x.h.open && !bl && x.d >= TODAY
              const places = x.slots.length * cap, bk = x.slots.reduce((a, tt) => a + occ(x.d, tt), 0)
              const sum = x.h.open ? bk + '/' + places : t.closed
              return (
                <div key={x.d} className={cn('flex flex-col items-center gap-1 rounded-xl px-1 py-1.5', isT && 'bg-primary')}>
                  <span className={cn('text-[12.5px] font-semibold', isT ? 'text-[#C9DBF5]' : 'text-muted-foreground')}>{DAYS_S[L][x.i]}</span>
                  <span className={cn('font-latin text-lg font-bold', isT ? 'text-white' : 'text-foreground')}>{+x.d.slice(8)}</span>
                  {bl ? (
                    <button type="button" onClick={() => { unblockDay(x.d); notify('toastUnblocked') }} title={t.unblockDay}
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
                  if (!x.h.open) return <span key={x.d} title={t.closed} className="h-[34px] rounded-lg border border-dashed border-border bg-[#F7F8FA]" />
                  if (!x.slots.includes(tt)) return <span key={x.d} className="h-[34px]" />
                  const past = x.d < TODAY || (x.d === TODAY && tm(tt) + dur <= now)
                  const bl = blocks[x.d] || slotBlocks[x.d + '|' + tt]
                  const o = occ(x.d, tt)
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
      <SlotDialog key={slot ? 'slot-' + slot.d + slot.t : 'slot'} cell={slot} onClose={() => setSlot(null)} />
      <BlockDayDialog key={'day-' + (blockDay ?? '')} day={blockDay} onClose={() => setBlockDay(null)} />
    </Page>
  )
}

function HoursDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT()
  const { isCustom, customDur } = useStore()
  const bad = isCustom && !(+customDur >= 10 && +customDur <= 240)
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
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
          <Button disabled={bad} onClick={() => { onClose(); notify('toastSaved') }}>{t.save}</Button>
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

function SlotDialog({ cell, onClose }: { cell: Cell | null; onClose: () => void }) {
  const { t, L } = useT()
  const { occ, cap, dur, list } = useOccupancy()
  const blocks = useStore((s) => s.blocks), slotBlocks = useStore((s) => s.slotBlocks), toggle = useStore((s) => s.toggleSlotBlock)
  const f = useResFormat()
  const act = useResActions()
  const [reason, setReason] = useState<BlockReason>('maintenance')
  const reasonL = (r: BlockReason) => ({ holiday: t.rHoliday, maintenance: t.rMaintenance, other: t.rOther })[r]
  if (!cell) return <Dialog open={false} />
  const { d, t: tt } = cell
  const o = occ(d, tt), lst = list(d, tt), slBl = slotBlocks[d + '|' + tt], canEdit = !blocks[d] && d >= TODAY
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
                <Button variant="outline" onClick={() => { toggle(d, tt, reason); notify('toastUnblocked'); onClose() }} className="text-primary">
                  <Icon name="lock_open" size={18} />{t.unblockSlot}
                </Button>
              </>
            ) : (
              <>
                <ReasonSelect value={reason} onChange={setReason} order={['maintenance', 'holiday', 'other']} />
                <Button onClick={() => { toggle(d, tt, reason); notify('toastBlocked'); onClose() }} className="bg-ink-2 hover:bg-[#28344A]">
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

function BlockDayDialog({ day, onClose }: { day: string | null; onClose: () => void }) {
  const { t, L } = useT()
  const block = useStore((s) => s.blockDay)
  const { dayCount } = useOccupancy()
  const [reason, setReason] = useState<BlockReason>('holiday')
  const n = day ? dayCount(day) : 0
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
          <Button onClick={() => { if (day) block(day, reason); notify('toastBlocked'); onClose() }} className="bg-ink-2 hover:bg-[#28344A]">{t.blockDay}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
