import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Lang } from '@/data/i18n-strings'
import {
  BLOCKS, GARAGE, HOURS, NOTIFS, NOW, OWNER, RESERVATIONS, SERVICES, SLOT_BLOCKS, TODAY,
  type BlockReason, type DayHours, type Notif, type Reservation, type Service, type Status,
} from '@/data/mock'

const clone = <T,>(x: T): T => structuredClone(x)

export type UploadKey = 'logo' | 'p1' | 'p2' | 'p3'
export type PrefKey = 'n1' | 'n2' | 'n3' | 'n4'
export type GarageInfo = Omit<typeof GARAGE, 'phone'> & { phone: string }

interface State {
  lang: Lang
  authed: boolean
  /** Phone + purpose carried from sign-up / forgot-password into the OTP screen. */
  otp: { purpose: 'signup' | 'forgot'; phone: string }
  garage: GarageInfo
  ownerPhone: string
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
  prefs: Record<PrefKey, boolean>
  uploads: Record<UploadKey, boolean>
}

interface Actions {
  setLang: (l: Lang) => void
  login: () => void
  logout: () => void
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

const initialData = () => ({
  garage: clone(GARAGE),
  ownerPhone: OWNER.phone,
  hours: clone(HOURS),
  slotDur: 30,
  isCustom: false,
  customDur: '',
  capacity: 3,
  services: clone(SERVICES),
  reservations: clone(RESERVATIONS),
  notifs: clone(NOTIFS),
  blocks: clone(BLOCKS),
  slotBlocks: clone(SLOT_BLOCKS),
  prefs: { n1: true, n2: true, n3: true, n4: false },
  uploads: { logo: true, p1: true, p2: true, p3: false },
})

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
      // Only the language and session survive a reload; the demo data resets.
      partialize: (s) => ({ lang: s.lang, authed: s.authed }),
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
