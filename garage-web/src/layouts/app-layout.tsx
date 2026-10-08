import { useEffect, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { GarageAvatar, Icon, LangSwitch, LogoMark } from '@/components/common'
import { CancelReservationDialog, ReservationDrawer } from '@/components/reservations'
import { cn } from '@/lib/utils'
import { fmtDate, fx, phone } from '@/lib/format'
import { ownerApi } from '@/lib/api'
import { localDateTime, today } from '@/lib/clock'
import { notifyError } from '@/lib/errors'
import { useQuery } from '@/lib/query'
import type { NotificationDto } from '@/lib/types'
import { notify, useT } from '@/lib/i18n'
import { useStore } from '@/store'

const NAV = [
  ['/dashboard', 'space_dashboard', 'navDashboard'],
  ['/reservations', 'event_note', 'navReservations'],
  ['/schedule', 'calendar_month', 'navSchedule'],
  ['/services', 'local_car_wash', 'navServices'],
  ['/profile', 'storefront', 'navProfile'],
  ['/settings', 'settings', 'navSettings'],
] as const

export function AppLayout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-[22px] px-[clamp(16px,2.4vw,32px)] pt-7 pb-12">
          <Outlet />
        </main>
      </div>
      <ReservationDrawer />
      <CancelReservationDialog />
    </div>
  )
}

function useLogout() {
  const nav = useNavigate(), logout = useStore((s) => s.logout)
  return () => { void logout(); nav('/login') }
}

function Sidebar() {
  const { t, ar } = useT()
  const logout = useLogout()
  const item = 'flex w-full items-center justify-center gap-3 rounded-xl px-3 py-[11px] text-[14.5px] font-semibold min-[1180px]:justify-start'
  return (
    <aside className="sticky top-0 z-25 flex h-screen w-[76px] shrink-0 flex-col gap-1.5 bg-navy px-3 py-5 text-white min-[1180px]:w-[248px]">
      <div className="flex items-center justify-center gap-2.5 px-2 pt-1 pb-[22px] min-[1180px]:justify-start">
        <LogoMark size={34} tone="white" dot />
        <div className="hidden flex-col leading-[1.1] min-[1180px]:flex">
          <span className="font-arabic text-xl font-bold">رغوة</span>
          <span className="font-latin text-[10.5px] font-semibold tracking-[.14em] text-aqua-soft">RAGHWA PRO</span>
        </div>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map(([to, icon, key]) => (
          <NavLink key={to} to={to} title={t[key]}
            className={({ isActive }) => cn(item, isActive ? 'bg-[rgba(34,195,214,.18)] text-white' : 'text-[#C9DBF5] hover:bg-white/8')}>
            {({ isActive }) => (
              <>
                <Icon name={icon} size={22} className={isActive ? 'text-aqua' : 'text-[#9FB8E0]'} />
                <span className="hidden min-[1180px]:inline">{t[key]}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="flex-1" />
      <button type="button" onClick={logout} title={t.logout} className={cn(item, 'text-[#C9DBF5] hover:bg-white/8')}>
        <Icon name="logout" size={22} style={{ transform: ar ? 'scaleX(-1)' : undefined }} />
        <span className="hidden min-[1180px]:inline">{t.logout}</span>
      </button>
    </aside>
  )
}

function TopBar() {
  const { t, ar } = useT()
  const nav = useNavigate()
  const logout = useLogout()
  const garage = useStore((s) => s.garage), published = useStore((s) => s.published), owner = useStore((s) => s.owner)
  const garageId = useStore((s) => s.activeGarageId)
  // Polled so new bookings show up without reloading the page.
  const notifs = useQuery(garageId && 'notifs:' + garageId, () => ownerApi.notifications.list(garageId!), { pollMs: 60_000, keepPrevious: true })
  const unread = notifs.data?.unread ?? 0
  const ownerName = owner?.name ?? ''
  const markAllRead = async () => {
    try {
      await ownerApi.notifications.readAll(garageId!)
      notifs.reload()
      notify('toastRead')
    } catch (err) {
      notifyError(err)
    }
  }

  return (
    <header className="sticky top-0 z-20 flex h-[68px] items-center gap-3.5 border-b bg-white px-6">
      <GarageSwitcher>
        <button type="button" className="flex min-w-0 items-center gap-3.5 rounded-xl p-1 pe-2 text-start hover:bg-muted">
          <GarageAvatar name={garage.name} />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="flex items-center gap-1 text-[15px] font-bold">
              <span className="truncate">{garage.name || t.untitledGarage}</span>
              <Icon name="unfold_more" size={18} className="shrink-0 text-muted-foreground" />
            </span>
            <span className={cn('flex items-center gap-1.5 text-[12.5px] font-semibold whitespace-nowrap', published ? 'text-success' : 'text-amber-ink')}>
              <span className={cn('size-[7px] rounded-full', published ? 'bg-success-dot' : 'bg-amber-ink')} />
              {published ? t.visible : t.notVisible}
              {garage.area && <> · <span className="font-medium text-muted-foreground">{garage.area}</span></>}
            </span>
          </span>
        </button>
      </GarageSwitcher>
      <div className="flex-1" />
      <LangSwitch compact />

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon-lg" aria-label={t.notifications} className="relative border border-border text-ink-2">
            <Icon name="notifications" size={22} />
            {unread > 0 && (
              <span className="absolute end-1.5 top-1.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-white bg-[#E0464F] px-1 font-latin text-[10.5px] font-bold text-white">
                {unread}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={8} className="w-[360px] max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-2xl p-0 shadow-pop">
          <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
            <span className="text-[15px] font-bold">{t.notifications}</span>
            {unread > 0 && <button type="button" onClick={() => void markAllRead()} className="text-[13px] font-semibold text-primary">{t.markAllRead}</button>}
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {notifs.data?.items.map((n) => <NotificationRow key={n.id} n={n} />)}
            {notifs.data && !notifs.data.items.length && (
              <div className="px-4 py-8 text-center text-[13.5px] text-muted-foreground">{t.noNotifs}</div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label={ownerName} className="flex items-center gap-2 rounded-xl p-1 hover:bg-muted">
            <span className="flex size-[38px] items-center justify-center rounded-full bg-cyan-wash text-sm font-bold text-teal-ink">{ownerName.trim().charAt(0).toUpperCase()}</span>
            <Icon name="expand_more" className="hidden text-muted-foreground min-[980px]:inline-block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-[250px] rounded-2xl p-2 shadow-pop">
          <div className="flex flex-col gap-0.5 px-3 pt-2.5 pb-3">
            <span className="font-bold">{ownerName}</span>
            <span className="text-[12.5px] text-muted-foreground">{t.owner}</span>
            {owner && <span dir="ltr" className="text-start font-latin text-[12.5px] text-muted-foreground">{phone(owner.phone)}</span>}
          </div>
          <DropdownMenuSeparator className="mb-1.5" />
          <DropdownMenuItem onSelect={() => nav('/garages')} className="gap-2.5 rounded-[10px] px-3 py-2.5 text-sm">
            <Icon name="garage_home" className="text-muted-foreground" />{t.switchGarage}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => nav('/profile')} className="gap-2.5 rounded-[10px] px-3 py-2.5 text-sm">
            <Icon name="storefront" className="text-muted-foreground" />{t.navProfile}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => nav('/settings')} className="gap-2.5 rounded-[10px] px-3 py-2.5 text-sm">
            <Icon name="settings" className="text-muted-foreground" />{t.navSettings}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={logout} className="gap-2.5 rounded-[10px] px-3 py-2.5 text-sm">
            <Icon name="logout" style={{ transform: ar ? 'scaleX(-1)' : undefined }} />{t.logout}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

const NOTIF_ICON = { reservation_created: 'event_available', reservation_cancelled: 'event_busy', reservation_rescheduled: 'update' } as const

function NotificationRow({ n }: { n: NotificationDto }) {
  const { t, L } = useT()
  const day = (d: string) => (d === today() ? t.today : fmtDate(d, L, 'dm'))
  const vars = { name: n.data.customerName ?? t.someone, d: day(n.data.date), t: n.data.time }
  const text = fx({ reservation_created: t.nfCreated, reservation_cancelled: t.nfCancelled, reservation_rescheduled: t.nfRescheduled }[n.type], vars)
  const at = localDateTime(n.createdAt)
  return (
    <div className={cn('flex gap-3 border-b border-line-soft px-4 py-3 last:border-b-0', n.unread ? 'bg-[#F5F9FE]' : 'bg-white')}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-teal-soft text-teal"><Icon name={NOTIF_ICON[n.type]} /></span>
      <div className="flex flex-1 flex-col gap-0.5">
        <span className={cn('text-[13.5px] leading-snug', n.unread ? 'font-bold' : 'font-medium')}>{text}</span>
        <span className="text-xs text-muted-foreground">{day(at.date)} · {at.time}</span>
      </div>
      {n.unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
    </div>
  )
}

/** Dropdown on the garage name: jump straight to another garage, or open the full picker. */
function GarageSwitcher({ children }: { children: ReactNode }) {
  const { t } = useT()
  const nav = useNavigate()
  const garages = useStore((s) => s.garages) ?? []
  const activeGarageId = useStore((s) => s.activeGarageId)
  const loadGarages = useStore((s) => s.loadGarages), selectGarage = useStore((s) => s.selectGarage), createGarage = useStore((s) => s.createGarage)
  useEffect(() => {
    loadGarages().catch(() => undefined)
  }, [loadGarages])
  const pick = (id: string, published: boolean) => {
    if (id !== activeGarageId) selectGarage(id).catch(notifyError)
    nav(published ? '/dashboard' : '/onboarding')
  }
  const add = () => createGarage().then(() => nav('/onboarding'), notifyError)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-[300px] rounded-2xl p-2 shadow-pop">
        <span className="block px-3 pt-2 pb-1.5 text-xs font-bold text-muted-foreground">{t.switchGarage}</span>
        {garages.map((g) => (
          <DropdownMenuItem key={g.id} onSelect={() => pick(g.id, g.status === 'published')} className="gap-3 rounded-[10px] px-3 py-2.5">
            <GarageAvatar name={g.name} size={32} className="rounded-lg text-xs" />
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-sm font-semibold">{g.name || t.untitledGarage}</span>
              <span className="truncate text-xs text-muted-foreground">{g.status === 'published' ? g.area : t.draft}</span>
            </span>
            {g.id === activeGarageId && <Icon name="check" className="text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="my-1.5" />
        <DropdownMenuItem onSelect={() => nav('/garages')} className="gap-2.5 rounded-[10px] px-3 py-2.5 text-sm">
          <Icon name="garage_home" className="text-muted-foreground" />{t.allGarages}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void add()} className="gap-2.5 rounded-[10px] px-3 py-2.5 text-sm">
          <Icon name="add" className="text-muted-foreground" />{t.addGarage}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Page title + optional action, then a skeleton while `loading`, an error with retry, or the page body. */
export function Page({ title, sub, action, loading, error, onRetry, children }: {
  title: string; sub: string; action?: ReactNode; loading?: boolean; error?: unknown; onRetry?: () => void; children: ReactNode
}) {
  const { t } = useT()
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1">
          <h1 className="text-[26px] font-bold text-navy">{title}</h1>
          <p className="text-[14.5px] text-muted-foreground">{sub}</p>
        </div>
        {action}
      </div>
      {error ? (
        <div className="flex flex-col items-center gap-3 rounded-[18px] border bg-white px-5 py-14 text-center">
          <Icon name="cloud_off" size={34} className="text-[#9FB0C8]" />
          <span className="font-semibold">{t.loadError}</span>
          {onRetry && <Button variant="outline" size="sm" onClick={onRetry}>{t.retry}</Button>}
        </div>
      ) : loading ? <PageSkeleton /> : children}
    </>
  )
}

function PageSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-[18px]">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[118px] rounded-[18px] bg-[#E6ECF4]" />)}
      </div>
      <div className="flex flex-col gap-3.5 rounded-[18px] border bg-white p-[22px]">
        <Skeleton className="h-4 w-[30%] rounded-lg bg-[#E6ECF4]" />
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-11 rounded-xl bg-secondary" />)}
      </div>
    </div>
  )
}
