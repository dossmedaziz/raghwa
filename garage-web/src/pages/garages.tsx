import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { GarageAvatar, Icon, LangSwitch, LogoMark } from '@/components/common'
import { CITIES, TODAY } from '@/data/mock'
import { cn } from '@/lib/utils'
import { fx } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { listGarages, useStore, type Workspace } from '@/store'

/** Shown right after login: the owner picks which of their garages to manage. */
export function GaragesPage() {
  const { t, ar } = useT()
  const nav = useNavigate()
  const state = useStore()
  const garages = listGarages(state)
  const { selectGarage, addGarage, logout, activeGarageId } = state

  const open = (id: string, published: boolean) => {
    selectGarage(id)
    nav(published ? '/dashboard' : '/onboarding')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-white">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3.5 px-7 py-3.5">
          <LogoMark size={32} />
          <span className="flex-1 text-base font-bold text-navy">{t.myGarages}</span>
          <LangSwitch />
          <Button variant="ghost" onClick={() => { logout(); nav('/login') }} className="text-ink-2">
            <Icon name="logout" style={{ transform: ar ? 'scaleX(-1)' : undefined }} />
            <span className="hidden sm:inline">{t.logout}</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 animate-rg-in flex-col gap-6 px-7 pt-10 pb-12">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[28px] font-bold text-navy">{t.pickTitle}</h1>
          <p className="text-[15px] text-muted-foreground">{fx(t.pickSub, { n: garages.length })}</p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          {garages.map((g) => (
            <GarageCard key={g.id} g={g} current={g.id === activeGarageId} onOpen={() => open(g.id, g.published)} />
          ))}
          <button type="button" onClick={() => { addGarage(); nav('/onboarding') }}
            className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-[18px] border-2 border-dashed border-input bg-white/60 p-6 text-center transition-colors hover:border-primary hover:bg-accent">
            <span className="flex size-12 items-center justify-center rounded-full bg-cyan-wash text-teal"><Icon name="add" size={28} /></span>
            <span className="text-base font-bold text-navy">{t.addGarage}</span>
            <span className="max-w-[240px] text-[13px] text-muted-foreground">{t.addGarageHint}</span>
          </button>
        </div>
      </main>
    </div>
  )
}

function GarageCard({ g, current, onOpen }: { g: Workspace & { id: string }; current: boolean; onOpen: () => void }) {
  const { t, ar } = useT()
  const live = g.reservations.filter((r) => r.status !== 'cancelled')
  const today = live.filter((r) => r.date === TODAY).length
  const upcoming = g.reservations.filter((r) => r.status === 'upcoming' && r.date >= TODAY).length
  const city = CITIES.find(([fr]) => fr === g.garage.city)
  const place = [g.garage.area, city ? (ar ? city[1] : city[0]) : g.garage.city].filter(Boolean).join(' · ')

  return (
    <div className={cn('flex flex-col gap-4 rounded-[18px] border bg-card p-[22px] shadow-card', current && 'border-primary ring-2 ring-primary/15')}>
      <div className="flex items-start gap-3">
        <GarageAvatar name={g.garage.name} size={46} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[16px] font-bold">{g.garage.name || t.untitledGarage}</span>
          <span className="truncate text-[13px] text-muted-foreground">{place || '—'}</span>
        </div>
        {current && <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-primary">{t.current}</span>}
      </div>

      {g.published ? (
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-success">
          <span className="size-[7px] rounded-full bg-success-dot" />{t.visible}
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-amber-ink">
          <Icon name="edit_note" size={18} />{t.draft}
        </span>
      )}

      {g.published && (
        <div className="grid grid-cols-2 gap-2.5">
          <Stat icon="today" label={fx(t.gTodayRes, { n: today })} />
          <Stat icon="date_range" label={fx(t.gUpcoming, { n: upcoming })} />
        </div>
      )}

      <div className="flex-1" />
      <Button size="lg" variant={g.published ? 'default' : 'outline'} onClick={onOpen} className="w-full text-[15px]">
        {g.published ? t.manage : t.finishSetup}
      </Button>
    </div>
  )
}

function Stat({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-[13px] font-semibold text-ink-2">
      <Icon name={icon} size={18} className="text-teal" />{label}
    </span>
  )
}
