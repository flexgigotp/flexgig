import { useCallback, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { walletApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { useSession } from '@/hooks'

export type TransferStage = 'form' | 'confirm' | 'pin' | 'receipt'

export interface TransferFormData {
  recipient: string
  amount: number
}

export type TransferReceipt =
  | { status: 'processing' }
  | {
      status: 'success'
      recipient: string
      amount: number
      newBalance: number
      reference: string
      timestamp: string
    }
  | {
      status: 'failed'
      message: string
      recipient?: string
      amount?: number
    }
  | {
      status: 'insufficient'
      recipient: string
      amount: number
      currentBalance: number
    }

type TransferAuth = {
  pinToken?: string
  rawPin?: string
  webauthnAssertion?: string
}

interface FailureAnalysis {
  pinRejected: boolean
  displayMessage: string
}

/**
 * Classifies a failed server response.
 *
 * `pinRejected: true` means the user's PIN/identity was rejected and
 * the flow should stay on the current screen showing `displayMessage`
 * inline — NOT navigate to the receipt.
 *
 * The server writes prose for the change-PIN flow ("Current PIN is
 * incorrect"), so we never pass that through verbatim. We detect
 * patterns and build the copy ourselves.
 */
function analyzeFailure(
  code: string | undefined,
  message: string | undefined,
  attemptsLeft: number | undefined,
  lockoutUntil: string | null | undefined
): FailureAnalysis {
  const m = (message || '').toLowerCase()
  const c = (code || '').toUpperCase()

  // ── Reset required (server sends: "PIN entry limit reached. Use Forget PIN.")
  if (m.includes('forget pin') || m.includes('pin entry limit')) {
    return {
      pinRejected: true,
      displayMessage:
        'PIN entry limit reached. Please use Forgot PIN to reset it.',
    }
  }

  // ── PIN not set
  if (m.includes('pin not set')) {
    return {
      pinRejected: true,
      displayMessage: 'No PIN on this account. Please set one first.',
    }
  }

  // ── Lockout (has an expiry)
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

  // ── Plain wrong PIN (order-independent — "incorrect pin" AND
  // "pin is incorrect" both match)
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

export function useTransfer() {
  const { balance } = useSession()
  const setBalance = useAuthStore((s) => s.setBalance)
  const location = useLocation()
  const navigate = useNavigate()

  const stage: TransferStage = useMemo(() => {
    const step = new URLSearchParams(location.search).get('step')
    if (step === 'confirm') return 'confirm'
    if (step === 'pin') return 'pin'
    if (step === 'receipt') return 'receipt'
    return 'form'
  }, [location.search])

  const [formData, setFormData] = useState<TransferFormData>({
    recipient: '',
    amount: 0,
  })
  const [receipt, setReceipt] = useState<TransferReceipt | null>(null)

  const goToConfirm = useCallback(
    (data: TransferFormData) => {
      setFormData(data)
      navigate('/transfer?step=confirm')
    },
    [navigate]
  )

  const goToPin = useCallback(() => {
    navigate('/transfer?step=pin')
  }, [navigate])

  const goBack = useCallback(() => {
    navigate(-1)
  }, [navigate])

  const completeTransfer = useCallback(
    async (auth: TransferAuth): Promise<{ ok: boolean; message?: string }> => {
      const result = await walletApi.transfer({
        recipient: formData.recipient,
        amount: formData.amount,
        ...auth,
      })

      // ── Failure analysis
      if (!result.ok) {
        const failure = analyzeFailure(
          result.code,
          result.error,
          result.attemptsLeft,
          result.lockoutUntil
        )

        if (failure.pinRejected) {
          // Stay on the current screen. Do NOT navigate.
          return { ok: false, message: failure.displayMessage }
        }

        // Non-PIN failure — navigate to the receipt to show the reason.
        setReceipt({ status: 'processing' })
        navigate('/transfer?step=receipt', { replace: true })

        if (result.insufficient) {
          setReceipt({
            status: 'insufficient',
            recipient: formData.recipient,
            amount: formData.amount,
            currentBalance: balance,
          })
          return { ok: false }
        }

        setReceipt({
          status: 'failed',
          message: failure.displayMessage,
          recipient: formData.recipient,
          amount: formData.amount,
        })
        return { ok: false }
      }

      // ── Success path — navigate to receipt.
      setReceipt({ status: 'processing' })
      navigate('/transfer?step=receipt', { replace: true })

      if (typeof result.newBalance === 'number') {
        setBalance(result.newBalance)
      }
      setReceipt({
        status: 'success',
        recipient: formData.recipient,
        amount: formData.amount,
        newBalance: result.newBalance ?? balance,
        reference: result.reference || 'N/A',
        timestamp: new Date().toISOString(),
      })
      return { ok: true }
    },
    [formData, balance, setBalance, navigate]
  )

  const submitPin = useCallback(
    async (pin: string): Promise<{ ok: boolean; message?: string }> => {
      return completeTransfer({ rawPin: pin })
    },
    [completeTransfer]
  )

  const submitBiometric = useCallback(
    async (assertion: string): Promise<{ ok: boolean; message?: string }> => {
      return completeTransfer({ webauthnAssertion: assertion })
    },
    [completeTransfer]
  )

  const reset = useCallback(() => {
    setFormData({ recipient: '', amount: 0 })
    setReceipt(null)
  }, [])

  const retryFromReceipt = useCallback(() => {
    setReceipt(null)
    navigate('/transfer?step=confirm', { replace: true })
  }, [navigate])

  return {
    stage,
    formData,
    receipt,
    balance,
    goToConfirm,
    goToPin,
    goBack,
    submitPin,
    submitBiometric,
    reset,
    retryFromReceipt,
  }
}