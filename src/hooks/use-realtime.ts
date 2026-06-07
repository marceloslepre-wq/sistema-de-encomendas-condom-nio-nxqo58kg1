import { useEffect, useRef } from 'react'
import type { RecordModel, RecordSubscription } from 'pocketbase'

import pb from '@/lib/pocketbase/client'

/**
 * Hook for real-time subscriptions to a PocketBase collection.
 * ALWAYS use this hook instead of subscribing inline.
 * Uses the per-listener UnsubscribeFunc so multiple components
 * can safely subscribe to the same collection without conflicts.
 *
 * Generic over the record type: pass your collection's interface as
 * `useRealtime<MyRecord>(...)` to get a typed subscription payload
 * instead of `unknown`.
 */
export function useRealtime<TRecord extends RecordModel = RecordModel>(
  collectionName: string,
  callback: (data: RecordSubscription<TRecord>) => void,
  enabled: boolean = true,
) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!enabled) return

    let unsubscribeFn: (() => Promise<void>) | undefined
    let cancelled = false
    let retryTimeout: ReturnType<typeof setTimeout>

    const connect = () => {
      if (cancelled) return
      pb.collection<TRecord>(collectionName)
        .subscribe('*', (e) => {
          callbackRef.current(e)
        })
        .then((fn) => {
          if (cancelled) {
            fn().catch(() => {})
          } else {
            unsubscribeFn = fn
          }
        })
        .catch((err) => {
          if (!cancelled) {
            console.warn(`SSE subscription error for ${collectionName}, retrying in 3s...`, err)
            retryTimeout = setTimeout(connect, 3000)
          }
        })
    }

    connect()

    const handleReconnect = () => {
      if (cancelled) return
      if (unsubscribeFn) {
        unsubscribeFn().catch(() => {})
        unsubscribeFn = undefined
      }
      clearTimeout(retryTimeout)
      connect()
    }

    window.addEventListener('online', handleReconnect)
    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') handleReconnect()
    }
    document.addEventListener('visibilitychange', visibilityHandler)

    return () => {
      cancelled = true
      clearTimeout(retryTimeout)
      if (unsubscribeFn) {
        unsubscribeFn().catch(() => {})
      }
      window.removeEventListener('online', handleReconnect)
      document.removeEventListener('visibilitychange', visibilityHandler)
    }
  }, [collectionName, enabled])
}

export default useRealtime
