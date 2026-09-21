import { api, extractApiError } from '@/services/api'

export interface PinVerifyResult {
  ok: boolean
  code?: string
  message?: string
  pinToken?: string
  lockoutUntil?: string | null
  attemptsLeft?: number
}

export const pinApi = {
  async hasPin(): Promise<boolean> {
    const res = await api.post('/api/check-pin')
    return !!res.data?.hasPin
  },

  async savePin(pin: string): Promise<{ ok: boolean; message?: string }> {
    try {
      await api.post('/api/save-pin', { pin })
      return { ok: true }
    } catch (err) {
      const { message } = extractApiError(err)
      return { ok: false, message }
    }
  },

  async verifyPin(pin: string, action: string): Promise<PinVerifyResult> {
    try {
      const res = await api.post('/api/verify-pin', { pin, action })
      return {
        ok: true,
        code: res.data?.code,
        message: res.data?.message,
        pinToken: res.data?.pinToken,
      }
    } catch (err: unknown) {
      const body = (err as { response?: { data?: unknown } })?.response
        ?.data as
        | {
            error?: { message?: string; code?: string }
            code?: string
            message?: string
            meta?: { lockoutUntil?: string; attemptsLeft?: number }
          }
        | undefined

      const code = body?.error?.code || body?.code
      const message = body?.error?.message || body?.message
      return {
        ok: false,
        code,
        message,
        lockoutUntil: body?.meta?.lockoutUntil || null,
        attemptsLeft: body?.meta?.attemptsLeft,
      }
    }
  },
}