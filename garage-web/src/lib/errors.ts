import { toast } from 'sonner'
import { T, type Dict } from '@/data/i18n-strings'
import { ApiError } from '@/lib/api'
import { useStore } from '@/store'

/** Translated message for an API error code (falls back to a generic message). */
export function errorText(err: unknown, t: Dict): string {
  if (err instanceof ApiError) {
    const msg = (t as unknown as Record<string, unknown>)['e_' + err.code]
    if (typeof msg === 'string') return msg
  }
  return t.e_GENERIC
}

export const errorCode = (err: unknown) => (err instanceof ApiError ? err.code : 'GENERIC')

/** Shows an error toast in the current language. */
export function notifyError(err: unknown) {
  toast.error(errorText(err, T[useStore.getState().lang]))
}
