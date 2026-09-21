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

  /**
   * Shared completion path — sends whichever auth we have.
   * Precedence: webauthnAssertion > rawPin > pinToken.
   */
  const completeTransfer = useCallback(
    async (auth: TransferAuth): Promise<{ ok: boolean; message?: string }> => {
      navigate('/transfer?step=receipt', { replace: true })
      setReceipt({ status: 'processing' })

      const result = await walletApi.transfer({
        recipient: formData.recipient,
        amount: formData.amount,
        ...auth,
      })

      if (result.ok) {
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
      }

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
        message: result.error || 'Transfer failed',
        recipient: formData.recipient,
        amount: formData.amount,
      })
      return { ok: false }
    },
    [formData, balance, setBalance, navigate]
  )

  /** Raw PIN — one round trip. */
  const submitPin = useCallback(
    async (pin: string): Promise<{ ok: boolean; message?: string }> => {
      return completeTransfer({ rawPin: pin })
    },
    [completeTransfer]
  )

  /** WebAuthn assertion — one round trip. */
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