// src/services/api.ts
import axios, { AxiosError, AxiosRequestConfig } from 'axios'
import type {
  SessionResponse,
  SessionLightResponse,
  TransactionsResponse,
  DataPlan,
} from '@/types/api'

/**
 * In dev / preview / ngrok, we use the Vite proxy so requests go to
 * the same origin (localhost:4173) and avoid cross-site cookie issues.
 * In production, we hit the real backend directly.
 */
const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.endsWith('.ngrok-free.app') ||
    window.location.hostname.endsWith('.ngrok.app') ||
    window.location.hostname.endsWith('.ngrok-free.dev') ||
    window.location.hostname.endsWith('.ngrok.io'))

const API_BASE = isLocalhost
  ? '' // relative → Vite proxy forwards it to api.flexgig.com.ng
  : import.meta.env.VITE_BACKEND_URL || 'https://api.flexgig.com.ng'

// ============================================================
// AXIOS INSTANCE
// ============================================================

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // sends HttpOnly cookies (token, rt, connect.sid)
  timeout: 30_000,
  headers: {
    Accept: 'application/json',
  },
})

// ============================================================
// REQUEST INTERCEPTOR
// - adds CSRF-protection header the backend requires for mutations
// ============================================================

api.interceptors.request.use((config) => {
  config.headers = config.headers ?? {}
  config.headers['X-Requested-With'] = 'XMLHttpRequest'
  return config
})

// ============================================================
// RESPONSE INTERCEPTOR
// - 401 → refresh once, then retry original request
// - 423 → reauth required (dispatch event)
// - refresh failure → dispatch session:expired
// ============================================================

type RetriableConfig = AxiosRequestConfig & { _retry?: boolean }

let isRefreshing = false
let pendingQueue: Array<(token?: string) => void> = []

function flushQueue(token?: string) {
  pendingQueue.forEach((cb) => cb(token))
  pendingQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status
    const original = error.config as RetriableConfig | undefined

    // ---- 423: backend says reauth is required ----
    if (status === 423) {
      window.dispatchEvent(
        new CustomEvent('session:reauth-required', {
          detail: error.response?.data ?? null,
        })
      )
      return Promise.reject(error)
    }


        // ---- 401: try a silent refresh, then retry once ----
    // Skip refresh for auth endpoints — a 401 there means wrong credentials,
    // not an expired session.
    const AUTH_SKIP = [
      '/auth/login',
      '/auth/send-otp',
      '/auth/resend-otp',
      '/auth/verify-otp',
      '/auth/check-email',
      '/auth/set-password',
    ]
    const url = original?.url || ''
    const isAuthEndpoint = AUTH_SKIP.some((p) => url.includes(p))

    if (status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true

      // Already refreshing → queue this request until refresh completes
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push((token) => {
            if (!token) {
              reject(error)
              return
            }
            original.headers = original.headers ?? {}
            ;(original.headers as Record<string, string>)['Authorization'] =
              `Bearer ${token}`
            resolve(api(original))
          })
        })
      }

      isRefreshing = true

      try {
        // Direct axios call (bypasses our interceptor to avoid loops)
        const refreshRes = await axios.post(
          `${API_BASE}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
          }
        )

        const newToken: string | undefined = refreshRes.data?.token
        if (!newToken) throw new Error('Refresh returned no token')

        flushQueue(newToken)

        original.headers = original.headers ?? {}
        ;(original.headers as Record<string, string>)['Authorization'] =
          `Bearer ${newToken}`

        return api(original)
      } catch (refreshErr) {
        flushQueue(undefined)
        window.dispatchEvent(new CustomEvent('session:expired'))
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// ============================================================
// TYPED ENDPOINT HELPERS
// ============================================================

export const authApi = {
  /** Full session: user object + balance + stats + recent tx */
  session: (): Promise<SessionResponse> =>
    api.get<SessionResponse>('/api/session').then((r) => r.data),

  /** Light session: uid + email only. Faster for polling. */
  sessionLight: (): Promise<SessionLightResponse> =>
    api
      .get<SessionLightResponse>('/api/session', { params: { light: 'true' } })
      .then((r) => r.data),

  /** Clears cookies + session on the backend */
  logout: (): Promise<{ message: string; success: boolean }> =>
    api.post('/auth/logout').then((r) => r.data),
}

export const transactionsApi = {
  list: (params?: {
    page?: number
    limit?: number
    type?: string
    from?: string
    to?: string
    search?: string
    totals?: '1'
  }): Promise<TransactionsResponse> =>
    api.get<TransactionsResponse>('/api/transactions', { params }).then((r) => r.data),
}

export const plansApi = {
  list: (params?: { provider?: string; category?: string }): Promise<DataPlan[]> =>
    api.get<DataPlan[]>('/api/dataPlans', { params }).then((r) => r.data),
}

// ============================================================
// FUND WALLET (Add Money — temporary VA)
// ============================================================

export interface FundWalletCreateResponse {
  accountNumber: string
  bankName: string
  reference: string
  amount: number
  expiresAt: string
  status: 'pending'
  reused?: boolean
}

export interface FundWalletPendingResponse {
  ok: boolean
  data?: {
    accountNumber: string
    bankName: string
    reference: string
    amount: number
    expiresAt: string
    status: 'pending'
  }
  message?: string
}

export interface FundWalletVerifyResponse {
  status?: 'pending' | 'completed' | 'failed' | 'error'
  code?: string
  message?: string
  amount?: number
  balance?: number
}

export const fundWalletApi = {
  create: (amount: number): Promise<FundWalletCreateResponse> =>
    api
      .post<FundWalletCreateResponse>('/api/fund-wallet', { amount })
      .then((r) => r.data),

  getPending: (): Promise<FundWalletPendingResponse> =>
    api
      .get<FundWalletPendingResponse>('/api/fund-wallet/pending')
      .then((r) => r.data),

  verifyPending: (reference: string): Promise<FundWalletVerifyResponse> =>
    api
      .post<FundWalletVerifyResponse>(
        '/api/fund-wallet/verify-pending',
        { reference }
      )
      .then((r) => r.data),

  cancel: (reference: string): Promise<{ message: string }> =>
    api
      .post<{ message: string }>(`/api/fund-wallet/cancel/${reference}`)
      .then((r) => r.data),
}

// ============================================================
// KYC
// ============================================================

export interface KYCAccountsResponse {
  ok: boolean
  kycStatus: 'none' | 'pending' | 'verified'
  accounts: Array<{
    account_number?: string
    account_name?: string | null
    bank_name?: string
    bank_code?: string | null
    currency?: string
    accountNumber?: string
    accountName?: string | null
    bankName?: string
    bankCode?: string | null
  }>
}

export interface KYCSubmitResponse {
  ok: boolean
  verified?: boolean
  alreadyVerified?: boolean
  accounts?: Array<{
    // Camel-case (primary success path)
    accountNumber?: string
    accountName?: string | null
    bankName?: string
    bankCode?: string | null
    currency?: string
    // Snake-case (alreadyVerified / getAccounts paths)
    account_number?: string
    account_name?: string | null
    bank_name?: string
    bank_code?: string | null
  }>
  code?: string
  message?: string
}

export const kycApi = {
  submit: (
    type: 'BVN' | 'NIN',
    number: string
  ): Promise<KYCSubmitResponse> =>
    api
      .post<KYCSubmitResponse>('/api/kyc/submit', { type, number })
      .then((r) => r.data),

  getAccounts: (): Promise<KYCAccountsResponse> =>
    api.get<KYCAccountsResponse>('/api/kyc/accounts').then((r) => r.data),
}

export const walletApi = {
  async transfer(params: {
    recipient: string
    amount: number
    pinToken: string
    isBorrow?: boolean
  }): Promise<{
    ok: boolean
    reference?: string
    newBalance?: number
    isBorrow?: boolean
    error?: string
    insufficient?: boolean
    status?: number
  }> {
    try {
      // The transfer endpoint requires a Bearer token — grab one from
      // the session endpoint (cookies alone aren't enough there).
      const sessionRes = await api.get('/api/session')
      const sessionToken = sessionRes.data?.token
      if (!sessionToken) {
        return {
          ok: false,
          error: 'Session expired. Please log in again.',
          status: 401,
        }
      }

      const idempotencyKey =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      const res = await api.post(
        '/api/wallet/transfer',
        {
          recipient: params.recipient,
          amount: params.amount,
          ...(params.isBorrow ? { isBorrow: true } : {}),
        },
        {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            'X-PIN-TOKEN': params.pinToken,
            'X-Idempotency-Key': idempotencyKey,
          },
        }
      )

      const data = res.data || {}
      return {
        ok: true,
        reference: data.reference,
        newBalance: data.newBalance ?? data.new_balance,
        isBorrow: data.isBorrow,
        status: res.status,
      }
    } catch (err: unknown) {
      const body = (err as { response?: { data?: unknown; status?: number } })
        ?.response
      const status = body?.status
      const data = body?.data as
        | { error?: string; message?: string; code?: string }
        | undefined

      const message =
        data?.error || data?.message || 'Transfer failed'
      const insufficient =
        typeof message === 'string' &&
        message.toLowerCase().includes('insufficient')

      return {
        ok: false,
        error: message,
        insufficient,
        status,
      }
    }
  },
}

export const dataApi = {
  async buyData(params: {
    planId: string
    phone: string
    provider: string
    pinToken: string
  }): Promise<{
    ok: boolean
    reference?: string
    newBalance?: number
    status?: string
    message?: string
    error?: string
    insufficient?: boolean
    httpStatus?: number
  }> {
    try {
      const res = await api.post(
        '/api/transactions/buy-data',
        {
          plan_id: params.planId,
          phone: params.phone,
          provider: params.provider.toUpperCase(),
        },
        {
          headers: {
            'X-PIN-TOKEN': params.pinToken,
          },
        }
      )

      const data = res.data || {}
      return {
        ok: true,
        reference: data.reference,
        newBalance: data.new_balance,
        status: data.status,
        message: data.message,
        httpStatus: res.status,
      }
    } catch (err: unknown) {
      const body = (err as { response?: { data?: unknown; status?: number } })
        ?.response
      const status = body?.status
      const data = body?.data as
        | {
            error?: string
            message?: string
            code?: string
            current_balance?: number
          }
        | undefined

      const message = data?.error || data?.message || 'Purchase failed'
      const insufficient =
        typeof message === 'string' &&
        (message.toLowerCase().includes('insufficient') ||
          data?.code === 'INSUFFICIENT_BALANCE')

      return {
        ok: false,
        error: message,
        insufficient,
        httpStatus: status,
      }
    }
  },

  async findByReference(reference: string): Promise<{
    ok: boolean
    status?: string
    description?: string
    newBalance?: number
  }> {
    try {
      const res = await api.get('/api/transactions', {
        params: { limit: 20 },
      })
      const items = res.data?.items || []
      const match = items.find(
        (tx: { reference?: string; id?: string }) =>
          tx.reference === reference || tx.id === reference
      )
      if (!match) return { ok: false }
      return {
        ok: true,
        status: match.status,
        description: match.description,
        newBalance: match.new_balance,
      }
    } catch {
      return { ok: false }
    }
  },
}

export const reauthApi = {
  /** Verify the user's PIN specifically for reauth. */
  async reauthWithPin(
    pin: string,
    userId: string
  ): Promise<{ ok: boolean; code?: string; message?: string }> {
    try {
      await api.post('/api/reauth-pin', { userId, pin })
      return { ok: true }
    } catch (err) {
      const body = (err as {
        response?: {
          data?: {
            error?: { message?: string; code?: string }
            code?: string
            message?: string
          }
        }
      })?.response?.data
      return {
        ok: false,
        code: body?.error?.code || body?.code,
        message: body?.error?.message || body?.message || 'Incorrect PIN',
      }
    }
  },

  /** Tell the backend to create a reauth lock. */
  async require(reason: string): Promise<void> {
    try {
      await api.post('/reauth/require', { reason })
    } catch (e) {
      console.warn('[reauth] failed to set server lock:', e)
    }
  },

  /** Is a reauth lock currently active? */
  async checkStatus(): Promise<boolean> {
    try {
      const res = await api.get('/reauth/status')
      return !!res.data?.reauthRequired
    } catch {
      return false
    }
  },

  /** Clear the lock — call after a successful PIN/biometric. */
  async complete(): Promise<void> {
    try {
      await api.post('/reauth/complete')
    } catch {
      // best-effort
    }
  },
}

// ============================================================
// ERROR UTILITY
// ============================================================

export function extractApiError(err: unknown): {
  message: string
  code: string | null
  status: number | null
} {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as
      | { error?: { message?: string; code?: string }; message?: string; code?: string }
      | undefined
    const message =
      body?.error?.message ||
      body?.message ||
      err.message ||
      'Something went wrong'
    const code = body?.error?.code || body?.code || null
    const status = err.response?.status ?? null
    return { message, code, status }
  }

  if (err instanceof Error) {
    return { message: err.message, code: null, status: null }
  }

  return { message: 'Something went wrong', code: null, status: null }
}

// ============================================================
// ACCOUNT (security)
// ============================================================

export const accountApi = {
  /** Change password — requires current password. Fails with NO_CURRENT_PASSWORD for OAuth-only users. */
  changePassword: (
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string }> =>
    api
      .post<{ message: string }>('/api/change-password', {
        currentPassword,
        newPassword,
      })
      .then((r) => r.data),

  /** Set password after OTP verification (used for OAuth users). */
  setPassword: (uid: string, password: string): Promise<{ message: string }> =>
    api
      .post<{ message: string }>('/auth/set-password', { uid, password })
      .then((r) => r.data),

  /** Send OTP to email (used for reset / set password flows). */
  sendOtp: (email: string): Promise<{ status: string }> =>
    api
      .post<{ status: string }>('/auth/send-otp', { email })
      .then((r) => r.data),

  /** Verify OTP — returns a short-lived token the user can use to set a new password. */
  verifyOtp: (
    email: string,
    token: string
  ): Promise<{ message: string; token: string }> =>
    api
      .post<{ message: string; token: string }>('/auth/verify-otp', {
        email,
        token,
      })
      .then((r) => r.data),
}

// ============================================================
// WEBAUTHN (biometrics)
// ============================================================

export type BiometricAction = 'reauth' | 'buy-data' | 'transfer' | 'withdrawal'

export interface WebAuthnRegisterOptionsResponse {
  challenge: string
  rp: { name: string; id: string }
  user: { id: string; name: string; displayName: string }
  pubKeyCredParams: Array<{ alg: number; type: 'public-key' }>
  timeout: number
  attestation: string
  authenticatorSelection?: Record<string, unknown>
  excludeCredentials?: Array<{ id: string; type: 'public-key' }>
  [key: string]: unknown
}

export interface WebAuthnAuthOptionsResponse {
  challenge: string
  rpId: string
  timeout: number
  userVerification: string
  allowCredentials: Array<{
    id: string
    type: 'public-key'
    transports?: AuthenticatorTransport[]
  }>
  [key: string]: unknown
}

export interface WebAuthnAuthenticator {
  id: string
  credential_id: string
  attestation_type: string | null
  transports: string | null
  created_at: string
}

export const webauthnApi = {
  registerOptions: (
    userId: string,
    username: string,
    displayName: string
  ): Promise<WebAuthnRegisterOptionsResponse> =>
    api
      .post<WebAuthnRegisterOptionsResponse>('/webauthn/register/options', {
        userId,
        username,
        displayName,
      })
      .then((r) => r.data),

  registerVerify: (
    userId: string,
    credential: unknown
  ): Promise<{ verified: boolean; credentialId: string }> =>
    api
      .post<{ verified: boolean; credentialId: string }>(
        '/webauthn/register/verify',
        { userId, credential }
      )
      .then((r) => r.data),

  authOptions: (userId: string): Promise<WebAuthnAuthOptionsResponse> =>
    api
      .post<WebAuthnAuthOptionsResponse>('/webauthn/auth/options', { userId })
      .then((r) => r.data),

  authVerify: (
    userId: string,
    credential: unknown,
    action: BiometricAction
  ): Promise<{ verified: boolean; token?: string }> =>
    api
      .post<{ verified: boolean; token?: string }>('/webauthn/auth/verify', {
        userId,
        credential,
        action,
      })
      .then((r) => r.data),

  list: (userId: string): Promise<WebAuthnAuthenticator[]> =>
    api
      .get<WebAuthnAuthenticator[]>(`/webauthn/authenticators/${userId}`)
      .then((r) => r.data),

  revoke: (userId: string, credentialID: string | null): Promise<{ ok: boolean }> =>
    api
      .post<{ ok: boolean }>(
        `/webauthn/authenticators/${userId}/revoke`,
        { credentialID }
      )
      .then((r) => r.data),
}

export default api