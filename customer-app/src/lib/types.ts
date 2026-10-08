// Payloads of raghwa-api's customer endpoints (/docs/customer). Prices are in TND, dates "YYYY-MM-DD",
// times "HH:MM" in Tunis time, phones 8 local digits.

export interface TokenPair { accessToken: string; refreshToken: string; expiresIn: number }

export interface CustomerDto { id: string; phone: string; name: string | null }
export interface CustomerSession { customer: CustomerDto; tokens: TokenPair }

export interface Paged<T> { items: T[]; meta: { page: number; limit: number; total: number; totalPages: number } }

export interface GeoPoint { latitude: number; longitude: number }

export interface GarageCard {
  id: string
  name: string
  area: string
  city: string
  address: string
  location: GeoPoint | null
  /** Only when searching by position. */
  distanceKm: number | null
  /** Cheapest active service. */
  fromPrice: number | null
}

export interface DayHours {
  /** 0 = Monday … 6 = Sunday. */
  dayOfWeek: number
  isOpen: boolean
  opensAt: string
  closesAt: string
  hasBreak: boolean
  breakStart: string
  breakEnd: string
}

export interface PublicService { id: string; nameAr: string; nameFr: string; descriptionAr: string; descriptionFr: string; price: number }

export interface GarageDetail {
  id: string
  name: string
  description: string
  phone: string
  address: string
  area: string
  city: string
  location: GeoPoint | null
  slotDurationMinutes: number
  hours: DayHours[]
  services: PublicService[]
}

export interface Availability {
  date: string
  /** False if the garage is closed or not taking bookings that day. */
  isOpen: boolean
  /** Slots that have not started yet; `available` 0 = full. */
  slots: { time: string; available: number }[]
}

export type ReservationStatus = 'upcoming' | 'done' | 'cancelled'
export interface ReservationLine { serviceId: string | null; nameAr: string; nameFr: string; price: number }
export interface CarDto { brand: string | null; model: string | null; plate: string | null }

export interface Reservation {
  id: string
  ref: string
  date: string
  time: string
  status: ReservationStatus
  cancelledBy: 'customer' | 'garage' | null
  total: number
  lines: ReservationLine[]
  car: CarDto | null
  createdAt: string
  garage: { id: string; name: string; phone: string; address: string; area: string; city: string; location: GeoPoint | null }
}

export interface BookRequest {
  garageId: string
  date: string
  time: string
  serviceIds: string[]
  car?: { brand?: string; model?: string; plate?: string }
}
