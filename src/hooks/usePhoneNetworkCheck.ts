import { useCallback, useEffect } from 'react'
import { detectProvider, type ProviderId } from '@/lib/providers'
import { getConfirmedNetwork } from '@/services/phoneHistory'

const FULL_LENGTH = 11

/**
 * Prefetches the history-confirmed network as soon as the number is complete,
 * so `resolveNetwork` is usually instant by the time the user taps Continue.
 *
 * resolveNetwork order (same as vanilla checkout.js):
 *   1. network confirmed by real past transactions
 *   2. static prefix guess from detectProvider()
 */
export function usePhoneNetworkCheck(phone: string) {
  useEffect(() => {
    if (phone.length === FULL_LENGTH) void getConfirmedNetwork(phone)
  }, [phone])

  const resolveNetwork = useCallback(
    async (digits: string): Promise<ProviderId | null> => {
      const confirmed = await getConfirmedNetwork(digits)
      return confirmed ?? detectProvider(digits) ?? null
    },
    []
  )

  return { resolveNetwork }
}