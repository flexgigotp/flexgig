// src/lib/clearUserStorage.ts
//
// Single source of truth for "wipe everything that belongs to the
// signed-in user". Called on logout, and can also be called when a
// session is invalidated server-side (401).
//
// Deliberately does NOT call localStorage.clear() — that would nuke
// unrelated device-scoped preferences (theme, install prompt dismissal,
// analytics consent, etc.) that should persist across logins.

import { removePendingTx, clearKYCState } from './addMoneyStorage'
import { clearAllBiometricState } from './biometricStorage'

// Module-level (non-persisted) stores
import { useHistoryStore } from '@/stores/historyStore'
import { useUserStore } from '@/stores/userStore'
import { useDataPurchaseStore } from '@/stores/dataPurchaseStore'
import { useBiometricPromptStore } from '@/stores/biometricPromptStore'
import { usePushStore } from '@/hooks/usePush'

// Balance-visibility toggle (same key used by BalanceCard + SecuritySheet)
const BALANCE_VISIBLE_KEY = 'flexgig.balance.visible'

export function clearUserStorage(): void {
  // ── Persisted localStorage ─────────────────────────────────
  try {
    removePendingTx()
    clearKYCState()
    clearAllBiometricState()
    localStorage.removeItem('flexgig-data-purchase')
    localStorage.removeItem(BALANCE_VISIBLE_KEY)
  } catch {
    /* ignore */
  }

  // ── In-memory Zustand stores ───────────────────────────────
  try {
    useHistoryStore.getState().reset()
    useUserStore.getState().clearProfile()
    useDataPurchaseStore.getState().reset()
    useBiometricPromptStore.getState().dismiss()
    usePushStore.setState({
      ready: false,
      available: false,
      permission: 'unsupported',
      enabled: true,
      subscribed: false,
      busy: false,
    })
  } catch {
    /* ignore */
  }
}