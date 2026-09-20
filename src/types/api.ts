// src/types/api.ts

// ============================================================
// SESSION
// ============================================================

export interface KycAccount {
  accountNumber: string
  accountName: string
  bankName: string
  bankCode: string
  currency: string
}

export interface RecentDataTx {
  phone: string
  provider: string
  data_amount?: string
  dataAmount?: string
  amount?: number
  status: string
  reference?: string
  created_at?: string
  category?: string
  description?: string
}

export type KycStatus = 'none' | 'pending' | 'verified'

export interface SessionUser {
  uid: string
  email: string
  username?: string
  fullName: string
  firstName: string
  phoneNumber?: string | null
  address?: string | null
  profilePicture?: string
  fullNameEdited: boolean
  lastUsernameUpdate: string | null
  hasPin: boolean
  hasBiometrics: boolean
  profileCompleted: boolean
  wallet_balance: number
  wallet_seq: number
  monthlyHistory: unknown[]
  allTimeIn: number
  allTimeOut: number
  totalDataTxCount: number
  kycStatus: KycStatus
  is_pos_agent: boolean
  is_admin: boolean
  kycAccounts: KycAccount[]
  recentDataTx: RecentDataTx[]
}

export interface SessionResponse {
  message: string
  user: SessionUser
  token: string
  reauthRequired: boolean
}

export interface SessionLightResponse {
  uid: string
  email: string
  reauthRequired: boolean
}

// ============================================================
// TRANSACTIONS
// ============================================================

export type TransactionType = 'credit' | 'debit' | 'data' | 'refund'
export type TransactionStatus = 'success' | 'pending' | 'failed' | 'refund'

export interface Transaction {
  id: string
  user_uid: string
  type: TransactionType
  amount: number
  description: string
  reference: string | null
  created_at: string
  phone: string | null
  provider: string | null
  plan_id: string | null
  data_amount: string | null
  category: string | null
  status: TransactionStatus
}

export interface TransactionsResponse {
  items: Transaction[]
  page: number
  limit: number
  total: number
  totalPages: number
  totals: { in: number; out: number }
}

// ============================================================
// DATA PLANS
// ============================================================

export type PlanCategory =
  | 'AWOOF'
  | 'CG'
  | 'DATA SHARE'
  | 'GIFTING'
  | 'SPECIAL'
  | 'STANDARD'

export interface DataPlan {
  id: number
  provider: string
  plan_id: string
  name: string
  category: string
  price: number
  data_amount: string
  duration: string
  active: boolean
  updated_at: string
  debt_risk: boolean
  // Special-plan gating (only present on MTN SPECIAL plans)
  daily_available_slots?: number
  daily_purchase_count?: number
  monthly_sold_out?: boolean
}

// ============================================================
// API ERROR SHAPE
// ============================================================

export interface ApiErrorBody {
  error?: {
    message?: string
    code?: string
  }
  message?: string
  code?: string
}