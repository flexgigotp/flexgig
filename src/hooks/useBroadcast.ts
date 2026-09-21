// src/hooks/useBroadcast.ts
import { useEffect, useState } from 'react'

export interface ActiveBroadcast {
  id: string
  message: string
  level: 'info' | 'warning' | 'error'
  url?: string | null
  sticky?: boolean
}

interface UseBroadcastResult {
  broadcast: ActiveBroadcast | null
}

export function useBroadcast(): UseBroadcastResult {
  const [broadcast, setBroadcast] = useState<ActiveBroadcast | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/broadcasts/active', {
          credentials: 'include',
          cache: 'no-store',
        })
        if (!res.ok) return
        const json = await res.json()
        const rows: ActiveBroadcast[] = json?.broadcasts || []
        if (!cancelled) {
          setBroadcast(rows[0] || null)
        }
      } catch {
        // Silent — banner is non-critical
      }
    }

    load()
    const interval = setInterval(load, 60_000) // refresh every minute
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return { broadcast }
}