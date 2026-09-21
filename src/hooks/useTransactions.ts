import { useEffect, useState, useCallback } from 'react'
import { transactionsApi, extractApiError } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import type { Transaction, TransactionsResponse } from '@/types/api'

interface UseTransactionsResult {
  items: Transaction[]
  isLoading: boolean
  error: string | null
  refetch: () => void
  hasFetched: boolean
}

export function useTransactions(
  params: { limit?: number; totals?: '1' } = { limit: 10 }
): UseTransactionsResult {
  const [items, setItems] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasFetched, setHasFetched] = useState(false)

  // Realtime-driven invalidation counter. Including this in the fetch
  // useCallback deps is what causes the effect below to re-run whenever
  // realtime bumps the version — no separate effect, no ref, no drift.
  const txVersion = useAuthStore((s) => s.txVersion)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data: TransactionsResponse = await transactionsApi.list(params)
      setItems(data.items || [])
      setHasFetched(true)
    } catch (err) {
      const { message, status } = extractApiError(err)
      if (status === 401) {
        setItems([])
      } else {
        setError(message)
      }
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.limit, params.totals, txVersion])

  // Fetch on mount AND whenever txVersion changes (realtime invalidation).
  // Because `fetch` includes txVersion in its deps, a realtime bump
  // changes fetch's identity and re-runs this effect.
  useEffect(() => {
    void fetch()
  }, [fetch])

  // Refetch after a successful reauth.
  // When this hook first runs while the reauth lock is active, the
  // request 423s and we cache the "Reauthentication required" error
  // forever. ReauthManager fires this event when the lock clears so
  // we can retry and replace the stale error with real data.
  useEffect(() => {
    const onCleared = () => {
      void fetch()
    }
    window.addEventListener('session:reauth-cleared', onCleared)
    return () => {
      window.removeEventListener('session:reauth-cleared', onCleared)
    }
  }, [fetch])

  return {
    items,
    isLoading,
    error,
    hasFetched,
    refetch: fetch,
  }
}