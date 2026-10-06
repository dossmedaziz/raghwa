import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, useOutletContext } from 'react-router'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Icon, LangSwitch, LogoMark } from '@/components/common'
import { CancelReservationDialog, ReservationDrawer } from '@/components/reservations'
import { OWNER } from '@/data/mock'
import { cn } from '@/lib/utils'
import { phone } from '@/lib/format'
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
  // Brief skeleton on every page change, as in the prototype: loading until the timer marks this path as shown.
  const [shown, setShown] = useState<string | null>(null)
  const loading = shown !== pathname
  useEffect(() => {
    window.scrollTo(0, 0)
    const id = setTimeout(() => setShown(pathname), 600)
    return () => clearTimeout(id)
  }, [pathname])

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-[22px] px-[clamp(16px,2.4vw,32px)] pt-7 pb-12">
          <Outlet context={{ loading }} />
        </main>
      </div>
      <ReservationDrawer />
      <CancelReservationDialog />
    </div>
  )
}

function useLogout() {
  const nav = useNavigate(), logout = useStore((s) => s.logout)
  return () => { logout(); nav('/login') }
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
  const garage = useStore((s) => s.garage), ownerPhone = useStore((s) => s.ownerPhone)
  const notifs = useStore((s) => s.notifs), markAllRead = useStore((s) => s.markAllRead)
  const unread = notifs.filter((n) => n.unread).length
  const ownerName = ar ? OWNER.ar : OWNER.fr

  return (
    <header className="sticky top-0 z-20 flex h-[68px] items-center gap-3.5 border-b bg-white px-6">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary font-latin text-sm font-extrabold text-white">RW</span>
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-[15px] font-bold">{garage.name}</span>
        <span className="flex items-center gap-1.5 text-[12.5px] font-semibold whitespace-nowrap text-success">
          <span className="size-[7px] rounded-full bg-success-dot" />
          {t.visible} · <span className="font-medium text-muted-foreground">{garage.area}</span>
        </span>
      </div>
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
            <button type="button" onClick={() => { markAllRead(); notify('toastRead') }} className="text-[13px] font-semibold text-primary">{t.markAllRead}</button>
          </div>
          {notifs.map((n, i) => (
            <div key={i} className={cn('flex gap-3 border-b border-line-soft px-4 py-3 last:border-b-0', n.unread ? 'bg-[#F5F9FE]' : 'bg-white')}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-teal-soft text-teal"><Icon name={n.icon} /></span>
              <div className="flex flex-1 flex-col gap-0.5">
                <span className={cn('text-[13.5px] leading-snug', n.unread ? 'font-bold' : 'font-medium')}>{ar ? n.ar : n.fr}</span>
                <span className="text-xs text-muted-foreground">{ar ? n.tAr : n.tFr}</span>
              </div>
              {n.unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
            </div>
          ))}
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label={ownerName} className="flex items-center gap-2 rounded-xl p-1 hover:bg-muted">
            <span className="flex size-[38px] items-center justify-center rounded-full bg-cyan-wash text-sm font-bold text-teal-ink">{ar ? 'ك' : 'K'}</span>
            <Icon name="expand_more" className="hidden text-muted-foreground min-[980px]:inline-block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-[250px] rounded-2xl p-2 shadow-pop">
          <div className="flex flex-col gap-0.5 px-3 pt-2.5 pb-3">
            <span className="font-bold">{ownerName}</span>
            <span className="text-[12.5px] text-muted-foreground">{t.owner}</span>
            <span dir="ltr" className="text-start font-latin text-[12.5px] text-muted-foreground">{phone(ownerPhone)}</span>
          </div>
          <DropdownMenuSeparator className="mb-1.5" />
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

/** Page title + optional action, then a skeleton or the page body. */
export function Page({ title, sub, action, children }: { title: string; sub: string; action?: ReactNode; children: ReactNode }) {
  const { loading } = useOutletContext<{ loading: boolean }>()
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1">
          <h1 className="text-[26px] font-bold text-navy">{title}</h1>
          <p className="text-[14.5px] text-muted-foreground">{sub}</p>
        </div>
        {action}
      </div>
      {loading ? <PageSkeleton /> : children}
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
