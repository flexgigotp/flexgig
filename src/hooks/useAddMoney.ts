// src/hooks/useAddMoney.ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { fundWalletApi, extractApiError } from '@/services/api'
import {
  getPendingTx,
  savePendingTx,
  removePendingTx,
  type PendingTx,
} from '@/lib/addMoneyStorage'
import { useAuthStore } from '@/stores/authStore'

export interface UseAddMoneyReturn {
  pending: PendingTx | null
  secondsLeft: number
  isLoading: boolean
  error: string | null
  createFundRequest: (amount: number) => Promise<boolean>
  verifyPending: () => Promise<{
    status:
      | 'completed'
      | 'pending'
      | 'failed'
      | 'expired'
      | 'rate_limited'
      | 'error'
    message: string
  }>
  cancelPending: () => void
  clearLocal: () => void
}

export function useAddMoney(): UseAddMoneyReturn {
  const [pending, setPending] = useState<PendingTx | null>(() =>
    getPendingTx()
  )
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setBalance = useAuthStore((s) => s.setBalance)
  const countdownRef = useRef<number | null>(null)

  // ── Countdown timer ─────────────────────────────────────────
  useEffect(() => {
    if (countdownRef.current) {
      window.clearInterval(countdownRef.current)
      countdownRef.current = null
    }

    if (!pending) {
      setSecondsLeft(0)
      return
    }

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.floor(
          (new Date(pending.expiresAt).getTime() - Date.now()) / 1000
        )
      )
      setSecondsLeft(remaining)

      if (remaining <= 0) {
        if (countdownRef.current) {
          window.clearInterval(countdownRef.current)
          countdownRef.current = null
        }
        removePendingTx()
        setPending(null)
      }
    }

    tick()
    countdownRef.current = window.setInterval(tick, 1000)

    return () => {
      if (countdownRef.current) {
        window.clearInterval(countdownRef.current)
        countdownRef.current = null
      }
    }
  }, [pending])

  // ── On mount: check server for a pending tx ──────────────────
  useEffect(() => {
    if (pending) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fundWalletApi.getPending()
        if (cancelled) return
        if (res.ok && res.data?.reference) {
          const tx: PendingTx = {
            accountNumber: res.data.accountNumber,
            bankName: res.data.bankName,
            reference: res.data.reference,
            amount: res.data.amount,
            expiresAt: res.data.expiresAt,
            status: 'pending',
          }
          savePendingTx(tx)
          setPending(tx)
        }
      } catch {
        /* no pending */
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Create new fund request ──────────────────────────────────
  const createFundRequest = useCallback(
    async (amount: number): Promise<boolean> => {
      setError(null)

      if (!Number.isFinite(amount) || amount < 100) {
        setError('Minimum deposit amount is ₦100.')
        return false
      }

      // Reuse any local pending — no server round-trip needed
      const existing = getPendingTx()
      if (existing) {
        setPending(existing)
        return true
      }

      // Loader fires here — before any await
      setIsLoading(true)

      try {
        // Check server for a pending too
        try {
          const check = await fundWalletApi.getPending()
          if (check.ok && check.data?.reference) {
            const tx: PendingTx = {
              accountNumber: check.data.accountNumber,
              bankName: check.data.bankName,
              reference: check.data.reference,
              amount: check.data.amount,
              expiresAt: check.data.expiresAt,
              status: 'pending',
            }
            savePendingTx(tx)
            setPending(tx)
            return true
          }
        } catch {
          /* fall through to create */
        }

        const res = await fundWalletApi.create(amount)
        const tx: PendingTx = {
          accountNumber: res.accountNumber,
          bankName: res.bankName,
          reference: res.reference,
          amount: res.amount,
          expiresAt: res.expiresAt,
          status: 'pending',
        }
        savePendingTx(tx)
        setPending(tx)
        return true
      } catch (err) {
        const { message, code } = extractApiError(err)
        if (code === 'PROFILE_INCOMPLETE') {
          setError(message || 'Please complete your profile first.')
        } else {
          setError(message || 'Failed to generate account.')
        }
        return false
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  // ── Verify pending ───────────────────────────────────────────
  const verifyPending = useCallback(async () => {
    const current = pending ?? getPendingTx()
    if (!current) {
      return { status: 'error' as const, message: 'No pending transaction' }
    }

    setIsLoading(true)
    try {
      const res = await fundWalletApi.verifyPending(current.reference)

      if (res.code === 'TX_EXPIRED') {
        removePendingTx()
        setPending(null)
        return {
          status: 'expired' as const,
          message: 'This account number has expired. Generate a new one.',
        }
      }

      if (res.code === 'RATE_LIMIT') {
        return {
          status: 'rate_limited' as const,
          message: 'Checking too fast — wait a few seconds and try again.',
        }
      }

      if (res.status === 'completed') {
        removePendingTx()
        setPending(null)
        if (typeof res.balance === 'number') {
          setBalance(res.balance)
        }
        return {
          status: 'completed' as const,
          message: 'Payment confirmed',
        }
      }

      if (res.status === 'failed') {
        removePendingTx()
        setPending(null)
        return {
          status: 'failed' as const,
          message: res.message || 'Payment failed',
        }
      }

      return {
        status: 'pending' as const,
        message: res.message || 'Payment still pending — please wait',
      }
    } catch (err) {
      const { message } = extractApiError(err)
      return {
        status: 'error' as const,
        message: message || 'Network error — try again',
      }
    } finally {
      setIsLoading(false)
    }
  }, [pending, setBalance])

  // ── Cancel pending (silent — no React state change) ─────────
  // Clears storage synchronously and fires the server cancel in the
  // background. Callers should navigate away immediately after.
  // Because we never call setPending(null), the sheet does NOT
  // re-render to the form view before it unmounts.
  const cancelPending = useCallback(() => {
    const current = pending ?? getPendingTx()
    if (!current) return

    removePendingTx()
    void fundWalletApi.cancel(current.reference).catch(() => null)
  }, [pending])

  const clearLocal = useCallback(() => {
    removePendingTx()
    setPending(null)
  }, [])

  return {
    pending,
    secondsLeft,
    isLoading,
    error,
    createFundRequest,
    verifyPending,
    cancelPending,
    clearLocal,
  }
}