import { useEffect, useState } from 'react'
import { create } from 'zustand'

/** Bumped after every change made through the API, so every mounted query refetches. */
const useRevision = create<{ rev: number }>(() => ({ rev: 0 }))
export const invalidate = () => useRevision.setState((s) => ({ rev: s.rev + 1 }))

interface QueryState<T> {
  key: string | null
  data?: T
  error?: unknown
  loading: boolean
}

/**
 * Minimal data fetching: runs `fetcher` when `key` changes (null = disabled), after any `invalidate()`,
 * and every `pollMs` if given. With `keepPrevious`, the last data stays visible while a new key loads.
 */
export function useQuery<T>(key: string | null, fetcher: () => Promise<T>, opts: { pollMs?: number; keepPrevious?: boolean } = {}) {
  const rev = useRevision((s) => s.rev)
  const [tick, setTick] = useState(0)
  const [state, setState] = useState<QueryState<T>>({ key: null, loading: key !== null })

  useEffect(() => {
    if (key === null) return
    let alive = true
    setState((s) => ({ ...s, loading: true }))
    fetcher().then(
      (data) => alive && setState({ key, data, loading: false }),
      (error: unknown) => alive && setState((s) => ({ ...s, key, error, loading: false })),
    )
    return () => {
      alive = false
    }
    // `fetcher` is a new closure each render; the key identifies what it fetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, rev, tick])

  useEffect(() => {
    if (!opts.pollMs || key === null) return
    const id = setInterval(() => setTick((x) => x + 1), opts.pollMs)
    return () => clearInterval(id)
  }, [opts.pollMs, key])

  const fresh = state.key === key
  return {
    data: key !== null && (fresh || opts.keepPrevious) ? state.data : undefined,
    error: fresh ? state.error : undefined,
    /** True only while nothing can be shown yet (first load, or a new key without keepPrevious). */
    loading: key !== null && (fresh || opts.keepPrevious ? state.loading && state.data === undefined : true),
    refreshing: state.loading,
    reload: () => setTick((x) => x + 1),
  }
}
