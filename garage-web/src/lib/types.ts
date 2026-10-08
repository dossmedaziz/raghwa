// Shapes used by the UI, plus the API payloads (mirrors raghwa-api's owner DTOs: http://localhost:3002/docs/owner).

export type Status = 'upcoming' | 'done' | 'cancelled'
export type BlockReason = 'holiday' | 'maintenance' | 'other'

/** One weekday of opening hours, as edited in the UI (Monday = index 0). */
export interface DayHours {
  open: boolean
  from: string
  to: string
  brk: boolean
  bFrom: string
  bTo: string
}

export interface Service {
  id: string
  nameAr: string
  nameFr: string
  price: number
  descAr: string
  descFr: string
  active: boolean
}

/** Editable garage profile. `phone` is kept formatted ("71 774 512"); lat/lng are null until the pin is placed. */
export interface GarageInfo {
  name: string
  desc: string
  phone: string
  address: string
  area: string
  city: string
  lat: number | null
  lng: number | null
}

/* ───────── API payloads ───────── */

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface OwnerDto {
  id: string
  name: string
  phone: string
  notifications: { newBooking: boolean; cancellation: boolean; reschedule: boolean; dailySummary: boolean }
  createdAt: string
}

export interface OwnerSession {
  owner: OwnerDto
  tokens: TokenPair
}

export interface OtpSent {
  phone: string
  resendAfterSeconds: number
}

export type MissingForPublish = 'name' | 'phone' | 'address' | 'area' | 'location' | 'hours' | 'services'

export interface DayHoursDto {
  dayOfWeek: number
  isOpen: boolean
  opensAt: string
  closesAt: string
  hasBreak: boolean
  breakStart: string
  breakEnd: string
}

export interface OwnerGarageDto {
  id: string
  status: 'draft' | 'published'
  publishedAt: string | null
  name: string
  description: string
  phone: string
  address: string
  area: string
  city: string
  location: { latitude: number; longitude: number } | null
  slotDurationMinutes: number
  capacity: number
  hours: DayHoursDto[]
  missingForPublish: MissingForPublish[]
}

export interface GarageSummary {
  id: string
  status: 'draft' | 'published'
  name: string
  area: string
  city: string
  todayReservations: number
  upcomingReservations: number
}

export interface ServiceDto {
  id: string
  nameAr: string
  nameFr: string
  descriptionAr: string
  descriptionFr: string
  price: number
  isActive: boolean
}

export type HistoryType = 'booked' | 'rescheduled' | 'done' | 'cancelled'

export interface Reservation {
  id: string
  ref: string
  date: string
  time: string
  status: Status
  cancelledBy: 'customer' | 'garage' | null
  total: number
  lines: { serviceId: string | null; nameAr: string; nameFr: string; price: number }[]
  car: { brand: string | null; model: string | null; plate: string | null } | null
  history: { type: HistoryType; actor: 'customer' | 'garage' | null; previousDate: string | null; previousTime: string | null; at: string }[]
  createdAt: string
  customer: { id: string; name: string | null; phone: string }
}

export interface PageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface Paged<T> {
  items: T[]
  meta: PageMeta
}

export interface SlotState {
  time: string
  booked: number
  capacity: number
  available: number
  blockedReason: BlockReason | null
  isPast: boolean
}

export interface DaySchedule {
  date: string
  isOpen: boolean
  blockedReason: BlockReason | null
  slots: SlotState[]
}

export interface DashboardDto {
  today: string
  todayTotal: number
  todayUpcoming: number
  upcomingThisWeek: number
  doneThisMonth: number
  revenueThisMonth: number
  last7Days: { date: string; count: number }[]
  nextReservations: Reservation[]
}

export type NotificationType = 'reservation_created' | 'reservation_cancelled' | 'reservation_rescheduled'

export interface NotificationDto {
  id: string
  type: NotificationType
  reservationId: string | null
  data: { ref: string; customerName: string | null; date: string; time: string; previousDate?: string; previousTime?: string }
  unread: boolean
  createdAt: string
}

export interface NotificationPage extends Paged<NotificationDto> {
  unread: number
}
