import { useNavigate } from 'react-router-dom'
import { useTransfer } from '@/hooks/useTransfer'
import TransferForm from '@/components/transfer/TransferForm'
import TransferConfirm from '@/components/transfer/TransferConfirm'
import CheckoutPinSheet from '@/components/pin/CheckoutPinSheet'
import TransferReceiptView from '@/components/transfer/TransferReceipt'
import { toast } from '@/stores/toastStore'
import { useEffect } from 'react'

export default function TransferPage() {
  const navigate = useNavigate()
  const {
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
  } = useTransfer()

  // If the user goes back from receipt and lands on an earlier stage,
    // and the receipt is already complete, redirect straight to dashboard.
    useEffect(() => {
    if (
        stage !== 'receipt' &&
        receipt &&
        receipt.status !== 'processing'
    ) {
        navigate('/dashboard', { replace: true })
    }
    }, [stage, receipt, navigate])

  const handleClose = () => {
  if (stage === 'form' || stage === 'receipt') {
    navigate('/dashboard', { replace: true })
  } else if (window.history.length > 1) {
    goBack()
  } else {
    // No history to pop (deep link) — go to the previous stage manually
    navigate(
      stage === 'pin'
        ? '/transfer?step=confirm'
        : '/transfer'
    )
  }
}

  const handleDone = () => {
    reset()
    navigate('/dashboard', { replace: true })
  }

  const handleFundWallet = () => {
    reset()
    toast.info('Add Money — coming soon', 3000)
    navigate('/dashboard', { replace: true })
  }

  // Receipt has its own full-screen layout (no header)
  if (stage === 'receipt' && receipt) {
    return (
      <div className="fg-transfer-overlay">
        <TransferReceiptView
          receipt={receipt}
          onDone={handleDone}
          onRetry={retryFromReceipt}
          onFundWallet={handleFundWallet}
        />
      </div>
    )
  }

  const title =
    stage === 'form'
      ? 'Transfer'
      : stage === 'confirm'
        ? 'Confirm Transfer'
        : 'Account PIN'

  return (
    <div className="fg-transfer-overlay">
      <header className="fg-transfer-header">
        <button
          type="button"
          className="fg-transfer-back"
          aria-label="Back"
          onClick={handleClose}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="fg-transfer-title">{title}</h1>

        {stage === 'form' && (
          <div className="fg-transfer-balance" aria-live="polite">
            Balance: ₦{balance.toLocaleString('en-NG', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        )}
      </header>

      <div className="fg-transfer-body">
        {stage === 'form' && (
          <TransferForm
            balance={balance}
            initial={formData.recipient ? formData : undefined}
            onContinue={goToConfirm}
          />
        )}

        {stage === 'confirm' && (
          <TransferConfirm
            recipient={formData.recipient}
            amount={formData.amount}
            onCancel={goBack}
            onConfirm={goToPin}
          />
        )}

        {stage === 'pin' && (
        <CheckoutPinSheet
            onSubmit={submitPin}
            onClose={goBack}
            onForgotPin={() =>
            toast.info('PIN reset — check your email', 4000)
            }
        />
        )}
      </div>
    </div>
  )
}