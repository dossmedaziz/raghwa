import { useState } from 'react'
import { useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Icon, InputGroup, StatusBadge } from '@/components/common'
import { useResActions, useResFormat } from '@/components/reservations'
import type { Reservation, Status } from '@/data/mock'
import { cn } from '@/lib/utils'
import { fmtDate, fx, phone } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { useStore } from '@/store'
import { Page } from '@/layouts/app-layout'

type Tab = 'all' | Status
const ALL = '__all'

export function ReservationsPage() {
  const { t, ar } = useT()
  const initialTab = (useLocation().state as { tab?: Tab } | null)?.tab ?? 'all'
  const [tab, setTab] = useState<Tab>(initialTab)
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [svc, setSvc] = useState(ALL)
  const reservations = useStore((s) => s.reservations)
  const services = useStore((s) => s.services)

  const query = q.trim().toLowerCase(), qd = query.replace(/\D/g, '')
  const hasFilters = !!(query || svc !== ALL || from || to)
  const base = reservations.filter(
    (r) =>
      (svc === ALL || r.lines.some((x) => x.id === svc)) &&
      (!from || r.date >= from) &&
      (!to || r.date <= to) &&
      (!query || r.nameAr.includes(q.trim()) || r.nameFr.toLowerCase().includes(query) || (qd.length >= 2 && r.phone.includes(qd)) || r.ref.toLowerCase().includes(query)),
  )
  const rows = base
    .filter((r) => tab === 'all' || r.status === tab)
    .sort((a, b) => {
      const ka = a.date + a.time, kb = b.date + b.time
      return tab === 'upcoming' ? ka.localeCompare(kb) : kb.localeCompare(ka)
    })
  const clear = () => { setQ(''); setSvc(ALL); setFrom(''); setTo('') }
  const tabs: [Tab, string][] = [['all', t.tabAll], ['upcoming', t.tabUpcoming], ['done', t.tabDone], ['cancelled', t.tabCancelled]]
  const emptyIcon = hasFilters ? 'search_off' : { all: 'inbox', upcoming: 'event_available', done: 'task_alt', cancelled: 'sentiment_satisfied' }[tab]

  return (
    <Page title={t.navReservations} sub={t.resSub}>
      <Card className="gap-0 py-0">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="border-b border-line px-[18px] pt-4">
          <TabsList variant="line" className="h-auto flex-wrap gap-1.5 p-0">
            {tabs.map(([k, label]) => {
              const count = base.filter((r) => k === 'all' || r.status === k).length
              return (
                <TabsTrigger key={k} value={k}
                  className="group/t h-auto flex-none gap-2 px-3 pt-2.5 pb-3 text-[14.5px] font-semibold text-muted-foreground after:bottom-[-1px]! after:h-[2.5px]! after:bg-primary! data-active:font-bold data-active:text-navy">
                  {label}
                  <span className="rounded-full bg-secondary px-2 py-px font-latin text-[11.5px] font-bold text-muted-foreground group-data-active/t:bg-primary group-data-active/t:text-white">
                    {count}
                  </span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2.5 border-b border-line px-[18px] py-3.5">
          <InputGroup className="flex-[1_1_260px] items-center gap-2 px-3">
            <Icon name="search" className="text-subtle" />
            <Input type="search" aria-label={t.search} placeholder={t.search} value={q} onChange={(e) => setQ(e.target.value)}
              className="h-10 border-0 bg-transparent px-0 text-sm focus-visible:border-0 focus-visible:ring-0" />
          </InputGroup>
          <InputGroup className="items-center gap-1.5 px-2.5">
            <Icon name="date_range" size={19} className="text-subtle" />
            <span className="text-[12.5px] text-muted-foreground">{t.dateFrom}</span>
            <input type="date" aria-label={t.dateFrom} value={from} onChange={(e) => setFrom(e.target.value)} className="bg-transparent px-0.5 py-[9px] font-latin text-[13px] outline-none" />
            <span className="text-[12.5px] whitespace-nowrap text-muted-foreground">{t.dateTo}</span>
            <input type="date" aria-label={t.dateTo} value={to} onChange={(e) => setTo(e.target.value)} className="bg-transparent px-0.5 py-[9px] font-latin text-[13px] outline-none" />
          </InputGroup>
          <Select value={svc} onValueChange={setSvc}>
            <SelectTrigger aria-label={t.allServices} className="min-w-[170px] data-[size=default]:h-[42px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t.allServices}</SelectItem>
              {services.map((x) => <SelectItem key={x.id} value={x.id}>{ar ? x.nameAr : x.nameFr}</SelectItem>)}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clear} className="text-primary hover:text-primary">
              <Icon name="filter_alt_off" size={18} />{t.clearFilters}
            </Button>
          )}
        </div>

        {rows.length > 0 ? (
          <>
            <ResTable rows={rows} />
            <ResCards rows={rows} />
            <div className="px-[18px] py-3 text-[13px] text-muted-foreground">{fx(t.results, { n: rows.length })}</div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
            <span className="flex size-[72px] items-center justify-center rounded-full bg-sky text-primary"><Icon name={emptyIcon} size={34} /></span>
            <span className="text-[17px] font-bold">{hasFilters ? t.emptyFiltered : t[`empty_${tab}`]}</span>
            <span className="max-w-[360px] text-muted-foreground">{hasFilters ? t.emptyFilteredHint : t[`emptyHint_${tab}`]}</span>
            {hasFilters && <Button variant="outline" size="sm" onClick={clear} className="mt-1 text-primary">{t.clearFilters}</Button>}
          </div>
        )}
      </Card>
    </Page>
  )
}

const COLS = 'grid-cols-[92px_minmax(140px,1.3fr)_128px_108px_56px_minmax(150px,1.5fr)_80px_76px_96px_108px]'

function Chips({ items }: { items: string[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {items.map((c, i) => <span key={i} className="rounded-full bg-sky px-[9px] py-0.5 text-xs font-semibold whitespace-nowrap text-sky-ink">{c}</span>)}
    </span>
  )
}

function RowActions({ r, boxed }: { r: Reservation; boxed?: boolean }) {
  const { t } = useT()
  const act = useResActions()
  const base = boxed ? 'size-9 rounded-[10px] border' : 'size-8 rounded-[9px]'
  return (
    <>
      <Button variant="ghost" onClick={() => act.view(r.id)} title={t.viewDetails} aria-label={t.viewDetails}
        className={cn(base, 'p-0 text-ink-2', boxed && 'border-border bg-white')}><Icon name="visibility" size={19} /></Button>
      {r.status === 'upcoming' && (
        <>
          <Button variant="ghost" onClick={() => act.done(r.id)} title={t.markDone} aria-label={t.markDone}
            className={cn(base, 'p-0 text-success hover:bg-success-soft hover:text-success', boxed && 'border-[#CDEBDD] bg-[#F2FBF7]')}><Icon name="task_alt" size={19} /></Button>
          <Button variant="ghost" onClick={() => act.cancel(r.id)} title={t.cancelRes} aria-label={t.cancelRes}
            className={cn(base, 'p-0 text-destructive hover:bg-danger-soft hover:text-destructive', boxed && 'border-[#F5D3D5] bg-[#FFF6F6]')}><Icon name="event_busy" size={19} /></Button>
        </>
      )}
    </>
  )
}

/** Wide screens (≥1280px). */
function ResTable({ rows }: { rows: Reservation[] }) {
  const { t, L } = useT()
  const f = useResFormat()
  const act = useResActions()
  return (
    <div className="hidden overflow-x-auto min-[1280px]:block">
      <div className="min-w-[1060px]" role="table">
        <div role="row" className={cn('grid gap-3 border-b border-line bg-[#F7F9FC] px-[18px] py-2.5 text-xs font-bold text-muted-foreground', COLS)}>
          {[t.colRef, t.colCustomer, t.colPhone, t.colDate, t.colSlot, t.colServices, t.colTotal, t.colPayment, t.colStatus, ''].map((h, i) => (
            <span key={i} role="columnheader">{h}</span>
          ))}
        </div>
        {rows.map((r) => (
          <div key={r.id} role="row" onClick={() => act.view(r.id)}
            className={cn('grid cursor-pointer items-center gap-3 border-b border-line-soft px-[18px] py-3 text-[13.5px] hover:bg-[#F7FAFD]', COLS)}>
            <span className="font-latin text-[12.5px] font-semibold whitespace-nowrap text-ink-2">{r.ref}</span>
            <span className="font-bold">{f.name(r)}</span>
            <span dir="ltr" className="text-start font-latin text-[12.5px] whitespace-nowrap text-ink-2">{phone(r.phone)}</span>
            <span className="flex flex-col leading-tight">
              <span className="font-semibold">{f.relDay(r.date)}</span>
              <span className="text-xs text-muted-foreground">{fmtDate(r.date, L, 'day')}</span>
            </span>
            <span className="font-latin font-bold">{r.time}</span>
            <Chips items={f.chips(r)} />
            <span className="font-bold whitespace-nowrap text-navy">{f.total(r)}</span>
            <span className="flex items-center gap-1 text-[12.5px] text-ink-2"><Icon name="payments" size={16} className="text-muted-foreground" />{t.cash}</span>
            <span><StatusBadge status={r.status} /></span>
            <span onClick={(e) => e.stopPropagation()} className="flex justify-end gap-0.5"><RowActions r={r} /></span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Narrow screens (<1280px). */
function ResCards({ rows }: { rows: Reservation[] }) {
  const { t } = useT()
  const f = useResFormat()
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-3 p-4 min-[1280px]:hidden">
      {rows.map((r) => (
        <div key={r.id} className="flex flex-col gap-2.5 rounded-[14px] border bg-white p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-latin text-[12.5px] font-semibold whitespace-nowrap text-muted-foreground">{r.ref}</span>
            <StatusBadge status={r.status} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[15.5px] font-bold">{f.name(r)}</span>
            <span dir="ltr" className="text-start font-latin text-[12.5px] text-muted-foreground">{phone(r.phone)}</span>
          </div>
          <div className="flex items-center gap-2 text-[13.5px] text-ink-2">
            <Icon name="schedule" size={18} className="text-muted-foreground" />
            <span className="font-semibold whitespace-nowrap">{f.relDay(r.date)}</span><span>·</span><span className="font-latin font-bold">{r.time}</span>
          </div>
          <Chips items={f.chips(r)} />
          <div className="flex items-center gap-2 border-t border-line pt-2.5">
            <span className="font-bold text-navy">{f.total(r)}</span>
            <span className="text-[12.5px] text-muted-foreground">· {t.cash}</span>
            <span className="flex-1" />
            <RowActions r={r} boxed />
          </div>
        </div>
      ))}
    </div>
  )
}
