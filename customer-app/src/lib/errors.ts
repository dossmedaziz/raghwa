import { S, type SKey } from '@/data/strings'
import { ApiError } from '@/lib/api'
import { toast } from '@/store'

/** String key for an API error code (`e_<CODE>`), or the generic message. */
export function errorKey(err: unknown): SKey {
  if (err instanceof ApiError && 'e_' + err.code in S) return ('e_' + err.code) as SKey
  return 'e_generic'
}

export const errorCode = (err: unknown) => (err instanceof ApiError ? err.code : 'GENERIC')

/** Shows an error toast in the current language. */
export const notifyError = (err: unknown) => toast(errorKey(err), 'error')
