import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlans } from '@/hooks/usePlans'
import { useBuyData } from '@/hooks/useBuyData'
import { useBiometric } from '@/hooks/useBiometric'
import { useDataPurchaseStore } from '@/stores/dataPurchaseStore'
import { useBiometricPromptStore } from '@/stores/biometricPromptStore'
import { isBiometricEnabled, isBioForTx } from '@/lib/biometricStorage'
import CheckoutSheet from '@/components/buy-data/CheckoutSheet'
import DataReceipt from '@/components/buy-data/DataReceipt'
import CheckoutPinSheet from '@/components/pin/CheckoutPinSheet'
import Loader from '@/components/Loader'
import { toast } from '@/stores/toastStore'

interface BuyDataFlowProps {
  planId: string
  phone: string
  provider: string
}

export default function BuyDataFlow({
  planId,
  phone,
  provider,
}: BuyDataFlowProps) {
  const navigate = useNavigate()
  const { plans, isLoading } = usePlans()
  const resetStore = useDataPurchaseStore((s) => s.reset)

  const plan = useMemo(
    () => plans.find((p) => p.plan_id === planId) || null,
    [plans, planId]
  )

  useEffect(() => {
    if (!planId || !phone || !provider) {
      navigate('/dashboard', { replace: true })
    }
  }, [planId, phone, provider, navigate])

  useEffect(() => {
    if (!isLoading && !plan) {
      toast.error('Plan not found')
      navigate('/dashboard', { replace: true })
    }
  }, [isLoading, plan, navigate])

  if (isLoading || !plan) {
    return <Loader />
  }

  return (
    <Flow
      plan={plan}
      phone={phone}
      provider={provider}
      onFinish={() => {
        resetStore()

        if (!isBiometricEnabled() || !isBioForTx()) {
          useBiometricPromptStore.getState().prompt()
        }

        navigate('/dashboard', { replace: true })
      }}
    />
  )
}

interface FlowProps {
  plan: NonNullable<ReturnType<typeof usePlans>['plans'][number]>
  phone: string
  provider: string
  onFinish: () => void
}

function Flow({ plan, phone, provider, onFinish }: FlowProps) {
  const bio = useBiometric()
  const {
    stage,
    receipt,
    balance,
    goToPin,
    goBack,
    reset,
    retry,
    submitPin,
    submitBiometric,
  } = useBuyData({ plan, phone, provider })

  useEffect(() => {
    if (stage === 'summary' && bio.enabled && bio.forTx && bio.isSupported) {
      bio.prefetch()
    }
  }, [stage, bio.enabled, bio.forTx, bio.isSupported, bio.prefetch])

  const handleCloseCheckout = () => {
    reset()
    if (window.history.length > 1) {
      goBack()
    } else {
      onFinish()
    }
  }

  const handleClosePin = () => {
    if (window.history.length > 1) {
      goBack()
    } else {
      const params = new URLSearchParams(window.location.search)
      params.delete('step')
      const next = params.toString()
      window.location.replace(`/dashboard?${next}`)
    }
  }

  const handleFundWallet = () => {
    reset()
    onFinish()
  }

  const handlePay = async () => {
    if (
      bio.enabled &&
      bio.forTx &&
      bio.isSupported &&
      !bio.isAuthenticating
    ) {
      const res = await bio.authenticate('buy-data', { inline: true })

      if (res.ok && res.assertion) {
        await submitBiometric(res.assertion)
        return
      }

      if (res.message && res.message !== 'Cancelled') {
        toast.error(res.message || 'Biometric failed')
      }
    }

    goToPin()
  }

  const handleBiometricFromPin = async () => {
    const res = await bio.authenticate('buy-data', { inline: true })
    if (!res.ok) {
      if (res.message !== 'Cancelled') {
        toast.error(res.message || 'Biometric failed')
      }
      return
    }
    await submitBiometric(res.assertion!)
  }

  return (
    <>
      {stage === 'summary' && (
        <CheckoutSheet
          plan={plan}
          phone={phone}
          provider={provider}
          balance={balance}
          onClose={handleCloseCheckout}
          onPay={handlePay}
        />
      )}

      {stage === 'pin' && (
        <CheckoutPinSheet
          onSubmit={submitPin}
          onClose={handleClosePin}
          onForgotPin={() => toast.info('PIN reset — check your email', 4000)}
          biometricEnabled={bio.enabled && bio.forTx}
          onBiometric={handleBiometricFromPin}
          biometricBusy={bio.isAuthenticating}
        />
      )}

      {stage === 'receipt' && receipt && (
        <DataReceipt
          receipt={receipt}
          onDone={onFinish}
          onRetry={retry}
          onFundWallet={handleFundWallet}
        />
      )}

      {bio.phase === 'preparing' && (
        <div className="bio-loading-toast" role="status" aria-live="polite">
          <span className="bio-loading-spinner" aria-hidden />
          Waiting for fingerprint…
        </div>
      )}

      {bio.phase === 'verifying' && <Loader transparent />}
    </>
  )
}