// src/lib/addMoneyStorage.ts

const PENDING_TX_KEY = 'flexgig.pending_fund_tx'
const KYC_STATE_KEY = 'flexgig.kyc_verified'

export interface PendingTx {
  accountNumber: string
  bankName: string
  reference: string
  orderNo?: string
  amount: number
  expiresAt: string
  status: 'pending'
  savedAt?: string
}

export interface KYCBankAccount {
  accountNumber: string
  accountName: string | null
  bankName: string
  bankCode?: string | null
  currency: string
}

export interface KYCState {
  verified: boolean
  accounts: KYCBankAccount[]
}

// ── Pending TX ────────────────────────────────────────────────

export function savePendingTx(tx: PendingTx): void {
  try {
    localStorage.setItem(PENDING_TX_KEY, JSON.stringify(tx))
  } catch {
    /* ignore */
  }
}

export function removePendingTx(): void {
  try {
    localStorage.removeItem(PENDING_TX_KEY)
  } catch {
    /* ignore */
  }
}

export function getPendingTx(): PendingTx | null {
  try {
    const raw = localStorage.getItem(PENDING_TX_KEY)
    if (!raw) return null
    const tx = JSON.parse(raw) as PendingTx
    if (!tx?.expiresAt || !tx?.reference) return null

    const expiry = new Date(tx.expiresAt).getTime()
    if (Number.isNaN(expiry) || expiry <= Date.now()) {
      removePendingTx()
      return null
    }
    if ((tx.status || '').toLowerCase() !== 'pending') {
      removePendingTx()
      return null
    }
    return tx
  } catch {
    return null
  }
}

// ── KYC State ─────────────────────────────────────────────────

export function saveKYCState(accounts: KYCBankAccount[]): void {
  try {
    localStorage.setItem(
      KYC_STATE_KEY,
      JSON.stringify({ verified: true, accounts })
    )
  } catch {
    /* ignore */
  }
}

export function getKYCState(): KYCState | null {
  try {
    const raw = localStorage.getItem(KYC_STATE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as KYCState
  } catch {
    return null
  }
}

export function clearKYCState(): void {
  try {
    localStorage.removeItem(KYC_STATE_KEY)
  } catch {
    /* ignore */
  }
}