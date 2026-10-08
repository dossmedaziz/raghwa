import { create } from 'zustand'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Icon, SectionLabel, StatusBadge } from '@/components/common'
import { ConfirmDialog } from '@/components/garage-editors'
import { ownerApi } from '@/lib/api'
import { localDateTime, today } from '@/lib/clock'
import { notifyError } from '@/lib/errors'
import { invalidate, useQuery } from '@/lib/query'
import type { Reservation } from '@/lib/types'
import { addDays, fmtDate, fx, money, mt, phone, tm } from '@/lib/format'
import { notify, useT } from '@/lib/i18n'
import { useSlotDuration, useStore } from '@/store'

/** Which reservation the drawer / cancel dialog is showing (shared across pages). */
export const useResUi = create<{ detailId: string | null; cancelId: string | null; open: (id: string | null) => void; askCancel: (id: string | null) => void }>((set) => ({
  detailId: null,
  cancelId: null,
  open: (detailId) => set({ detailId }),
  askCancel: (cancelId) => set({ cancelId }),
}))

/** Display helpers for a reservation in the current language. */
export function useResFormat() {
  const { t, L, ar } = useT()
  const relDay = (d: string) => {
    const td = today()
    return d === td ? t.today : d === addDays(td, 1) ? t.tomorrow : d === addDays(td, -1) ? t.yesterday : fmtDate(d, L, 'dm')
  }
  const line = (x: Reservation['lines'][number]) => (ar ? x.nameAr : x.nameFr)
  return {
    relDay,
    line,
    name: (r: Reservation) => r.customer.name || phone(r.customer.phone),
    chips: (r: Reservation) => r.lines.map(line),
    svcText: (r: Reservation) => r.lines.map(line).join(' · '),
    total: (r: Reservation) => money(r.total, L),
  }
}

/** View / mark done / cancel, with their API calls and toasts. */
export function useResActions() {
  const garageId = useStore((s) => s.activeGarageId)
  const { open, askCancel } = useResUi()
  return {
    view: (id: string) => open(id),
    done: async (id: string) => {
      try {
        await ownerApi.reservations.done(garageId!, id)
        invalidate()
        notify('toastDone')
      } catch (err) {
        notifyError(err)
      }
    },
    cancel: (id: string) => askCancel(id),
  }
}

/** One reservation by id (drawer, cancel dialog). */
function useReservation(id: string | null) {
  const garageId = useStore((s) => s.activeGarageId)
  return useQuery(id && garageId ? `res:${garageId}:${id}` : null, () => ownerApi.reservations.get(garageId!, id!))
}

const DOTS = { booked: '#0E3B8C', rescheduled: '#E8A317', done: '#16A36F', cancelled: '#C2323B' }

export function ReservationDrawer() {
  const { t, L, ar } = useT()
  const { detailId, open } = useResUi()
  const r = useReservation(detailId).data
  const dur = useSlotDuration()
  const f = useResFormat()
  const act = useResActions()
  const hl = { booked: t.hBooked, rescheduled: t.hResched, done: t.hDone, cancelled: t.hCancelled }

  return (
    <Sheet open={!!detailId} onOpenChange={(o) => !o && open(null)}>
      <SheetContent side={ar ? 'left' : 'right'} showCloseButton={false} className="w-full gap-0 bg-white p-0 shadow-[0_0_40px_rgba(11,27,58,.25)] sm:max-w-[460px]">
        {r && (
          <>
            <div className="flex items-center gap-3 border-b border-line px-[22px] py-[18px]">
              <div className="flex flex-1 flex-col gap-0.5">
                <SheetTitle className="text-[17px] font-bold">{t.resDetail}</SheetTitle>
                <SheetDescription className="font-latin text-[12.5px]">{r.ref}</SheetDescription>
              </div>
              <StatusBadge status={r.status} className="px-[11px] py-1 text-[12.5px]" />
              <Button variant="secondary" size="icon" onClick={() => open(null)} aria-label={t.close}><Icon name="close" /></Button>
            </div>
            <div className="flex flex-1 flex-col gap-5 overflow-x-hidden overflow-y-auto px-[22px] py-5">
              <section className="flex flex-col gap-2.5">
                <SectionLabel>{t.customer}</SectionLabel>
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-full bg-cyan-wash text-base font-bold text-teal-ink">{f.name(r).trim().charAt(0)}</span>
                  <div className="flex flex-1 flex-col">
                    <span className="text-[15.5px] font-bold">{f.name(r)}</span>
                    <span dir="ltr" className="text-start font-latin text-[13px] text-ink-2">{phone(r.customer.phone)}</span>
                  </div>
                  <Button variant="outline" size="sm" asChild className="text-[13px] text-primary">
                    <a href={'tel:+216' + r.customer.phone}><Icon name="call" size={18} />{t.call}</a>
                  </Button>
                </div>
              </section>
              <section className="flex flex-col gap-2.5">
                <SectionLabel>{t.car}</SectionLabel>
                {r.car ? (
                  <div className="flex items-center gap-3 rounded-xl bg-muted px-3.5 py-3">
                    <Icon name="directions_car" size={24} className="text-primary" />
                    <span className="flex-1 font-bold">{[r.car.brand, r.car.model].filter(Boolean).join(' ') || '—'}</span>
                    {r.car.plate && (
                      <span className="flex flex-col items-end gap-0.5">
                        <span className="text-[11px] text-muted-foreground">{t.plate}</span>
                        <span dir="ltr" className="rounded-md border-[1.5px] border-foreground bg-white px-2 py-0.5 font-latin text-[13px] font-bold whitespace-nowrap">
                          {r.car.plate}
                        </span>
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="rounded-xl bg-muted px-3.5 py-3 text-[13.5px] text-muted-foreground">{t.noCar}</span>
                )}
              </section>
              <section className="flex flex-col gap-2.5">
                <SectionLabel>{t.dateSlot}</SectionLabel>
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-sky text-primary"><Icon name="event" size={22} /></span>
                  <div className="flex flex-col">
                    <span className="font-bold">{fmtDate(r.date, L, 'long')}</span>
                    <span dir="ltr" className="text-start font-latin text-ink-2 [unicode-bidi:isolate]">{r.time} – {mt(tm(r.time) + dur)}</span>
                  </div>
                </div>
              </section>
              <section className="flex flex-col gap-2">
                <SectionLabel>{t.breakdown}</SectionLabel>
                <div className="overflow-hidden rounded-xl border">
                  {r.lines.map((x, i) => (
                    <div key={i} className="flex justify-between border-b border-line-soft px-3.5 py-[11px]">
                      <span>{f.line(x)}</span>
                      <span className="font-semibold">{money(x.price, L)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between bg-[#F7F9FC] px-3.5 py-3">
                    <span className="font-bold">{t.total}</span>
                    <span className="text-base font-bold text-navy">{f.total(r)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[13.5px] text-ink-2">
                  <Icon name="payments" size={18} className="text-success" />{t.payMethod}: <span className="font-bold">{t.payCash}</span>
                </div>
              </section>
              <section className="flex flex-col gap-2.5">
                <SectionLabel>{t.history}</SectionLabel>
                <ol className="flex flex-col">
                  {r.history.map((h, i) => {
                    const at = localDateTime(h.at)
                    return (
                    <li key={i} className="flex gap-3">
                      <div className="flex w-3.5 flex-col items-center">
                        <span className="mt-1 size-3 shrink-0 rounded-full" style={{ background: DOTS[h.type], boxShadow: `0 0 0 3px ${DOTS[h.type]}33` }} />
                        {i < r.history.length - 1 && <span className="min-h-[18px] w-0.5 flex-1 bg-border" />}
                      </div>
                      <div className="flex flex-col gap-px pb-3.5">
                        <span className="text-[13.5px] font-bold">
                          {hl[h.type]}
                          {h.type === 'cancelled' && ' ' + (h.actor === 'garage' ? t.byGarage : t.byCustomer)}
                          {h.type === 'rescheduled' && h.previousTime &&
                            ' · ' + fx(t.hReschedFrom, { t: (h.previousDate && h.previousDate !== r.date ? f.relDay(h.previousDate) + ' ' : '') + h.previousTime })}
                        </span>
                        <span className="text-[12.5px] text-muted-foreground">{f.relDay(at.date)} · {at.time}</span>
                      </div>
                    </li>
                    )
                  })}
                </ol>
              </section>
            </div>
            {r.status === 'upcoming' && (
              <div className="flex gap-2.5 border-t border-line px-[22px] py-4">
                <Button variant="outline" onClick={() => act.cancel(r.id)} className="h-12 flex-1 border-[#F0C4C7] text-[14.5px] text-destructive hover:bg-[#FFF4F4] hover:text-destructive">
                  {t.cancelRes}
                </Button>
                <Button onClick={() => void act.done(r.id)} className="h-12 flex-[1.3] text-[14.5px]"><Icon name="task_alt" size={19} />{t.markDone}</Button>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

export function CancelReservationDialog() {
  const { t } = useT()
  const { cancelId, askCancel } = useResUi()
  const garageId = useStore((s) => s.activeGarageId)
  const r = useReservation(cancelId).data
  const f = useResFormat()
  const cancel = async () => {
    if (!cancelId) return
    try {
      await ownerApi.reservations.cancel(garageId!, cancelId)
      invalidate()
      notify('toastCancelled')
    } catch (err) {
      notifyError(err)
    }
  }
  return (
    <ConfirmDialog open={!!cancelId} onClose={() => askCancel(null)} icon="event_busy" title={t.cancelTitle}
      body={fx(t.cancelBody, { name: r ? f.name(r) : '' })} yes={t.confirmCancel} no={t.keepRes} onYes={() => void cancel()} />
  )
}
