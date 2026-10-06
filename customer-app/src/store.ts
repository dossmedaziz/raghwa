import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { CARS0, RES0, USER_PHONE, type Car, type Lang, type Reservation } from '@/data/mock'
import type { SKey } from '@/data/strings'

/** Colour theme choice; 'system' follows the phone setting. */
export type Appearance = 'system' | 'light' | 'dark'

export interface Filters { open: boolean; dist: number; rating: number; price: number; svc: string[] }
export const F0: Filters = { open: false, dist: 0, rating: 0, price: 0, svc: [] }

/** Booking (or rescheduling) in progress. `m` = slot start in minutes, null = not picked. */
export interface Draft { di: number; m: number | null; svc: string[]; car: string }

interface State {
  lang: Lang
  appearance: Appearance
  onboarded: boolean
  authed: boolean
  /** Location permission refused → map shows the banner and centres on Tunis. */
  denied: boolean
  phone: string
  cars: Car[]
  res: Reservation[]
  flt: Filters
  notif: { h1: boolean; d1: boolean }
  // Booking flow (not persisted)
  mode: 'book' | 'resched'
  gid: string
  bk: Draft
  rs: { di: number; m: number | null }
  rid: string
  lastRef: string
}

interface Actions {
  setLang: (l: Lang) => void
  setAppearance: (a: Appearance) => void
  finishOnboarding: () => void
  login: () => void
  logout: () => void
  setDenied: (v: boolean) => void
  setPhone: (p: string) => void
  setFilters: (f: Filters) => void
  toggleNotif: (k: 'h1' | 'd1') => void
  startBooking: (gid: string, bk?: Partial<Draft>) => void
  setBk: (p: Partial<Draft>) => void
  startResched: (ref: string) => void
  setRs: (p: Partial<State['rs']>) => void
  confirmBooking: () => string
  confirmResched: () => void
  cancelRes: (ref: string) => void
  rateRes: (ref: string, stars: number) => void
  saveCar: (id: string | null, c: Omit<Car, 'id' | 'def'>) => void
  deleteCar: (id: string) => void
}

const emptyDraft: Draft = { di: 0, m: null, svc: [], car: 'polo' }

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      lang: 'ar',
      appearance: 'system',
      onboarded: false,
      authed: false,
      denied: false,
      phone: USER_PHONE,
      cars: CARS0.map((c) => ({ ...c })),
      res: RES0.map((r) => ({ ...r })),
      flt: { ...F0 },
      notif: { h1: true, d1: false },
      mode: 'book',
      gid: 'marsa',
      bk: { ...emptyDraft },
      rs: { di: 6, m: null },
      rid: 'RG-24655',
      lastRef: 'RG-24817',

      setLang: (lang) => set({ lang }),
      setAppearance: (appearance) => set({ appearance }),
      finishOnboarding: () => set({ onboarded: true }),
      login: () => set({ authed: true }),
      logout: () => set({ authed: false }),
      setDenied: (denied) => set({ denied }),
      setPhone: (phone) => set({ phone }),
      setFilters: (flt) => set({ flt }),
      toggleNotif: (k) => set((s) => ({ notif: { ...s.notif, [k]: !s.notif[k] } })),
      startBooking: (gid, bk) => set({ mode: 'book', gid, bk: { ...emptyDraft, car: get().cars[0]?.id ?? 'polo', ...bk } }),
      setBk: (p) => set((s) => ({ bk: { ...s.bk, ...p } })),
      startResched: (ref) => {
        const r = get().res.find((x) => x.ref === ref)
        // The prototype opens the picker on another day than the current booking.
        set({ mode: 'resched', rid: ref, rs: { di: r ? (r.di === 5 ? 6 : Math.max(1, r.di)) : 1, m: null } })
      },
      setRs: (p) => set((s) => ({ rs: { ...s.rs, ...p } })),
      confirmBooking: () => {
        const s = get()
        const ref = 'RG-' + (24817 + s.res.filter((r) => r.ref.startsWith('RG-248')).length)
        set({ lastRef: ref, res: [{ ref, g: s.gid, di: s.bk.di, m: s.bk.m ?? 0, svc: s.bk.svc, st: 'up', car: s.bk.car }, ...s.res] })
        return ref
      },
      confirmResched: () =>
        set((s) => ({ mode: 'book', res: s.res.map((r) => (r.ref === s.rid ? { ...r, di: s.rs.di, m: s.rs.m ?? r.m } : r)) })),
      cancelRes: (ref) => set((s) => ({ res: s.res.map((r) => (r.ref === ref ? { ...r, st: 'cancelled' } : r)) })),
      rateRes: (ref, stars) => set((s) => ({ res: s.res.map((r) => (r.ref === ref ? { ...r, rating: stars } : r)) })),
      saveCar: (id, c) =>
        set((s) => ({
          cars: id ? s.cars.map((x) => (x.id === id ? { ...x, ...c } : x)) : [...s.cars, { id: 'c' + Date.now(), ...c, def: false }],
        })),
      deleteCar: (id) => set((s) => ({ cars: s.cars.filter((x) => x.id !== id) })),
    }),
    {
      name: 'raghwa-customer',
      storage: createJSONStorage(() => AsyncStorage),
      // Only the language, theme and onboarding/session flags survive a restart; demo data resets.
      partialize: (s) => ({ lang: s.lang, appearance: s.appearance, onboarded: s.onboarded, authed: s.authed }),
    },
  ),
)

/** Toasts are UI-only, kept outside the persisted store. */
export const useToast = create<{ key: SKey | null; show: (k: SKey) => void }>((set) => {
  let timer: ReturnType<typeof setTimeout> | undefined
  return {
    key: null,
    show: (key) => {
      clearTimeout(timer)
      set({ key })
      timer = setTimeout(() => set({ key: null }), 2600)
    },
  }
})
export const toast = (k: SKey) => useToast.getState().show(k)
