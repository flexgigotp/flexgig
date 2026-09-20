import { useEffect, useState, useCallback, useRef } from 'react'
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

  // Realtime-driven invalidation counter
  const txVersion = useAuthStore((s) => s.txVersion)
  const versionRef = useRef(txVersion)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data: TransactionsResponse = await transactionsApi.list(params)
      setItems(data.items || [])
      setHasFetched(true)
      versionRef.current = txVersion
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
  }, [params.limit, params.totals])

  // Initial fetch
  useEffect(() => {
    fetch()
  }, [fetch])

  // Refetch whenever realtime bumps the version
  useEffect(() => {
    if (txVersion !== versionRef.current) {
      fetch()
    }
  }, [txVersion, fetch])

  return {
    items,
    isLoading,
    error,
    hasFetched,
    refetch: fetch,
  }
}