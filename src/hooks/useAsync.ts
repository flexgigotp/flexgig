import { useEffect, useState, useCallback } from 'react'

interface UseAsyncState<T> {
  status: 'idle' | 'pending' | 'success' | 'error'
  data: T | null
  error: Error | null
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate = true
) {
  const [state, setState] = useState<UseAsyncState<T>>({
    status: 'idle',
    data: null,
    error: null,
  })

  const execute = useCallback(async (): Promise<T | null> => {
    setState({ status: 'pending', data: null, error: null })
    try {
      const result = await asyncFunction()
      setState({ status: 'success', data: result, error: null })
      return result
    } catch (error) {
      setState({ status: 'error', data: null, error: error as Error })
      return null
    }
  }, [asyncFunction])

  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [execute, immediate])

  return { ...state, execute }
}