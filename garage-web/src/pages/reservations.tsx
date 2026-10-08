import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Icon, InputGroup, StatusBadge } from '@/components/common'
import { useResActions, useResFormat } from '@/components/reservations'
import { ownerApi } from '@/lib/api'
import { useQuery } from '@/lib/query'
import type { Reservation, Status } from '@/lib/types'
import { cn } from '@/lib/utils'
import { fmtDate, fx, phone } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { useStore } from '@/store'
import { Page } from '@/layouts/app-layout'

type Tab = 'all' | Status
const ALL = '__all'
const PAGE_SIZE = 50
const TABS: Tab[] = ['all', 'upcoming', 'done', 'cancelled']

/** `value`, updated only after it stops changing for `ms` (search box). */
function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return v
}

export function ReservationsPage() {
  const { t, ar } = useT()
  const initialTab = (useLocation().state as { tab?: Tab } | null)?.tab ?? 'all'
  const [tab, setTab] = useState<Tab>(initialTab)
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [svc, setSvc] = useState(ALL)
  const garageId = useStore((s) => s.activeGarageId)!
  const services = useStore((s) => s.services)

  // Searching by phone works with or without spaces ("98 123" → "98123").
  const typed = useDebounced(q.trim(), 300)
  const search = /^[\d\s+]+$/.test(typed) ? typed.replace(/\D/g, '') : typed
  const filters = { q: search || undefined, serviceId: svc === ALL ? undefined : svc, from: from || undefined, to: to || undefined }
  const fkey = JSON.stringify(filters)
  // Back to page 1 whenever the tab or a filter changes.
  const [paging, setPaging] = useState({ for: '', page: 1 })
  const page = paging.for === tab + fkey ? paging.page : 1
  const setPage = (n: number) => setPaging({ for: tab + fkey, page: n })

  const list = useQuery(
    `res-list:${garageId}:${tab}:${fkey}:${page}`,
    () => ownerApi.reservations.list(garageId, {
      ...filters, status: tab === 'all' ? undefined : tab, order: tab === 'upcoming' ? 'asc' : 'desc', page, limit: PAGE_SIZE,
    }),
    { keepPrevious: true },
  )
  const counts = useQuery(
    `res-counts:${garageId}:${fkey}`,
    async () => {
      const totals = await Promise.all(TABS.map((k) => ownerApi.reservations.list(garageId, { ...filters, status: k === 'all' ? undefined : k, limit: 1 })))
      return Object.fromEntries(TABS.map((k, i) => [k, totals[i].meta.total])) as Record<Tab, number>
    },
    { keepPrevious: true },
  )

  const rows = list.data?.items ?? []
  const meta = list.data?.meta
  const hasFilters = !!(q.trim() || svc !== ALL || from || to)
  const clear = () => { setQ(''); setSvc(ALL); setFrom(''); setTo('') }
  const tabs: [Tab, string][] = [['all', t.tabAll], ['upcoming', t.tabUpcoming], ['done', t.tabDone], ['cancelled', t.tabCancelled]]
  const emptyIcon = hasFilters ? 'search_off' : { all: 'inbox', upcoming: 'event_available', done: 'task_alt', cancelled: 'sentiment_satisfied' }[tab]

  return (
    <Page title={t.navReservations} sub={t.resSub} error={list.error} onRetry={list.reload}>
      <Card className="gap-0 py-0">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="border-b border-line px-[18px] pt-4">
          <TabsList variant="line" className="h-auto flex-wrap gap-1.5 p-0">
            {tabs.map(([k, label]) => (
              <TabsTrigger key={k} value={k}
                className="group/t h-auto flex-none gap-2 px-3 pt-2.5 pb-3 text-[14.5px] font-semibold text-muted-foreground after:bottom-[-1px]! after:h-[2.5px]! after:bg-primary! data-active:font-bold data-active:text-navy">
                {label}
                <span className="rounded-full bg-secondary px-2 py-px font-latin text-[11.5px] font-bold text-muted-foreground group-data-active/t:bg-primary group-data-active/t:text-white">
                  {counts.data?.[k] ?? '·'}
                </span>
              </TabsTrigger>
            ))}
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

        {list.loading ? (
          <div aria-busy="true" className="flex flex-col gap-2 p-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-secondary" />)}
          </div>
        ) : rows.length > 0 ? (
          <div className={cn('transition-opacity', list.refreshing && 'opacity-60')}>
            <ResTable rows={rows} />
            <ResCards rows={rows} />
            <div className="flex flex-wrap items-center gap-3 px-[18px] py-3 text-[13px] text-muted-foreground">
              <span className="flex-1">{fx(t.results, { n: meta?.total ?? rows.length })}</span>
              {meta && meta.totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="prev">
                    <Icon name={ar ? 'chevron_right' : 'chevron_left'} size={18} />
                  </Button>
                  <span className="font-latin font-semibold text-ink-2">{page} / {meta.totalPages}</span>
                  <Button variant="outline" size="icon-sm" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)} aria-label="next">
                    <Icon name={ar ? 'chevron_left' : 'chevron_right'} size={18} />
                  </Button>
                </div>
              )}
            </div>
          </div>
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
          <Button variant="ghost" onClick={() => void act.done(r.id)} title={t.markDone} aria-label={t.markDone}
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
            <span dir="ltr" className="text-start font-latin text-[12.5px] whitespace-nowrap text-ink-2">{phone(r.customer.phone)}</span>
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
            <span dir="ltr" className="text-start font-latin text-[12.5px] text-muted-foreground">{phone(r.customer.phone)}</span>
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
