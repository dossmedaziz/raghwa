// API payloads ⇄ the shapes the UI edits.
import { digits, phoneLocal } from '@/lib/format'
import type { DayHours, DayHoursDto, GarageInfo, OwnerGarageDto, Service, ServiceDto } from '@/lib/types'

export const hoursFromDto = (h: DayHoursDto): DayHours => ({
  open: h.isOpen, from: h.opensAt, to: h.closesAt, brk: h.hasBreak, bFrom: h.breakStart, bTo: h.breakEnd,
})

export const hoursToDto = (h: DayHours): Omit<DayHoursDto, 'dayOfWeek'> => ({
  isOpen: h.open, opensAt: h.from, closesAt: h.to, hasBreak: h.brk, breakStart: h.bFrom, breakEnd: h.bTo,
})

export const serviceFromDto = (s: ServiceDto): Service => ({
  id: s.id, nameAr: s.nameAr, nameFr: s.nameFr, price: s.price, descAr: s.descriptionAr, descFr: s.descriptionFr, active: s.isActive,
})

export const serviceToDto = (s: Omit<Service, 'id'>) => ({
  nameAr: s.nameAr, nameFr: s.nameFr, price: s.price, descriptionAr: s.descAr, descriptionFr: s.descFr, isActive: s.active,
})

export const garageFromDto = (g: OwnerGarageDto): GarageInfo => ({
  name: g.name,
  desc: g.description,
  phone: phoneLocal(g.phone),
  address: g.address,
  area: g.area,
  city: g.city,
  lat: g.location?.latitude ?? null,
  lng: g.location?.longitude ?? null,
})

/** PATCH body. An empty phone is left out (the API only accepts a valid 8-digit number). */
export const garageToDto = (g: GarageInfo) => ({
  name: g.name.trim(),
  description: g.desc.trim(),
  ...(digits(g.phone) ? { phone: digits(g.phone) } : {}),
  address: g.address.trim(),
  area: g.area.trim(),
  city: g.city,
  latitude: g.lat,
  longitude: g.lng,
})

const PRESETS = [15, 30, 45, 60]

/** Slot length as the picker shows it: one of the presets, or "custom" with the value in the text box. */
export const slotFromDto = (minutes: number) =>
  PRESETS.includes(minutes)
    ? { slotDur: minutes, isCustom: false, customDur: '' }
    : { slotDur: 30, isCustom: true, customDur: String(minutes) }
