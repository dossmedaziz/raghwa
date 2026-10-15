// Live notifications: keeps a Server-Sent Events connection to the garage's notification stream, so a new
// booking shows up the second it is made. fetch (not EventSource) so the token travels in the Authorization
// header rather than the URL.
import { useEffect, useRef } from 'react'
import { BASE, refreshTokens, session } from '@/lib/api'
import { invalidate } from '@/lib/query'
import type { NotificationDto } from '@/lib/types'

const MAX_BACKOFF_MS = 30_000

/** Calls `onEvent(type, data)` for each event of an SSE body until it ends. */
async function readEvents(body: ReadableStream<Uint8Array>, onEvent: (type: string, data: string) => void) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) return
    buf += decoder.decode(value, { stream: true }).replace(/\r\n?/g, '\n')
    let end: number
    while ((end = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, end)
      buf = buf.slice(end + 2)
      let type = 'message'
      const data: string[] = []
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) type = line.slice(6).trim()
        else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
      }
      onEvent(type, data.join('\n'))
    }
  }
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const id = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => { clearTimeout(id); resolve() }, { once: true })
  })

/**
 * While mounted, listens to the garage's new notifications: every mounted query refetches (bell, dashboard,
 * reservations) and `onNotification` runs. Reconnects on its own: right away when the server ends the stream
 * (it does when the access token expires), with backoff after network errors.
 */
export function useLiveNotifications(garageId: string | null, onNotification: (n: NotificationDto) => void) {
  const cb = useRef(onNotification)
  useEffect(() => {
    cb.current = onNotification
  })

  useEffect(() => {
    if (!garageId) return
    const ctrl = new AbortController()
    const { signal } = ctrl
    let failures = 0
    let connectedBefore = false

    void (async () => {
      while (!signal.aborted) {
        try {
          const token = session.get()?.accessToken
          if (!token) return
          const res = await fetch(`${BASE}/v1/owner/garages/${garageId}/notifications/stream`, {
            headers: { Accept: 'text/event-stream', Authorization: 'Bearer ' + token },
            signal,
          })
          if (res.status === 401) {
            // Expired access token: refresh and reconnect. A dead session is handled by the regular requests.
            if (await refreshTokens()) continue
            return
          }
          if (res.status === 404) return // not this owner's garage (switched account)
          if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
          await readEvents(res.body, (type, data) => {
            if (type === 'ready') {
              failures = 0
              // Events are not replayed: after a reconnection, refetch what may have been missed.
              if (connectedBefore) invalidate()
              connectedBefore = true
            } else if (type === 'notification') {
              invalidate()
              cb.current(JSON.parse(data) as NotificationDto)
            }
          })
        } catch {
          if (signal.aborted) return
          failures++
        }
        await sleep(failures ? Math.min(MAX_BACKOFF_MS, 1000 * 2 ** failures) : 0, signal)
      }
    })()

    return () => ctrl.abort()
  }, [garageId])
}
