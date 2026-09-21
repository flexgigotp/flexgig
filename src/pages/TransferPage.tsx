import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTransfer } from '@/hooks/useTransfer'
import { useBiometric } from '@/hooks/useBiometric'
import { useBiometricPromptStore } from '@/stores/biometricPromptStore'
import { isBiometricEnabled, isBioForTx } from '@/lib/biometricStorage'
import TransferForm from '@/components/transfer/TransferForm'
import TransferConfirm from '@/components/transfer/TransferConfirm'
import CheckoutPinSheet from '@/components/pin/CheckoutPinSheet'
import TransferReceiptView from '@/components/transfer/TransferReceipt'
import Loader from '@/components/Loader'
import { toast } from '@/stores/toastStore'

export default function TransferPage() {
  const navigate = useNavigate()
  const bio = useBiometric()
  const {
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
  } = useTransfer()

  useEffect(() => {
    if (stage !== 'receipt' && receipt && receipt.status !== 'processing') {
      navigate('/dashboard', { replace: true })
    }
  }, [stage, receipt, navigate])

  useEffect(() => {
    if (stage === 'confirm' && bio.enabled && bio.forTx && bio.isSupported) {
      bio.prefetch()
    }
  }, [stage, bio.enabled, bio.forTx, bio.isSupported, bio.prefetch])

  const handleClose = () => {
    if (stage === 'form' || stage === 'receipt') {
      navigate('/dashboard', { replace: true })
    } else if (window.history.length > 1) {
      goBack()
    } else {
      navigate(stage === 'pin' ? '/transfer?step=confirm' : '/transfer')
    }
  }

  const handleDone = () => {
    reset()

    if (!isBiometricEnabled() || !isBioForTx()) {
      useBiometricPromptStore.getState().prompt()
    }

    navigate('/dashboard', { replace: true })
  }

  const handleFundWallet = () => {
    reset()
    toast.info('Add Money — coming soon', 3000)
    navigate('/dashboard', { replace: true })
  }

  const handleConfirm = async () => {
    if (
      bio.enabled &&
      bio.forTx &&
      bio.isSupported &&
      !bio.isAuthenticating
    ) {
      const res = await bio.authenticate('transfer', { inline: true })

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
    const res = await bio.authenticate('transfer', { inline: true })
    if (!res.ok) {
      if (res.message !== 'Cancelled') {
        toast.error(res.message || 'Biometric failed')
      }
      return
    }
    await submitBiometric(res.assertion!)
  }

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
            Balance: ₦
            {balance.toLocaleString('en-NG', {
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
            onConfirm={handleConfirm}
          />
        )}

        {stage === 'pin' && (
          <CheckoutPinSheet
            onSubmit={submitPin}
            onClose={goBack}
            onForgotPin={() =>
              toast.info('PIN reset — check your email', 4000)
            }
            biometricEnabled={bio.enabled && bio.forTx}
            onBiometric={handleBiometricFromPin}
            biometricBusy={bio.isAuthenticating}
          />
        )}
      </div>

      {bio.phase === 'preparing' && (
        <div className="bio-loading-toast" role="status" aria-live="polite">
          <span className="bio-loading-spinner" aria-hidden />
          Waiting for fingerprint…
        </div>
      )}

      {bio.phase === 'verifying' && <Loader transparent />}
    </div>
  )
}