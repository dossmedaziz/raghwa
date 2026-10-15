// HTTP client for raghwa-api (customer endpoints). Adds the access token, refreshes it once on 401,
// and turns error responses into ApiError with the API's stable `code` (translated in lib/errors.ts).
import Constants from 'expo-constants'
import type { Lang } from '@/data/constants'
import { useStore } from '@/store'
import type {
  Availability, BookRequest, CustomerDto, CustomerSession, GarageCard, GarageDetail, Paged, Reservation, SavedCar, TokenPair,
} from '@/lib/types'

/**
 * EXPO_PUBLIC_API_URL wins. Otherwise, in development, the API is expected on the machine running Metro
 * (the Docker setup publishes it on port 3002), which works from an emulator and from a phone on the same Wi-Fi.
 */
function baseUrl() {
  const env = process.env.EXPO_PUBLIC_API_URL
  if (env) return env.replace(/\/$/, '')
  const host = Constants.expoConfig?.hostUri?.split(':')[0]
  return `http://${host || 'localhost'}:3002`
}
const BASE = baseUrl()
const TIMEOUT_MS = 15000

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

let onExpired: () => void = () => {}
/** Called when the session can no longer be refreshed (the app goes back to login). */
export function onSessionExpired(fn: () => void) {
  onExpired = fn
  return () => {
    onExpired = () => {}
  }
}

function send(method: string, path: string, body: unknown, token?: string) {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = 'Bearer ' + token
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  return fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: ctrl.signal })
    .finally(() => clearTimeout(timer))
}

let refreshing: Promise<boolean> | null = null
/** One refresh at a time, shared by every request that hit a 401 meanwhile. */
function refreshTokens(): Promise<boolean> {
  const current = useStore.getState().tokens
  if (!current) return Promise.resolve(false)
  refreshing ??= send('POST', '/v1/auth/refresh', { refreshToken: current.refreshToken })
    .then(async (res) => {
      if (!res.ok) return false
      useStore.getState().setTokens((await res.json()) as TokenPair)
      return true
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export async function request<T>(method: Method, path: string, body?: unknown, opts: { auth?: boolean } = {}): Promise<T> {
  const auth = opts.auth ?? true
  const call = () => send(method, path, body, auth ? useStore.getState().tokens?.accessToken : undefined)

  let res: Response
  try {
    res = await call()
    if (res.status === 401 && auth) {
      if (await refreshTokens()) res = await call()
      // Several requests can fail together; sign out once.
      if (res.status === 401 && useStore.getState().tokens) {
        useStore.getState().signOut()
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
    const message = Array.isArray(data?.message) ? data.message.join(', ') : (data?.message ?? String(res.status))
    throw new ApiError(res.status, code, message, data?.details)
  }
  return data as T
}

/** Builds "?a=1&b=2", skipping empty values. */
export function qs(params: Record<string, string | number | undefined | null>) {
  const parts: string[] = []
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') parts.push(k + '=' + encodeURIComponent(String(v)))
  return parts.length ? '?' + parts.join('&') : ''
}

export interface GarageQuery { q?: string; lat?: number; lng?: number; radiusKm?: number; limit?: number }

/** Every customer endpoint used by the app. */
export const api = {
  auth: {
    register: (name: string, phone: string, password: string) =>
      request<CustomerSession>('POST', '/v1/auth/register', { name, phone, password }, { auth: false }),
    login: (phone: string, password: string) => request<CustomerSession>('POST', '/v1/auth/login', { phone, password }, { auth: false }),
    logout: (refreshToken: string) => request<void>('POST', '/v1/auth/logout', { refreshToken }, { auth: false }),
  },
  me: {
    get: () => request<CustomerDto>('GET', '/v1/me'),
    update: (name: string) => request<CustomerDto>('PATCH', '/v1/me', { name }),
  },
  cars: {
    list: () => request<SavedCar[]>('GET', '/v1/me/cars'),
    create: (car: Omit<SavedCar, 'id' | 'isDefault'> & { isDefault?: boolean }) => request<SavedCar>('POST', '/v1/me/cars', car),
    update: (id: string, car: Partial<Omit<SavedCar, 'id'>>) => request<SavedCar>('PATCH', '/v1/me/cars/' + id, car),
    remove: (id: string) => request<void>('DELETE', '/v1/me/cars/' + id),
  },
  garages: {
    search: (q: GarageQuery) => request<Paged<GarageCard>>('GET', '/v1/garages' + qs({ ...q }), undefined, { auth: false }),
    get: (id: string) => request<GarageDetail>('GET', '/v1/garages/' + id, undefined, { auth: false }),
    availability: (id: string, date: string) =>
      request<Availability>('GET', `/v1/garages/${id}/availability` + qs({ date }), undefined, { auth: false }),
  },
  push: {
    register: (token: string, lang: Lang) => request<void>('PUT', '/v1/me/push-token', { token, lang }),
    unregister: (token: string) => request<void>('DELETE', '/v1/me/push-token', { token }),
  },
  reservations: {
    book: (body: BookRequest) => request<Reservation>('POST', '/v1/reservations', body),
    list: (scope: 'upcoming' | 'past', limit = 100) => request<Paged<Reservation>>('GET', '/v1/reservations' + qs({ scope, limit })),
    get: (id: string) => request<Reservation>('GET', '/v1/reservations/' + id),
    cancel: (id: string) => request<Reservation>('POST', `/v1/reservations/${id}/cancel`),
    reschedule: (id: string, date: string, time: string) => request<Reservation>('POST', `/v1/reservations/${id}/reschedule`, { date, time }),
  },
}

/** Ends this device's session on the server (best effort) and forgets it locally. */
export function logout() {
  const { tokens, pushToken } = useStore.getState()
  if (tokens) {
    // The phone stops receiving this account's pushes. Sent first: it still needs the access token
    // (read synchronously by request(), so clearing the store below does not affect it).
    const unregister = pushToken ? api.push.unregister(pushToken).catch(() => {}) : Promise.resolve()
    unregister.then(() => api.auth.logout(tokens.refreshToken)).catch(() => {})
  }
  useStore.getState().signOut()
}
