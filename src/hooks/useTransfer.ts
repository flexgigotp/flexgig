import { useCallback, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { pinApi } from '@/hooks/usePin'
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

export function useTransfer() {
  const { balance } = useSession()
  const setBalance = useAuthStore((s) => s.setBalance)
  const location = useLocation()
  const navigate = useNavigate()

  // Stage is derived from the URL — browser back automatically steps through
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

  const submitPin = useCallback(
    async (pin: string): Promise<{ ok: boolean; message?: string }> => {
      // 1. Verify PIN with the 'transfer' action
      const verify = await pinApi.verifyPin(pin, 'transfer')
      if (!verify.ok || !verify.pinToken) {
        return { ok: false, message: verify.message || 'Incorrect PIN' }
      }

      // 2. Advance to receipt with replace so PIN is not in history
      navigate('/transfer?step=receipt', { replace: true })
      setReceipt({ status: 'processing' })

      // 3. Call transfer API
      const result = await walletApi.transfer({
        recipient: formData.recipient,
        amount: formData.amount,
        pinToken: verify.pinToken,
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
    reset,
    retryFromReceipt,
  }
}