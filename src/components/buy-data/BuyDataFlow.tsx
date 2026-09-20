import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlans } from '@/hooks/usePlans'
import { useBuyData } from '@/hooks/useBuyData'
import { useDataPurchaseStore } from '@/stores/dataPurchaseStore'
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

  // If somehow the URL is broken, bounce out
  useEffect(() => {
    if (!planId || !phone || !provider) {
      navigate('/dashboard', { replace: true })
    }
  }, [planId, phone, provider, navigate])

  // If plans finished loading but the plan still isn't found, exit
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
  const { stage, receipt, balance, goToPin, goBack, reset, retry, submitPin } =
    useBuyData({ plan, phone, provider })

  // Close the checkout sheet: step back through history so phone/plan persist.
  const handleCloseCheckout = () => {
    reset()
    if (window.history.length > 1) {
      goBack()
    } else {
      // Deep link with no history — just strip the checkout params
      onFinish()
    }
  }

  // Close PIN: step back to summary stage; do NOT reset the receipt.
  const handleClosePin = () => {
    if (window.history.length > 1) {
      goBack()
    } else {
      // Deep link — replace URL with the summary stage
      const params = new URLSearchParams(window.location.search)
      params.delete('step')
      const next = params.toString()
      window.location.replace(`/dashboard?${next}`)
    }
  }

  const handleFundWallet = () => {
    reset()
    onFinish() // after a completed purchase we do want to reset
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
          onPay={goToPin}
        />
      )}

      {stage === 'pin' && (
        <CheckoutPinSheet
          onSubmit={submitPin}
          onClose={handleClosePin}
          onForgotPin={() => toast.info('PIN reset — check your email', 4000)}
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
    </>
  )
}