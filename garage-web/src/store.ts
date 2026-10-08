import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Lang } from '@/data/i18n-strings'
import { DEFAULT_POSITION } from '@/data/cities'
import { ApiError, onSessionExpired, ownerApi, session } from '@/lib/api'
import { garageFromDto, garageToDto, hoursFromDto, hoursToDto, serviceFromDto, serviceToDto, slotFromDto } from '@/lib/mappers'
import { invalidate } from '@/lib/query'
import type { DayHours, GarageInfo, GarageSummary, MissingForPublish, OwnerDto, OwnerGarageDto, OwnerSession, Service } from '@/lib/types'

export type UploadKey = 'logo' | 'p1' | 'p2' | 'p3'
export type PrefKey = 'n1' | 'n2' | 'n3' | 'n4'

/** Settings switches → API notification preference names. */
export const PREF_FIELDS: Record<PrefKey, keyof OwnerDto['notifications']> = {
  n1: 'newBooking', n2: 'cancellation', n3: 'reschedule', n4: 'dailySummary',
}

/**
 * The garage being managed. Profile, hours and slot settings are local drafts (edited live by the forms)
 * until a save action sends them; services are saved immediately.
 */
interface ActiveGarage {
  published: boolean
  garage: GarageInfo
  hours: DayHours[]
  slotDur: number
  isCustom: boolean
  customDur: string
  capacity: number
  services: Service[]
  missing: MissingForPublish[]
  /** Photos are not stored by the API yet: kept in the browser for this visit only. */
  uploads: Record<UploadKey, boolean>
}

interface State extends ActiveGarage {
  lang: Lang
  authed: boolean
  owner: OwnerDto | null
  /** Phone + purpose carried from sign-up / forgot-password into the OTP screen, then the reset token. */
  otp: { purpose: 'signup' | 'forgot'; phone: string; resetToken: string | null }
  /** The owner's garages (picker and switcher); null until loaded. */
  garages: GarageSummary[] | null
  activeGarageId: string | null
  garageStatus: 'idle' | 'loading' | 'ready' | 'error'
}

interface Actions {
  setLang: (l: Lang) => void
  /* session */
  signIn: (s: OwnerSession) => void
  logout: () => Promise<void>
  /** Local logout when the session expired (no API call). */
  endSession: () => void
  loadOwner: () => Promise<void>
  setOwner: (o: OwnerDto) => void
  startOtp: (purpose: State['otp']['purpose'], phone: string) => void
  setResetToken: (token: string) => void
  /* garages */
  loadGarages: () => Promise<GarageSummary[]>
  createGarage: () => Promise<string>
  selectGarage: (id: string) => Promise<void>
  /** Reloads the active garage from the API (also discards unsaved drafts). */
  loadGarage: () => Promise<void>
  /* local drafts */
  updateGarage: (p: Partial<GarageInfo>) => void
  setHour: (i: number, p: Partial<DayHours>) => void
  copyHoursToAll: () => void
  setSlotDur: (m: number) => void
  setCustom: () => void
  setCustomDur: (v: string) => void
  setCapacity: (n: number) => void
  setUpload: (k: UploadKey, v: boolean) => void
  /* saves */
  saveProfile: () => Promise<void>
  saveHours: () => Promise<void>
  saveSlots: () => Promise<void>
  publish: () => Promise<void>
  saveService: (id: string | null, data: Omit<Service, 'id'>) => Promise<void>
  toggleService: (id: string) => Promise<void>
  deleteService: (id: string) => Promise<void>
  togglePref: (k: PrefKey) => Promise<void>
}

const emptyGarage = (): ActiveGarage => ({
  published: false,
  garage: { name: '', desc: '', phone: '', address: '', area: '', city: 'Tunis', lat: null, lng: null },
  hours: [0, 1, 2, 3, 4, 5, 6].map((i) => ({ open: i < 6, from: '08:00', to: '19:00', brk: i < 5, bFrom: '13:00', bTo: '14:00' })),
  slotDur: 30,
  isCustom: false,
  customDur: '',
  capacity: 2,
  services: [],
  missing: [],
  uploads: { logo: false, p1: false, p2: false, p3: false },
})

/** Store fields for a garage payload from the API. */
const fromGarage = (g: OwnerGarageDto) => ({
  published: g.status === 'published',
  garage: garageFromDto(g),
  hours: [...g.hours].sort((a, b) => a.dayOfWeek - b.dayOfWeek).map(hoursFromDto),
  capacity: g.capacity,
  missing: g.missingForPublish,
  ...slotFromDto(g.slotDurationMinutes),
})

/** Effective slot length from the picker state (custom value only if valid). */
const effectiveSlot = (s: Pick<State, 'isCustom' | 'customDur' | 'slotDur'>) => {
  const c = +s.customDur
  return s.isCustom ? (c >= 10 && c <= 240 ? c : 30) : s.slotDur
}

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => {
      const activeId = () => {
        const id = get().activeGarageId
        if (!id) throw new ApiError(404, 'GARAGE_NOT_FOUND', 'No garage selected')
        return id
      }
      /** Applies a garage returned by a save, keeps the picker in sync and refreshes mounted queries. */
      const applySaved = (g: OwnerGarageDto) => {
        set(fromGarage(g))
        set((s) => ({
          garages: s.garages?.map((x) => (x.id === g.id ? { ...x, name: g.name, area: g.area, city: g.city, status: g.status } : x)) ?? null,
        }))
        invalidate()
      }
      const reset = () => ({ authed: false, owner: null, garages: null, activeGarageId: null, garageStatus: 'idle' as const, ...emptyGarage() })

      return {
        lang: 'ar',
        authed: !!session.get(),
        owner: null,
        otp: { purpose: 'signup', phone: '', resetToken: null },
        garages: null,
        activeGarageId: null,
        garageStatus: 'idle' as State['garageStatus'],
        ...emptyGarage(),

        setLang: (lang) => set({ lang }),

        signIn: ({ owner, tokens }) => {
          session.set(tokens)
          set({ ...reset(), authed: true, owner })
        },
        logout: async () => {
          const tokens = session.get()
          session.clear()
          set(reset())
          if (tokens) await ownerApi.auth.logout(tokens.refreshToken).catch(() => undefined)
        },
        endSession: () => {
          session.clear()
          set(reset())
        },
        loadOwner: async () => {
          set({ owner: await ownerApi.me.get() })
        },
        setOwner: (owner) => set({ owner }),
        startOtp: (purpose, phone) => set({ otp: { purpose, phone, resetToken: null } }),
        setResetToken: (resetToken) => set((s) => ({ otp: { ...s.otp, resetToken } })),

        loadGarages: async () => {
          const garages = await ownerApi.garages.list()
          set({ garages })
          return garages
        },
        createGarage: async () => {
          const g = await ownerApi.garages.create({})
          set((s) => ({
            garages: [...(s.garages ?? []), { id: g.id, status: g.status, name: g.name, area: g.area, city: g.city, todayReservations: 0, upcomingReservations: 0 }],
          }))
          await get().selectGarage(g.id)
          return g.id
        },
        selectGarage: async (id) => {
          if (id !== get().activeGarageId) set({ activeGarageId: id, ...emptyGarage(), garageStatus: 'idle' })
          await get().loadGarage()
        },
        loadGarage: async () => {
          const id = get().activeGarageId
          if (!id) return
          set({ garageStatus: 'loading' })
          try {
            const [g, services] = await Promise.all([ownerApi.garages.get(id), ownerApi.services.list(id)])
            if (get().activeGarageId !== id) return // switched meanwhile
            set({ ...fromGarage(g), services: services.map(serviceFromDto), garageStatus: 'ready' })
          } catch (err) {
            // The garage disappeared or is not ours (e.g. other account): back to the picker.
            if (err instanceof ApiError && err.status === 404) set({ activeGarageId: null, garageStatus: 'idle' })
            else set({ garageStatus: 'error' })
            throw err
          }
        },

        updateGarage: (p) => set((s) => ({ garage: { ...s.garage, ...p } })),
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
        setUpload: (k, v) => set((s) => ({ uploads: { ...s.uploads, [k]: v } })),

        saveProfile: async () => {
          const g = get().garage
          // A garage without a pin yet gets the default position, so the profile can be saved and moved later.
          const located = g.lat === null || g.lng === null ? { ...g, lat: DEFAULT_POSITION.lat, lng: DEFAULT_POSITION.lng } : g
          applySaved(await ownerApi.garages.update(activeId(), garageToDto(located)))
        },
        saveHours: async () => {
          applySaved(await ownerApi.garages.setHours(activeId(), get().hours.map(hoursToDto)))
        },
        saveSlots: async () => {
          const s = get()
          applySaved(await ownerApi.garages.update(activeId(), { slotDurationMinutes: effectiveSlot(s), capacity: s.capacity }))
        },
        publish: async () => {
          applySaved(await ownerApi.garages.publish(activeId()))
        },

        saveService: async (id, data) => {
          const gid = activeId()
          const saved = serviceFromDto(id ? await ownerApi.services.update(gid, id, serviceToDto(data)) : await ownerApi.services.create(gid, serviceToDto(data)))
          set((s) => ({ services: id ? s.services.map((x) => (x.id === id ? saved : x)) : [...s.services, saved] }))
          invalidate()
        },
        toggleService: async (id) => {
          const sv = get().services.find((x) => x.id === id)
          if (!sv) return
          const saved = serviceFromDto(await ownerApi.services.update(activeId(), id, { isActive: !sv.active }))
          set((s) => ({ services: s.services.map((x) => (x.id === id ? saved : x)) }))
          invalidate()
        },
        deleteService: async (id) => {
          await ownerApi.services.remove(activeId(), id)
          set((s) => ({ services: s.services.filter((x) => x.id !== id) }))
          invalidate()
        },

        togglePref: async (k) => {
          const owner = get().owner
          if (!owner) return
          const field = PREF_FIELDS[k]
          set({ owner: await ownerApi.me.notifications({ [field]: !owner.notifications[field] }) })
        },
      }
    },
    {
      name: 'raghwa-pro',
      storage: createJSONStorage(() => localStorage),
      // Data comes from the API; only the language and the chosen garage survive a reload (tokens are in lib/api).
      partialize: (s) => ({ lang: s.lang, activeGarageId: s.activeGarageId }),
    },
  ),
)

// A refresh token that stopped working (expired, revoked, password reset elsewhere) logs the owner out.
onSessionExpired(() => useStore.getState().endSession())

/** Effective slot length in minutes (custom value only if it is valid). */
export function useSlotDuration() {
  return useStore(effectiveSlot)
}
