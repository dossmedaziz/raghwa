import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Lang } from '@/data/i18n-strings'
import {
  GARAGE, GARAGES, NOW, OWNER, TODAY, newGarageSeed,
  type BlockReason, type DayHours, type GarageSeed, type GarageStats, type Notif, type Reservation, type Service, type Status,
} from '@/data/mock'

const clone = <T,>(x: T): T => structuredClone(x)

export type UploadKey = 'logo' | 'p1' | 'p2' | 'p3'
export type PrefKey = 'n1' | 'n2' | 'n3' | 'n4'
export type GarageInfo = Omit<typeof GARAGE, 'phone'> & { phone: string }

/** Everything that belongs to one garage. The active garage's copy lives flat on the store. */
export interface Workspace {
  published: boolean
  garage: GarageInfo
  hours: DayHours[]
  slotDur: number
  isCustom: boolean
  customDur: string
  capacity: number
  services: Service[]
  reservations: Reservation[]
  notifs: Notif[]
  blocks: Record<string, BlockReason>
  slotBlocks: Record<string, BlockReason>
  uploads: Record<UploadKey, boolean>
  stats: GarageStats
}

const WORKSPACE_KEYS = [
  'published', 'garage', 'hours', 'slotDur', 'isCustom', 'customDur', 'capacity', 'services', 'reservations',
  'notifs', 'blocks', 'slotBlocks', 'uploads', 'stats',
] as const satisfies readonly (keyof Workspace)[]

interface State extends Workspace {
  lang: Lang
  authed: boolean
  /** Phone + purpose carried from sign-up / forgot-password into the OTP screen. */
  otp: { purpose: 'signup' | 'forgot'; phone: string }
  ownerPhone: string
  prefs: Record<PrefKey, boolean>
  /** Garage the owner is managing right now; null until one is picked after login. */
  activeGarageId: string | null
  /** Stored copies of every garage the owner has, in display order. The active one may be stale. */
  garageIds: string[]
  workspaces: Record<string, Workspace>
}

interface Actions {
  setLang: (l: Lang) => void
  login: () => void
  logout: () => void
  selectGarage: (id: string) => void
  /** Creates a blank draft garage, makes it active and returns its id. */
  addGarage: () => string
  publishGarage: () => void
  startOtp: (purpose: State['otp']['purpose'], phone: string) => void
  updateGarage: (p: Partial<GarageInfo>) => void
  setOwnerPhone: (p: string) => void
  setHour: (i: number, p: Partial<DayHours>) => void
  copyHoursToAll: () => void
  setSlotDur: (m: number) => void
  setCustom: () => void
  setCustomDur: (v: string) => void
  setCapacity: (n: number) => void
  saveService: (id: string | null, data: Omit<Service, 'id'>) => void
  toggleService: (id: string) => void
  deleteService: (id: string) => void
  setResStatus: (id: string, status: Status) => void
  markAllRead: () => void
  blockDay: (d: string, r: BlockReason) => void
  unblockDay: (d: string) => void
  toggleSlotBlock: (d: string, t: string, r: BlockReason) => boolean
  togglePref: (k: PrefKey) => void
  setUpload: (k: UploadKey, v: boolean) => void
}

const toWorkspace = ({ id: _, ...seed }: GarageSeed): Workspace => ({ ...clone(seed), isCustom: false, customDur: '' })

const pickWorkspace = (s: Workspace): Workspace =>
  Object.fromEntries(WORKSPACE_KEYS.map((k) => [k, s[k]])) as unknown as Workspace

const initialData = () => {
  const workspaces = Object.fromEntries(GARAGES.map((g) => [g.id, toWorkspace(g)]))
  return {
    ownerPhone: OWNER.phone,
    prefs: { n1: true, n2: true, n3: true, n4: false },
    activeGarageId: null as string | null,
    garageIds: GARAGES.map((g) => g.id),
    workspaces,
    // Flat fields hold the first garage until one is picked, so every screen always has data to show.
    ...workspaces[GARAGES[0].id],
  }
}

/** Saves the active garage back into `workspaces` and loads `id` in its place. */
function switchTo(s: State, id: string): Partial<State> {
  const workspaces = s.activeGarageId ? { ...s.workspaces, [s.activeGarageId]: pickWorkspace(s) } : s.workspaces
  return { workspaces, activeGarageId: id, ...workspaces[id] }
}

/** Every garage with up-to-date data (the active one is read from the live flat fields). */
export function listGarages(s: State): (Workspace & { id: string })[] {
  return s.garageIds.map((id) => ({ id, ...(id === s.activeGarageId ? pickWorkspace(s) : s.workspaces[id]) }))
}

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      lang: 'ar',
      authed: false,
      otp: { purpose: 'signup', phone: '' },
      ...initialData(),

      setLang: (lang) => set({ lang }),
      login: () => set({ authed: true }),
      logout: () => set({ authed: false, ...initialData() }),
      selectGarage: (id) => set((s) => (s.workspaces[id] ? switchTo(s, id) : {})),
      addGarage: () => {
        const id = 'g' + Date.now()
        set((s) => switchTo({ ...s, garageIds: [...s.garageIds, id], workspaces: { ...s.workspaces, [id]: toWorkspace(newGarageSeed(id)) } }, id))
        return id
      },
      publishGarage: () => set({ published: true }),
      startOtp: (purpose, phone) => set({ otp: { purpose, phone } }),
      updateGarage: (p) => set((s) => ({ garage: { ...s.garage, ...p } })),
      setOwnerPhone: (ownerPhone) => set({ ownerPhone }),
      setHour: (i, p) => set((s) => ({ hours: s.hours.map((h, j) => (j === i ? { ...h, ...p } : h)) })),
      copyHoursToAll: () =>
        set((s) => {
          const src = s.hours.find((h) => h.open) ?? s.hours[0]
          return { hours: s.hours.map((h) => ({ ...h, from: src.from, to: src.to, brk: src.brk, bFrom: src.bFrom, bTo: src.bTo })) }
        }),
      setSlotDur: (slotDur) => set({ slotDur, isCustom: false }),
      setCustom: () => set((s) => ({ isCustom: true, customDur: s.customDur || '40' })),
      setCustomDur: (v) => set({ customDur: v.replace(/\D/g, '').slice(0, 3) }),
      setCapacity: (n) => set({ capacity: Math.min(12, Math.max(1, n)) }),
      saveService: (id, data) =>
        set((s) => ({
          services: id ? s.services.map((x) => (x.id === id ? { ...x, ...data } : x)) : [...s.services, { id: 's' + Date.now(), ...data }],
        })),
      toggleService: (id) => set((s) => ({ services: s.services.map((x) => (x.id === id ? { ...x, active: !x.active } : x)) })),
      deleteService: (id) => set((s) => ({ services: s.services.filter((x) => x.id !== id) })),
      setResStatus: (id, status) =>
        set((s) => ({
          reservations: s.reservations.map((r) =>
            r.id === id ? { ...r, status, history: [...r.history, { type: status === 'upcoming' ? 'booked' : status, by: 'garage', date: TODAY, time: NOW }] } : r,
          ),
        })),
      markAllRead: () => set((s) => ({ notifs: s.notifs.map((n) => ({ ...n, unread: false })) })),
      blockDay: (d, r) => set((s) => ({ blocks: { ...s.blocks, [d]: r } })),
      unblockDay: (d) =>
        set((s) => {
          const blocks = { ...s.blocks }
          delete blocks[d]
          return { blocks }
        }),
      toggleSlotBlock: (d, t, r) => {
        const k = d + '|' + t, slotBlocks = { ...get().slotBlocks }
        const wasBlocked = !!slotBlocks[k]
        if (wasBlocked) delete slotBlocks[k]
        else slotBlocks[k] = r
        set({ slotBlocks })
        return !wasBlocked
      },
      togglePref: (k) => set((s) => ({ prefs: { ...s.prefs, [k]: !s.prefs[k] } })),
      setUpload: (k, v) => set((s) => ({ uploads: { ...s.uploads, [k]: v } })),
    }),
    {
      name: 'raghwa-pro',
      storage: createJSONStorage(() => localStorage),
      // Only the language, session and chosen garage survive a reload; the demo data resets.
      partialize: (s) => ({ lang: s.lang, authed: s.authed, activeGarageId: s.activeGarageId }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>
        const id = p.activeGarageId
        // A garage added during the previous visit is gone after a reload: fall back to the picker.
        const garage = id && current.workspaces[id] ? { activeGarageId: id, ...current.workspaces[id] } : { activeGarageId: null }
        return { ...current, lang: p.lang ?? current.lang, authed: p.authed ?? current.authed, ...garage }
      },
    },
  ),
)

/** Effective slot length in minutes (custom value only if it is valid). */
export function useSlotDuration() {
  return useStore((s) => {
    const c = +s.customDur
    return s.isCustom ? (c >= 10 && c <= 240 ? c : 30) : s.slotDur
  })
}
