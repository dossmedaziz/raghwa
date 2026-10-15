// HTTP client for raghwa-api (owner endpoints). Adds the access token, refreshes it once on 401,
// and turns error responses into ApiError with the API's stable `code` (translated in lib/errors.ts).
import type {
  DashboardDto, DaySchedule, GarageSummary, NotificationPage, OtpSent, OwnerDto, OwnerGarageDto, OwnerSession, Paged,
  Reservation, ServiceDto, TokenPair, BlockReason, DayHoursDto,
} from '@/lib/types'

export const BASE = String(import.meta.env.VITE_API_URL ?? 'http://localhost:3002').replace(/\/$/, '')
const SESSION_KEY = 'raghwa-pro-session'

export class ApiError extends Error {
  status: number
  code: string
  details: unknown
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

type Tokens = Pick<TokenPair, 'accessToken' | 'refreshToken'>

/** Tokens live in localStorage so a reload keeps the owner logged in. */
export const session = {
  get(): Tokens | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      return raw ? (JSON.parse(raw) as Tokens) : null
    } catch {
      return null
    }
  },
  set(t: Tokens) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ accessToken: t.accessToken, refreshToken: t.refreshToken }))
    } catch {
      /* private mode: the session lasts until reload */
    }
  },
  clear() {
    try {
      localStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
  },
}

let onExpired: () => void = () => {}
/** Called when the session can no longer be refreshed (the app logs out). */
export function onSessionExpired(fn: () => void) {
  onExpired = fn
}

let refreshing: Promise<boolean> | null = null
/** One refresh at a time, shared by every request that hit a 401 meanwhile. */
export function refreshTokens(): Promise<boolean> {
  const current = session.get()
  if (!current) return Promise.resolve(false)
  refreshing ??= fetch(BASE + '/v1/owner/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refreshToken: current.refreshToken }),
  })
    .then(async (res) => {
      if (!res.ok) return false
      session.set((await res.json()) as TokenPair)
      return true
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export async function request<T>(method: Method, path: string, body?: unknown, opts: { auth?: boolean } = {}): Promise<T> {
  const auth = opts.auth ?? true
  const send = () => {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const tokens = auth ? session.get() : null
    if (tokens) headers.Authorization = 'Bearer ' + tokens.accessToken
    return fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  }

  let res: Response
  try {
    res = await send()
    if (res.status === 401 && auth && session.get()) {
      if (await refreshTokens()) res = await send()
      if (res.status === 401) {
        session.clear()
        onExpired()
      }
    }
  } catch {
    throw new ApiError(0, 'NETWORK', 'Network error')
  }

  if (res.status === 204) return undefined as T
  const data = (await res.json().catch(() => null)) as { code?: string; message?: string | string[]; details?: unknown } | null
  if (!res.ok) {
    const code = data?.code ?? (res.status === 400 ? 'VALIDATION' : `HTTP_${res.status}`)
    const message = Array.isArray(data?.message) ? data.message.join(', ') : (data?.message ?? res.statusText)
    throw new ApiError(res.status, code, message, data?.details)
  }
  return data as T
}

/** Builds "?a=1&b=2", skipping empty values. */
export function qs(params: Record<string, string | number | undefined | null>) {
  const u = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') u.set(k, String(v))
  const s = u.toString()
  return s ? '?' + s : ''
}

const g = (garageId: string) => `/v1/owner/garages/${garageId}`

export interface ReservationQuery {
  status?: string
  q?: string
  serviceId?: string
  from?: string
  to?: string
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

/** Every owner endpoint used by garage-web. */
export const ownerApi = {
  auth: {
    login: (phone: string, password: string) => request<OwnerSession>('POST', '/v1/owner/auth/login', { phone, password }, { auth: false }),
    signup: (name: string, phone: string, password: string) =>
      request<OtpSent>('POST', '/v1/owner/auth/signup', { name, phone, password }, { auth: false }),
    resendSignup: (phone: string) => request<OtpSent>('POST', '/v1/owner/auth/signup/resend', { phone }, { auth: false }),
    verifySignup: (phone: string, code: string) => request<OwnerSession>('POST', '/v1/owner/auth/signup/verify', { phone, code }, { auth: false }),
    forgot: (phone: string) => request<OtpSent>('POST', '/v1/owner/auth/password/forgot', { phone }, { auth: false }),
    verifyReset: (phone: string, code: string) =>
      request<{ resetToken: string }>('POST', '/v1/owner/auth/password/verify', { phone, code }, { auth: false }),
    reset: (resetToken: string, password: string) => request<void>('POST', '/v1/owner/auth/password/reset', { resetToken, password }, { auth: false }),
    logout: (refreshToken: string) => request<void>('POST', '/v1/owner/auth/logout', { refreshToken }, { auth: false }),
  },
  me: {
    get: () => request<OwnerDto>('GET', '/v1/owner/me'),
    update: (name: string) => request<OwnerDto>('PATCH', '/v1/owner/me', { name }),
    changePassword: (currentPassword: string, newPassword: string) => request<void>('PUT', '/v1/owner/me/password', { currentPassword, newPassword }),
    requestPhoneChange: (phone: string) => request<OtpSent>('POST', '/v1/owner/me/phone', { phone }),
    confirmPhoneChange: (phone: string, code: string) => request<OwnerDto>('POST', '/v1/owner/me/phone/verify', { phone, code }),
    notifications: (prefs: Partial<OwnerDto['notifications']>) => request<OwnerDto>('PATCH', '/v1/owner/me/notifications', prefs),
  },
  garages: {
    list: () => request<GarageSummary[]>('GET', '/v1/owner/garages'),
    create: (profile: object = {}) => request<OwnerGarageDto>('POST', '/v1/owner/garages', profile),
    get: (id: string) => request<OwnerGarageDto>('GET', g(id)),
    update: (id: string, profile: object) => request<OwnerGarageDto>('PATCH', g(id), profile),
    setHours: (id: string, days: Omit<DayHoursDto, 'dayOfWeek'>[]) => request<OwnerGarageDto>('PUT', g(id) + '/hours', { days }),
    publish: (id: string) => request<OwnerGarageDto>('POST', g(id) + '/publish'),
    unpublish: (id: string) => request<OwnerGarageDto>('POST', g(id) + '/unpublish'),
  },
  services: {
    list: (id: string) => request<ServiceDto[]>('GET', g(id) + '/services'),
    create: (id: string, data: object) => request<ServiceDto>('POST', g(id) + '/services', data),
    update: (id: string, serviceId: string, data: object) => request<ServiceDto>('PATCH', g(id) + '/services/' + serviceId, data),
    remove: (id: string, serviceId: string) => request<void>('DELETE', g(id) + '/services/' + serviceId),
  },
  schedule: {
    get: (id: string, from: string, to: string) => request<DaySchedule[]>('GET', g(id) + '/schedule' + qs({ from, to })),
    blockDay: (id: string, date: string, reason: BlockReason) => request<void>('PUT', `${g(id)}/blocks/days/${date}`, { reason }),
    unblockDay: (id: string, date: string) => request<void>('DELETE', `${g(id)}/blocks/days/${date}`),
    blockSlot: (id: string, date: string, time: string, reason: BlockReason) =>
      request<void>('PUT', `${g(id)}/blocks/slots/${date}/${time}`, { reason }),
    unblockSlot: (id: string, date: string, time: string) => request<void>('DELETE', `${g(id)}/blocks/slots/${date}/${time}`),
  },
  reservations: {
    list: (id: string, q: ReservationQuery = {}) =>
      request<Paged<Reservation>>('GET', g(id) + '/reservations' + qs({ ...q })),
    get: (id: string, reservationId: string) => request<Reservation>('GET', `${g(id)}/reservations/${reservationId}`),
    done: (id: string, reservationId: string) => request<Reservation>('POST', `${g(id)}/reservations/${reservationId}/done`),
    cancel: (id: string, reservationId: string) => request<Reservation>('POST', `${g(id)}/reservations/${reservationId}/cancel`),
  },
  dashboard: (id: string) => request<DashboardDto>('GET', g(id) + '/dashboard'),
  notifications: {
    list: (id: string, limit = 20) => request<NotificationPage>('GET', g(id) + '/notifications' + qs({ limit })),
    readAll: (id: string) => request<void>('POST', g(id) + '/notifications/read-all'),
  },
}
