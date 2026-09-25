import { useCallback, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { dataApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { useSession } from '@/hooks'
import type { DataPlan } from '@/types/api'

export type BuyDataStage = 'summary' | 'pin' | 'receipt'

export interface BuyDataPayload {
  plan: DataPlan
  phone: string
  provider: string
}

export type DataReceipt =
  | { status: 'processing' }
  | {
      status: 'success'
      plan: DataPlan
      phone: string
      provider: string
      reference: string
      newBalance: number
      timestamp: string
    }
  | {
      status: 'pending'
      plan: DataPlan
      phone: string
      provider: string
      reference: string
      newBalance: number
    }
  | {
      status: 'failed'
      message: string
      plan?: DataPlan
      phone?: string
      provider?: string
      reference?: string
    }
  | {
      status: 'insufficient'
      plan: DataPlan
      phone: string
      provider: string
      currentBalance: number
    }

const POLL_INTERVAL_MS = 8000
const POLL_MAX_ATTEMPTS = 15
const PENDING_TIMEOUT_MS = 8000

type PurchaseAuth = {
  pinToken?: string
  rawPin?: string
  webauthnAssertion?: string
}

interface FailureAnalysis {
  pinRejected: boolean
  displayMessage: string
}

function analyzeFailure(
  code: string | undefined,
  message: string | undefined,
  attemptsLeft: number | undefined,
  lockoutUntil: string | null | undefined
): FailureAnalysis {
  const m = (message || '').toLowerCase()
  const c = (code || '').toUpperCase()

  if (m.includes('forget pin') || m.includes('pin entry limit')) {
    return {
      pinRejected: true,
      displayMessage:
        'PIN entry limit reached. Please use Forgot PIN to reset it.',
    }
  }

  if (m.includes('pin not set')) {
    return {
      pinRejected: true,
      displayMessage: 'No PIN on this account. Please set one first.',
    }
  }

  if (lockoutUntil) {
    const until = new Date(lockoutUntil)
    const mins = Math.max(
      1,
      Math.ceil((until.getTime() - Date.now()) / 60000)
    )
    return {
      pinRejected: true,
      displayMessage: `Too many incorrect attempts. Try again in ${mins} min.`,
    }
  }
  if (m.includes('too many') && m.includes('attempts')) {
    return {
      pinRejected: true,
      displayMessage: 'Too many incorrect attempts. Try again later.',
    }
  }

  const isPinFailure =
    (m.includes('pin') &&
      (m.includes('incorrect') ||
        m.includes('invalid') ||
        m.includes('wrong'))) ||
    c === 'INVALID_PIN' ||
    c === 'INCORRECT_PIN' ||
    c === 'WRONG_PIN' ||
    c === 'INVALID_CURRENT_PIN'

  if (isPinFailure) {
    if (typeof attemptsLeft === 'number' && attemptsLeft > 0) {
      return {
        pinRejected: true,
        displayMessage: `Incorrect PIN — ${attemptsLeft} ${
          attemptsLeft === 1 ? 'attempt' : 'attempts'
        } left before lock`,
      }
    }
    return { pinRejected: true, displayMessage: 'Incorrect PIN' }
  }

  return {
    pinRejected: false,
    displayMessage: message || 'Something went wrong',
  }
}

export function useBuyData(payload: BuyDataPayload) {
  const { balance } = useSession()
  const setBalance = useAuthStore((s) => s.setBalance)
  const location = useLocation()
  const navigate = useNavigate()

  const urlStep = useMemo(
    () => new URLSearchParams(location.search).get('step'),
    [location.search]
  )

  const [receipt, setReceipt] = useState<DataReceipt | null>(null)

  const stage: BuyDataStage = useMemo(() => {
    if (urlStep === 'pin') return 'pin'
    if (urlStep === 'receipt' && receipt) return 'receipt'
    return 'summary'
  }, [urlStep, receipt])

  const buildSearch = useCallback(
    (extra?: Record<string, string>) => {
      const params = new URLSearchParams(location.search)
      if (extra) {
        Object.entries(extra).forEach(([k, v]) => params.set(k, v))
      }
      return params.toString()
    },
    [location.search]
  )

  const goToPin = useCallback(() => {
    navigate(`/dashboard?${buildSearch({ step: 'pin' })}`)
  }, [navigate, buildSearch])

  const goBack = useCallback(() => {
    navigate(-1)
  }, [navigate])

  const reset = useCallback(() => {
    setReceipt(null)
  }, [])

  const retry = useCallback(() => {
    setReceipt(null)
    navigate(`/dashboard?${buildSearch({ step: 'pin' })}`, { replace: true })
  }, [navigate, buildSearch])

  const pollForFinalStatus = useCallback(
    (reference: string, initialBalance: number) => {
      let settled = false
      let showedPending = false
      let attempts = 0

      const showPending = () => {
        if (settled || showedPending) return
        showedPending = true
        setReceipt({
          status: 'pending',
          plan: payload.plan,
          phone: payload.phone,
          provider: payload.provider,
          reference,
          newBalance: initialBalance,
        })
      }

      const pendingTimer = window.setTimeout(showPending, PENDING_TIMEOUT_MS)

      const finalizeSuccess = (newBalance: number) => {
        if (settled) return
        settled = true
        window.clearTimeout(pendingTimer)
        window.clearInterval(interval)
        setBalance(newBalance)
        setReceipt({
          status: 'success',
          plan: payload.plan,
          phone: payload.phone,
          provider: payload.provider,
          reference,
          newBalance,
          timestamp: new Date().toISOString(),
        })
      }

      const finalizeFailed = (message: string) => {
        if (settled) return
        settled = true
        window.clearTimeout(pendingTimer)
        window.clearInterval(interval)
        setReceipt({
          status: 'failed',
          message,
          plan: payload.plan,
          phone: payload.phone,
          provider: payload.provider,
          reference,
        })
      }

      const checkOnce = async () => {
        if (settled) return
        const result = await dataApi.findByReference(reference)
        if (settled || !result.ok) return

        const status = (result.status || '').toLowerCase()
        if (status === 'success') {
          finalizeSuccess(result.newBalance ?? initialBalance)
        } else if (status === 'failed' || status === 'refund') {
          const msg =
            result.description && result.description.length < 200
              ? result.description
              : 'Data delivery failed. Amount has been refunded.'
          finalizeFailed(msg)
        }
      }

      void checkOnce()

      const interval = window.setInterval(async () => {
        if (settled) {
          window.clearInterval(interval)
          return
        }
        attempts++
        if (attempts >= POLL_MAX_ATTEMPTS) {
          window.clearInterval(interval)
          window.clearTimeout(pendingTimer)
          if (!settled) {
            settled = true
            setReceipt({
              status: 'pending',
              plan: payload.plan,
              phone: payload.phone,
              provider: payload.provider,
              reference,
              newBalance: initialBalance,
            })
          }
          return
        }
        await checkOnce()
      }, POLL_INTERVAL_MS)
    },
    [payload, setBalance]
  )

  const completePurchase = useCallback(
    async (auth: PurchaseAuth): Promise<{ ok: boolean; message?: string }> => {
      const result = await dataApi.buyData({
        planId: payload.plan.plan_id,
        phone: payload.phone,
        provider: payload.provider,
        ...auth,
      })

      if (!result.ok) {
        const failure = analyzeFailure(
          result.code,
          result.error,
          result.attemptsLeft,
          result.lockoutUntil
        )

        if (failure.pinRejected) {
          return { ok: false, message: failure.displayMessage }
        }

        setReceipt({ status: 'processing' })
        navigate(`/dashboard?${buildSearch({ step: 'receipt' })}`, {
          replace: true,
        })

        if (result.insufficient) {
          setReceipt({
            status: 'insufficient',
            plan: payload.plan,
            phone: payload.phone,
            provider: payload.provider,
            currentBalance: balance,
          })
          return { ok: false }
        }
        setReceipt({
          status: 'failed',
          message: failure.displayMessage,
          plan: payload.plan,
          phone: payload.phone,
          provider: payload.provider,
        })
        return { ok: false }
      }

      setReceipt({ status: 'processing' })
      navigate(`/dashboard?${buildSearch({ step: 'receipt' })}`, {
        replace: true,
      })

      if (typeof result.newBalance === 'number') {
        setBalance(result.newBalance)
      }

      const reference = result.reference
      if (!reference) {
        setReceipt({
          status: 'failed',
          message: 'No transaction reference returned',
          plan: payload.plan,
          phone: payload.phone,
          provider: payload.provider,
        })
        return { ok: false }
      }

      pollForFinalStatus(reference, result.newBalance ?? balance)
      return { ok: true }
    },
    [payload, balance, setBalance, navigate, buildSearch, pollForFinalStatus]
  )

  const submitPin = useCallback(
    async (pin: string): Promise<{ ok: boolean; message?: string }> => {
      return completePurchase({ rawPin: pin })
    },
    [completePurchase]
  )

  const submitBiometric = useCallback(
    async (assertion: string): Promise<{ ok: boolean; message?: string }> => {
      return completePurchase({ webauthnAssertion: assertion })
    },
    [completePurchase]
  )

  return {
    stage,
    receipt,
    balance,
    goToPin,
    goBack,
    reset,
    retry,
    submitPin,
    submitBiometric,
  }
}