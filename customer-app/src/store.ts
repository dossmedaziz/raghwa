import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Lang } from '@/data/constants'
import type { SKey } from '@/data/strings'
import { clearCache } from '@/lib/query'
import type { CustomerDto, Reservation, TokenPair } from '@/lib/types'

/** Colour theme choice; 'system' follows the phone setting. */
export type Appearance = 'system' | 'light' | 'dark'

/** `dist` in km and `price` in TND; 0 = any. */
export interface Filters { dist: number; price: number }
export const F0: Filters = { dist: 0, price: 0 }

/**
 * A car saved on this phone (the API has no car book: the car is sent with each booking).
 * Tunisian plate: series `ps` · تونس · number `pn`.
 */
export interface Car { id: string; b: string; m: string; ps: string; pn: string; def: boolean }

/** Booking in progress. `date` null = first open day; `time` null = not picked; `car` = Car id. */
export interface Draft { date: string | null; time: string | null; svc: string[]; car: string | null }

type Tokens = Pick<TokenPair, 'accessToken' | 'refreshToken'>

interface State {
  lang: Lang
  appearance: Appearance
  onboarded: boolean
  /** Location permission refused → map shows the banner and centres on Tunis. */
  denied: boolean
  /** Session; null = signed out. */
  tokens: Tokens | null
  customer: CustomerDto | null
  cars: Car[]
  flt: Filters
  notif: { h1: boolean; d1: boolean }
  // Booking flow (not persisted)
  mode: 'book' | 'resched'
  gid: string
  bk: Draft
  /** Reschedule: the reservation being moved and the new slot. */
  rr: Reservation | null
  rs: { date: string | null; time: string | null }
  /** Reservation just booked, for the success screen. */
  last: Reservation | null
}

interface Actions {
  setLang: (l: Lang) => void
  setAppearance: (a: Appearance) => void
  finishOnboarding: () => void
  signIn: (tokens: Tokens, customer: CustomerDto) => void
  setTokens: (t: Tokens) => void
  setCustomer: (c: CustomerDto) => void
  signOut: () => void
  setDenied: (v: boolean) => void
  setFilters: (f: Filters) => void
  toggleNotif: (k: 'h1' | 'd1') => void
  startBooking: (gid: string, bk?: Partial<Draft>) => void
  setBk: (p: Partial<Draft>) => void
  startResched: (r: Reservation) => void
  setRs: (p: Partial<State['rs']>) => void
  setLast: (r: Reservation) => void
  saveCar: (id: string | null, c: Omit<Car, 'id' | 'def'>) => void
  deleteCar: (id: string) => void
}

const emptyDraft: Draft = { date: null, time: null, svc: [], car: null }
const defaultCar = (cars: Car[]) => (cars.find((c) => c.def) ?? cars[0])?.id ?? null

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      lang: 'ar',
      appearance: 'system',
      onboarded: false,
      denied: false,
      tokens: null,
      customer: null,
      cars: [],
      flt: { ...F0 },
      notif: { h1: true, d1: false },
      mode: 'book',
      gid: '',
      bk: { ...emptyDraft },
      rr: null,
      rs: { date: null, time: null },
      last: null,

      setLang: (lang) => set({ lang }),
      setAppearance: (appearance) => set({ appearance }),
      finishOnboarding: () => set({ onboarded: true }),
      signIn: (tokens, customer) => set({ tokens: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }, customer }),
      setTokens: (t) => set({ tokens: { accessToken: t.accessToken, refreshToken: t.refreshToken } }),
      setCustomer: (customer) => set({ customer }),
      signOut: () => {
        clearCache()
        set({ tokens: null, customer: null, rr: null, last: null })
      },
      setDenied: (denied) => set({ denied }),
      setFilters: (flt) => set({ flt }),
      toggleNotif: (k) => set((s) => ({ notif: { ...s.notif, [k]: !s.notif[k] } })),
      startBooking: (gid, bk) => set({ mode: 'book', gid, bk: { ...emptyDraft, car: defaultCar(get().cars), ...bk } }),
      setBk: (p) => set((s) => ({ bk: { ...s.bk, ...p } })),
      startResched: (r) => set({ mode: 'resched', gid: r.garage.id, rr: r, rs: { date: r.date, time: null } }),
      setRs: (p) => set((s) => ({ rs: { ...s.rs, ...p } })),
      setLast: (last) => set({ last, mode: 'book' }),
      saveCar: (id, c) =>
        set((s) => ({
          cars: id ? s.cars.map((x) => (x.id === id ? { ...x, ...c } : x)) : [...s.cars, { id: 'c' + Date.now(), ...c, def: s.cars.length === 0 }],
        })),
      deleteCar: (id) =>
        set((s) => {
          const cars = s.cars.filter((x) => x.id !== id)
          // Keep one default car.
          if (cars.length && !cars.some((c) => c.def)) cars[0] = { ...cars[0], def: true }
          return { cars, bk: s.bk.car === id ? { ...s.bk, car: defaultCar(cars) } : s.bk }
        }),
    }),
    {
      name: 'raghwa-customer',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        lang: s.lang, appearance: s.appearance, onboarded: s.onboarded, tokens: s.tokens, customer: s.customer, cars: s.cars, notif: s.notif,
      }),
    },
  ),
)

/** Toasts are UI-only, kept outside the persisted store. */
export const useToast = create<{ key: SKey | null; tone: 'ok' | 'error'; show: (k: SKey, tone?: 'ok' | 'error') => void }>((set) => {
  let timer: ReturnType<typeof setTimeout> | undefined
  return {
    key: null,
    tone: 'ok',
    show: (key, tone = 'ok') => {
      clearTimeout(timer)
      set({ key, tone })
      timer = setTimeout(() => set({ key: null }), 2600)
    },
  }
})
export const toast = (k: SKey, tone?: 'ok' | 'error') => useToast.getState().show(k, tone)

/** Plate as sent to the API ("215 TU 4521"). */
export const carPlate = (c: Car) => `${c.ps} TU ${c.pn}`

/** Series and number of a plate typed in the app; null for any other format. */
export function parsePlate(plate: string | null) {
  const m = /^(\d{1,3})\s*(?:TU|تونس)\s*(\d{1,4})$/.exec((plate ?? '').trim())
  return m ? { ps: m[1], pn: m[2] } : null
}
