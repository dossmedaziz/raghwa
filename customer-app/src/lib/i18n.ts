import { useMemo } from 'react'
import { S, type SKey } from '@/data/strings'
import { useStore } from '@/store'

export type Dict = { [K in SKey]: string }

/**
 * Current language + its strings.
 * RTL is applied with the `direction` layout style (see App.tsx), not I18nManager,
 * so switching language is instant and works in Expo Go.
 */
export function useT() {
  const L = useStore((s) => s.lang)
  return useMemo(() => {
    const ar = L === 'ar'
    const li = ar ? 0 : 1
    const t = {} as Dict
    for (const k in S) t[k as SKey] = S[k as SKey][li]
    const tr = (k: SKey, o: Record<string, string | number>) => S[k][li].replace(/\{(\w+)\}/g, (_, x) => String(o[x]))
    return { L, ar, li, t, tr, dir: (ar ? 'rtl' : 'ltr') as 'rtl' | 'ltr' }
  }, [L])
}
