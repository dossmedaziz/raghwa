import { Link } from 'react-router'
import { Card } from '@/components/ui/card'
import { Icon, IconTile } from '@/components/common'
import { resTotal, useResActions, useResFormat } from '@/components/reservations'
import { CHART, KPI, NOW, OWNER, TODAY } from '@/data/mock'
import { MONTHS_L } from '@/data/i18n-strings'
import { cn } from '@/lib/utils'
import { addDays, dow, fmtDate, fx, genSlots, money, tm } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { useSlotDuration, useStore } from '@/store'
import { Page } from '@/layouts/app-layout'

export function DashboardPage() {
  const { t, L, ar } = useT()
  const reservations = useStore((s) => s.reservations)
  const hours = useStore((s) => s.hours), cap = useStore((s) => s.capacity)
  const blocks = useStore((s) => s.blocks), slotBlocks = useStore((s) => s.slotBlocks)
  const dur = useSlotDuration()
  const f = useResFormat()
  const act = useResActions()
  const now = tm(NOW)

  const live = reservations.filter((r) => r.status !== 'cancelled')
  const todayRes = live.filter((r) => r.date === TODAY)
  const weekEnd = addDays(TODAY, 6 - dow(TODAY))
  const upWeek = reservations.filter((r) => r.status === 'upcoming' && r.date >= TODAY && r.date <= weekEnd).length
  const base = reservations.length ? 1 : 0
  const monthDone = base * KPI.doneBase + reservations.filter((r) => r.status === 'done' && r.date.startsWith('2026-10')).length
  const revenue = base * KPI.revBase + live.filter((r) => r.date.startsWith('2026-10')).reduce((a, r) => a + resTotal(r), 0)

  const kpis = [
    { icon: 'today', label: t.kpiToday, value: todayRes.length, sub: fx(t.kpiTodaySub, { n: todayRes.filter((r) => r.status === 'upcoming').length }), tile: 'bg-blue-wash text-primary' },
    { icon: 'date_range', label: t.kpiWeek, value: upWeek, sub: t.kpiWeekSub, tile: 'bg-cyan-wash text-teal' },
    { icon: 'task_alt', label: t.kpiMonth, value: monthDone, sub: MONTHS_L[L][9] + ' 2026', tile: 'bg-success-soft text-success' },
    { icon: 'payments', label: t.kpiRevenue, value: money(revenue, L), sub: t.kpiRevenueSub, tile: 'bg-amber-soft text-amber-ink' },
  ]

  // Today's timeline
  const todayHours = hours[dow(TODAY)]
  const timeline = genSlots(todayHours, dur).map((time) => {
    const start = tm(time), end = start + dur
    const n = todayRes.filter((r) => tm(r.time) >= start && tm(r.time) < end).length
    const blocked = !!(blocks[TODAY] || slotBlocks[TODAY + '|' + time])
    const full = n >= cap
    return { time, n, blocked, full, isNow: now >= start && now < end, past: end <= now }
  })

  const booked = timeline.reduce((a, s) => a + Math.min(s.n, cap), 0), places = timeline.length * cap

  const nextRes = reservations
    .filter((r) => r.status === 'upcoming')
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 5)

  const chart = CHART.map(([d, v]) => [d, v ?? todayRes.length] as const)
  const cMax = Math.max(1, ...chart.map((x) => x[1]))

  return (
    <Page title={fx(t.hello, { name: ar ? OWNER.firstAr : OWNER.firstFr })} sub={fmtDate(TODAY, L, 'long')}>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        {kpis.map((k) => (
          <Card key={k.icon} className="gap-2.5 px-5 py-[18px]">
            <div className="flex flex-col items-start gap-2.5">
              <IconTile name={k.icon} className={k.tile} />
              <span className="text-[13.5px] leading-tight font-semibold text-ink-2">{k.label}</span>
            </div>
            <span className="text-[30px] leading-[1.1] font-bold text-navy tabular-nums">{k.value}</span>
            <span className="text-[12.5px] text-muted-foreground">{k.sub}</span>
          </Card>
        ))}
      </div>

      <Card className="gap-4 px-[22px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[17px] font-bold">{t.todaySlots}</span>
            <span className="text-[13px] text-muted-foreground">{fx(t.todaySum, { n: booked, m: places })}</span>
          </div>
          <div className="flex flex-wrap gap-3.5 text-[12.5px] text-ink-2">
            <Legend swatch="border-[1.5px] border-input bg-white" label={t.lgFree} />
            <Legend swatch="bg-aqua" label={t.booked} />
            <Legend swatch="bg-primary" label={t.lgFull} />
            <Legend swatch="bg-stripes" label={t.lgBlocked} />
          </div>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
          {timeline.map((s) => {
            const dark = s.full && !s.blocked
            return (
              <div key={s.time}
                className={cn('flex flex-col gap-[7px] rounded-xl px-2.5 pt-2.5 pb-[9px]',
                  s.blocked ? 'bg-stripes border border-border' : dark ? 'border border-primary bg-primary text-white' : 'border border-border bg-white',
                  s.isNow && 'border-2 border-aqua', s.past && 'opacity-55')}>
                <div className="flex items-center justify-between gap-1">
                  <span className="font-latin text-[13.5px] font-bold">{s.time}</span>
                  {s.isNow && <span className="rounded-md bg-aqua px-1.5 py-px text-[10.5px] font-bold text-[#05323B]">{t.now}</span>}
                </div>
                <div dir="ltr" className="flex gap-[3px]">
                  {Array.from({ length: Math.min(cap, 8) }, (_, i) => (
                    <span key={i} className={cn('h-1.5 flex-1 rounded-[3px]', i < s.n ? 'bg-aqua' : dark ? 'bg-white/28' : 'bg-border')} />
                  ))}
                </div>
                <span className="text-xs font-bold">{s.blocked ? t.blockedShort : s.full ? t.full : s.n + '/' + cap}</span>
              </div>
            )
          })}
        </div>
      </Card>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] gap-4">
        <Card className="gap-3 px-[22px]">
          <div className="flex items-center justify-between">
            <span className="text-[17px] font-bold">{t.nextRes}</span>
            <Link to="/reservations" state={{ tab: 'upcoming' }} className="text-[13.5px] font-semibold whitespace-nowrap text-primary hover:text-teal hover:underline">{t.seeAll}</Link>
          </div>
          {nextRes.length ? (
            <div className="flex flex-col">
              {nextRes.map((r) => (
                <button key={r.id} type="button" onClick={() => act.view(r.id)}
                  className="flex w-full items-center gap-3.5 rounded-[10px] border-b border-line px-2 py-3 text-start hover:bg-[#F7F9FC]">
                  <div className="flex w-[62px] shrink-0 flex-col items-center gap-px rounded-[10px] bg-[#F0F5FC] px-1 py-1.5">
                    <span className="font-latin text-[15px] font-bold text-primary">{r.time}</span>
                    <span className="text-[11px] font-semibold text-muted-foreground">{f.relDay(r.date)}</span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[14.5px] font-bold">{f.name(r)}</span>
                    <span className="truncate text-[12.5px] text-muted-foreground">{f.svcText(r)}</span>
                  </div>
                  <span className="font-bold whitespace-nowrap text-navy">{f.total(r)}</span>
                  <Icon name={ar ? 'chevron_left' : 'chevron_right'} className="text-subtle" />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2.5 px-3 py-9 text-center text-muted-foreground">
              <Icon name="event_available" size={34} className="text-[#9FB0C8]" />
              <span>{t.noUpcoming}</span>
            </div>
          )}
        </Card>

        <Card className="gap-3.5 px-[22px]">
          <div className="flex flex-col gap-0.5">
            <span className="text-[17px] font-bold">{t.chartTitle}</span>
            <span className="text-[13px] text-muted-foreground">{fx(t.chartSum, { n: chart.reduce((a, x) => a + x[1], 0) })}</span>
          </div>
          <div className="flex min-h-[220px] flex-1 items-stretch gap-2.5 border-b pt-2">
            {chart.map(([d, v]) => {
              const isT = d === TODAY
              return (
                <div key={d} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                  <span className={cn('font-latin text-[12.5px] font-bold', v === 0 ? 'text-subtle' : 'text-navy')}>{v === 0 ? t.closedShort : v}</span>
                  <div className={cn('min-h-[3px] w-full max-w-11 rounded-t-lg rounded-b-[3px] transition-[height] duration-400', isT ? 'bg-aqua' : v === 0 ? 'bg-border' : 'bg-primary')}
                    style={{ height: Math.round((v / cMax) * 100) + '%' }} />
                </div>
              )
            })}
          </div>
          <div className="-mt-1.5 flex gap-2.5">
            {chart.map(([d]) => (
              <span key={d} className={cn('min-w-0 flex-1 text-center text-xs', d === TODAY ? 'font-bold text-teal' : 'font-medium text-muted-foreground')}>
                {d === TODAY ? t.today : fmtDate(d, L, 'dshort')}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </Page>
  )
}

export function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span className={cn('size-3 rounded', swatch)} />
      {label}
    </span>
  )
}
