import { useEffect, useRef, useState } from 'react'
import { create } from 'zustand'

/** Bumped after every change made through the API, so every mounted query refetches. */
const useRevision = create<{ rev: number }>(() => ({ rev: 0 }))
export const invalidate = () => useRevision.setState((s) => ({ rev: s.rev + 1 }))

/** Last result per key, so a screen opened again shows its data at once while it refreshes. */
const cache = new Map<string, unknown>()
export const clearCache = () => cache.clear()

/** Outcome of the last settled fetch; `ver` tells which run it belongs to. */
interface Result<T> {
  key: string | null
  ver: string
  data?: T
  error?: unknown
}

/**
 * Minimal data fetching: runs `fetcher` when `key` changes (null = disabled), after any `invalidate()`
 * and on `reload()`. With `keepPrevious`, the last data stays visible while a new key loads.
 */
export function useQuery<T>(key: string | null, fetcher: () => Promise<T>, opts: { keepPrevious?: boolean } = {}) {
  const rev = useRevision((s) => s.rev)
  const [tick, setTick] = useState(0)
  const [res, setRes] = useState<Result<T>>({ key: null, ver: '' })
  // `fetcher` is a new closure each render; the key identifies what it fetches.
  const fetchRef = useRef(fetcher)
  useEffect(() => {
    fetchRef.current = fetcher
  })
  const waiters = useRef<(() => void)[]>([])
  const ver = rev + ':' + tick

  useEffect(() => {
    if (key === null) return
    let alive = true
    fetchRef.current()
      .then(
        (data) => {
          cache.set(key, data)
          if (alive) setRes({ key, ver, data })
        },
        (error: unknown) => {
          if (alive) setRes((s) => ({ key, ver, data: s.key === key ? s.data : undefined, error }))
        },
      )
      .finally(() => {
        const w = waiters.current
        waiters.current = []
        w.forEach((f) => f())
      })
    return () => {
      alive = false
    }
  }, [key, ver])

  const fresh = res.key === key
  const settled = key !== null && fresh && res.ver === ver
  const data = key === null ? undefined
    : (fresh ? res.data : undefined) ?? (cache.get(key) as T | undefined) ?? (opts.keepPrevious ? res.data : undefined)
  return {
    data,
    error: fresh ? res.error : undefined,
    /** True only while nothing can be shown yet. */
    loading: key !== null && data === undefined && !settled,
    refreshing: key !== null && !settled,
    /** Refetches; resolves once the new data (or error) is in. */
    reload: () => new Promise<void>((resolve) => {
      if (key === null) return resolve()
      waiters.current.push(resolve)
      setTick((x) => x + 1)
    }),
  }
}
