// src\hooks\useRealtimeSync.ts
import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { authenticateSupabaseClient } from '@/lib/supabaseAuth'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import { playPaymentSound } from '@/lib/sound'
import type { RecentDataTx } from '@/types/api'

export function useRealtimeSync() {
  const uid = useAuthStore((s) => s.user?.uid)
  const setBalance = useAuthStore((s) => s.setBalance)
  const setUser = useAuthStore((s) => s.setUser)
  const bumpTxVersion = useAuthStore((s) => s.bumpTxVersion)

  // Baseline for delta detection — initialized from store on uid change
  const lastBalanceRef = useRef<number | null>(null)

  useEffect(() => {
    if (!uid) return

    // Snapshot the session-provided balance as our starting point.
    // Any realtime increase after this is a genuine credit event.
    lastBalanceRef.current = useAuthStore.getState().balance

    let cancelled = false
    let walletChannel: ReturnType<typeof supabase.channel> | null = null
    let userChannel: ReturnType<typeof supabase.channel> | null = null
    let txChannel: ReturnType<typeof supabase.channel> | null = null

    async function start() {
      const ok = await authenticateSupabaseClient()
      if (cancelled) return
      if (!ok) {
        console.warn('[Realtime] Supabase auth failed — events will not arrive')
      }

      // ── 1. Wallet balance + credit alert ────────────────────────
      walletChannel = supabase
        .channel(`wallet:${uid}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_wallets',
            filter: `user_uid=eq.${uid}`,
          },
          (payload) => {
            const raw = (payload.new as { balance?: unknown } | null)?.balance
            const newBalance = Number(raw)
            if (Number.isNaN(newBalance)) return

            const prev = lastBalanceRef.current
            lastBalanceRef.current = newBalance
            setBalance(newBalance)

            // Only alert on an actual increase — ignore decreases, no-ops,
            // and the very first event after a fresh login/refresh.
            if (prev === null || newBalance <= prev) return

            const delta = newBalance - prev
            if (delta < 1) return // ignore sub-₦1 jitter

            // Fire the success toast + sound
            toast.success(
              `₦${delta.toLocaleString('en-NG', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} received!`,
              5000
            )
            playPaymentSound()
          }
        )
        .subscribe()

      // ── 2. User row (totals + recent_data_tx) ────────────────────
      userChannel = supabase
        .channel(`user:${uid}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `uid=eq.${uid}`,
          },
          (payload) => {
            const raw = payload.new as Record<string, unknown> | null
            if (!raw) return

            const current = useAuthStore.getState().user
            if (!current) return

            const recentDataTx = Array.isArray(raw.recent_data_tx)
              ? (raw.recent_data_tx as RecentDataTx[])
              : current.recentDataTx

            setUser({
              ...current,
              wallet_balance:
                typeof raw.wallet_balance === 'number'
                  ? Number(raw.wallet_balance)
                  : current.wallet_balance,
              allTimeIn: Number(raw.all_time_in ?? current.allTimeIn),
              allTimeOut: Number(raw.all_time_out ?? current.allTimeOut),
              totalDataTxCount: Number(
                raw.successful_data_tx_count ?? current.totalDataTxCount
              ),
              monthlyHistory: Array.isArray(raw.monthly_history)
                ? (raw.monthly_history as unknown[])
                : current.monthlyHistory,
              recentDataTx,
            })
          }
        )
        .subscribe()

      // ── 3. Transactions (invalidate list) ────────────────────────
      txChannel = supabase
        .channel(`tx:${uid}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${uid}`,
          },
          () => {
            bumpTxVersion()
          }
        )
        .subscribe()
    }

    void start()

    return () => {
      cancelled = true
      lastBalanceRef.current = null
      if (walletChannel) supabase.removeChannel(walletChannel)
      if (userChannel) supabase.removeChannel(userChannel)
      if (txChannel) supabase.removeChannel(txChannel)
    }
  }, [uid, setBalance, setUser, bumpTxVersion])
}