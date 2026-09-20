import { create } from 'zustand'
import type { SessionUser } from '@/types/api'

interface AuthState {
  user: SessionUser | null
  balance: number
  reauthRequired: boolean | null
  isLoading: boolean
  hasFetched: boolean
  lastFetchedAt: number
  error: string | null

  /** Increments every time a transaction row for this user changes. */
  txVersion: number

  setUser: (user: SessionUser | null) => void
  setBalance: (balance: number) => void
  setReauthRequired: (v: boolean) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  bumpTxVersion: () => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  balance: 0,
  reauthRequired: null,
  isLoading: false,
  hasFetched: false,
  lastFetchedAt: 0,
  error: null,
  txVersion: 0,

  setUser: (user) =>
    set((prev) => ({
      user,
      balance:
        typeof user?.wallet_balance === 'number'
          ? user.wallet_balance
          : prev.balance,
      hasFetched: true,
      lastFetchedAt: Date.now(),
      error: null,
    })),

  setBalance: (balance) => set({ balance }),

  setReauthRequired: (reauthRequired) => set({ reauthRequired }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  bumpTxVersion: () => set((s) => ({ txVersion: s.txVersion + 1 })),

  clear: () =>
    set({
      user: null,
      balance: 0,
      reauthRequired: null,
      isLoading: false,
      hasFetched: false,
      lastFetchedAt: 0,
      error: null,
      txVersion: 0,
    }),
}))

export const authStore = useAuthStore