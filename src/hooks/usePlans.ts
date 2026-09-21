import { useEffect, useState } from 'react'
import { plansApi } from '@/services/api'
import { supabase } from '@/lib/supabase'
import type { DataPlan } from '@/types/api'

const CACHE_TTL_MS = 5 * 60 * 1000

// ── Module-level plan cache ──────────────────────────────────────
let cache: DataPlan[] = []
let cacheFetchedAt = 0
let inFlight: Promise<DataPlan[]> | null = null

async function fetchPlans(): Promise<DataPlan[]> {
  if (inFlight) return inFlight
  inFlight = plansApi
    .list()
    .then((fresh) => {
      cache = fresh
      cacheFetchedAt = Date.now()
      return fresh
    })
    .finally(() => {
      inFlight = null
    })
  return inFlight
}

// ✅ Let the reauth-cleared handler blow the cache away so the next
// mount doesn't serve a stale list from before the lock was active.
function invalidatePlanCache() {
  cache = []
  cacheFetchedAt = 0
}

// ── Module-level realtime subscription (singleton) ──────────────
type Listener = (plans: DataPlan[]) => void
const listeners = new Set<Listener>()
let channel: ReturnType<typeof supabase.channel> | null = null
let refetchTimer: number | null = null

function ensureRealtimeSubscription() {
  if (channel) return

  channel = supabase
    .channel('data_plans_changes_singleton')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'data_plans' },
      () => {
        if (refetchTimer) window.clearTimeout(refetchTimer)
        refetchTimer = window.setTimeout(async () => {
          try {
            const fresh = await fetchPlans()
            listeners.forEach((fn) => fn(fresh))
          } catch {
            // silent — cache stays valid
          }
        }, 800)
      }
    )
    .subscribe()
}

function addListener(fn: Listener) {
  ensureRealtimeSubscription()
  listeners.add(fn)
}

function removeListener(fn: Listener) {
  listeners.delete(fn)
}

// ── Hook ────────────────────────────────────────────────────────
export function usePlans() {
  const [plans, setPlans] = useState<DataPlan[]>(cache)
  const [isLoading, setIsLoading] = useState(cache.length === 0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (cache.length > 0 && Date.now() - cacheFetchedAt < CACHE_TTL_MS) {
      setPlans(cache)
      setIsLoading(false)
    } else {
      setIsLoading(true)
      fetchPlans()
        .then((fresh) => {
          if (cancelled) return
          setPlans(fresh)
          setError(null)
        })
        .catch((err) => {
          if (cancelled) return
          setError(err?.message || 'Failed to load plans')
        })
        .finally(() => {
          if (cancelled) return
          setIsLoading(false)
        })
    }

    const onChange: Listener = (fresh) => {
      if (cancelled) return
      setPlans(fresh)
    }
    addListener(onChange)

    return () => {
      cancelled = true
      removeListener(onChange)
    }
  }, [])

  // ✅ Retry after a successful reauth.
  // The initial fetch may have hit a 423 and set `error` — nothing
  // would have cleared it until a full reload remounted this hook.
  useEffect(() => {
    let cancelled = false
    const onCleared = () => {
      // Cache might be empty (the failed fetch never populated it) or
      // stale. Wipe it so the next read is guaranteed fresh.
      invalidatePlanCache()
      setIsLoading(true)
      setError(null)
      fetchPlans()
        .then((fresh) => {
          if (cancelled) return
          setPlans(fresh)
          listeners.forEach((fn) => fn(fresh))
        })
        .catch((err) => {
          if (cancelled) return
          setError(err?.message || 'Failed to load plans')
        })
        .finally(() => {
          if (cancelled) return
          setIsLoading(false)
        })
    }
    window.addEventListener('session:reauth-cleared', onCleared)
    return () => {
      cancelled = true
      window.removeEventListener('session:reauth-cleared', onCleared)
    }
  }, [])

  return {
    plans,
    isLoading,
    error,
    refetch: async () => {
      invalidatePlanCache()
      setError(null)
      try {
        const fresh = await fetchPlans()
        setPlans(fresh)
      } catch (err: unknown) {
        setError(
          (err as { message?: string })?.message || 'Failed to load plans'
        )
        throw err
      }
    },
  }
}