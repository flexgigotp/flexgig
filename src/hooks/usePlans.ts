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

// ── Module-level realtime subscription (singleton) ──────────────
// Only one channel ever exists, no matter how many usePlans() hooks
// are mounted. Every hook instance joins the same listener set.
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
  // Don't tear down the channel — keep it alive for future consumers.
}

// ── Hook ────────────────────────────────────────────────────────
export function usePlans() {
  const [plans, setPlans] = useState<DataPlan[]>(cache)
  const [isLoading, setIsLoading] = useState(cache.length === 0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    // Fresh cache → no fetch needed
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

    // Join the shared realtime listener set
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

  return {
    plans,
    isLoading,
    error,
    refetch: async () => {
      const fresh = await fetchPlans()
      setPlans(fresh)
    },
  }
}