// src/hooks/useSession.ts
import { useEffect, useCallback } from 'react'
import { authApi, extractApiError } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { getKYCState, saveKYCState } from '@/lib/addMoneyStorage'

/**
 * How long we trust a fetched session before refetching.
 * Matches the backend's own 5-minute cache TTL.
 */
const SESSION_TTL_MS = 5 * 60 * 1000

// Module-level promise used to dedupe concurrent fetches across all hooks.
let inFlight: Promise<void> | null = null

export function useSession() {
  const user = useAuthStore((s) => s.user)
  const balance = useAuthStore((s) => s.balance)
  const isLoading = useAuthStore((s) => s.isLoading)
  const hasFetched = useAuthStore((s) => s.hasFetched)
  const lastFetchedAt = useAuthStore((s) => s.lastFetchedAt)
  const error = useAuthStore((s) => s.error)

  const setReauthRequired = useAuthStore((s) => s.setReauthRequired)
  const setUser = useAuthStore((s) => s.setUser)
  const setLoading = useAuthStore((s) => s.setLoading)
  const setError = useAuthStore((s) => s.setError)
  const clear = useAuthStore((s) => s.clear)

  const fetchSession = useCallback(
    async (opts: { force?: boolean } = {}) => {
      const { force = false } = opts

      // Cache hit
      if (
        !force &&
        useAuthStore.getState().hasFetched &&
        Date.now() - useAuthStore.getState().lastFetchedAt < SESSION_TTL_MS
      ) {
        return
      }

      // Dedupe concurrent fetches
      if (inFlight) {
        await inFlight
        return
      }

      setLoading(true)

      inFlight = (async () => {
        try {
          const data = await authApi.session()
          setUser(data.user)
          setReauthRequired(data.reauthRequired === true)

          // ── Seed KYC state from session ──────────────────────────
          // Makes the Add Money / KYC sheets reflect reality immediately
          // on login or reload without an extra network call.
          // Only writes if the user isn't already marked verified locally.
          if (
            data.user.kycStatus === 'verified' &&
            Array.isArray(data.user.kycAccounts) &&
            data.user.kycAccounts.length > 0
          ) {
            const existing = getKYCState()
            if (!existing?.verified) {
              saveKYCState(data.user.kycAccounts)
            }
          }
          // ────────────────────────────────────────────────────────
        } catch (err) {
          const { message, status } = extractApiError(err)

          // 401 = not logged in. Not an error — just clear state.
          if (status === 401) {
            clear()
            return
          }

          // Anything else → surface as error but keep any existing user
          setError(message)
        } finally {
          setLoading(false)
          inFlight = null
        }
      })()

      await inFlight
    },
    [setUser, setReauthRequired, setLoading, setError, clear]
  )

  // Auto-fetch on mount when we don't have fresh data
  useEffect(() => {
    if (
      !hasFetched ||
      Date.now() - lastFetchedAt > SESSION_TTL_MS
    ) {
      fetchSession()
    }
  }, [hasFetched, lastFetchedAt, fetchSession])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch (err) {
      console.warn('[useSession] logout backend call failed:', err)
    } finally {
      const { resetSupabaseAuth } = await import('@/lib/supabaseAuth')
      resetSupabaseAuth()
      const { supabase } = await import('@/lib/supabase')
      void supabase.auth.signOut().catch(() => null)
      clear()
    }
  }, [clear])

  return {
    user,
    balance,
    isLoading,
    hasFetched,
    error,
    refetch: () => fetchSession({ force: true }),
    logout,
  }
}