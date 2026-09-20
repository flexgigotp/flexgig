// src/components/addmoney/AddMoneySheet.tsx
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAddMoney } from '@/hooks/useAddMoney'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { getKYCState } from '@/lib/addMoneyStorage'
import { toast } from '@/stores/toastStore'
import { playPaymentSound } from '@/lib/sound'
import Loader from '@/components/Loader'

interface AddMoneySheetProps {
  onClose: () => void
  onOpenKYC: () => void
}

const QUICK_AMOUNTS = [500, 1000, 2000, 3000, 5000, 10000]

function formatNaira(n: number): string {
  return `₦${n.toLocaleString('en-NG')}`
}

function formatCountdown(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export default function AddMoneySheet({
  onClose,
  onOpenKYC,
}: AddMoneySheetProps) {
  const kycState = getKYCState()
  const isKYCVerified = !!kycState?.verified

  useBodyScrollLock(true)

  const {
    pending,
    secondsLeft,
    isLoading,
    error,
    createFundRequest,
    verifyPending,
    cancelPending,
    clearLocal,
  } = useAddMoney()

  const [amount, setAmount] = useState('')
  const [copied, setCopied] = useState(false)

  // If KYC already verified, bounce to KYC's permanent accounts view
  if (isKYCVerified) {
    onOpenKYC()
    return null
  }

  const numericAmount = Number(amount.replace(/[^0-9]/g, '')) || 0

  const handleAmountChange = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '')
    setAmount(digits)
  }

  const handleQuickAmount = (value: number) => {
    setAmount(String(value))
  }

  const handleFund = async () => {
    if (!numericAmount || numericAmount < 100) {
      toast.error('Minimum deposit is ₦100')
      return
    }
    const ok = await createFundRequest(numericAmount)
    if (!ok && error) {
      toast.error(error)
    }
  }

  const handleCopy = async () => {
    if (!pending) return
    try {
      await navigator.clipboard.writeText(pending.accountNumber)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = pending.accountNumber
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    toast.success(`${pending.bankName} — ${pending.accountNumber} copied!`)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const handleVerify = async () => {
    const result = await verifyPending()
    if (result.status === 'completed') {
      toast.success('Payment confirmed — wallet updated!')
      playPaymentSound()
      onClose()
    } else if (result.status === 'pending') {
      toast.info(result.message)
    } else if (result.status === 'expired') {
      toast.error(result.message)
      clearLocal()
    } else {
      toast.error(result.message)
    }
  }

  // Silent cancel — clears local storage synchronously, fires the
  // server cancel in the background, shows toast, and navigates away.
  // Because pending state is never reset, the sheet never re-renders
  // to the form view — it just unmounts when the route changes.
  const handleCancel = () => {
    cancelPending()
    toast.info('Transaction cancelled')
    onClose()
  }

  return createPortal(
    <div
      className="fg-cpin-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="fg-addmoney-sheet" role="dialog" aria-modal="true">
        <div className="fg-addmoney-header">
          <button
            type="button"
            className="fg-addmoney-close"
            aria-label="Close"
            onClick={onClose}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h2 className="fg-addmoney-title">Add Money</h2>
          <div style={{ width: 32 }} />
        </div>

        <div className="fg-addmoney-body">
          {!pending && (
            <>
              <button
                type="button"
                className="fg-addmoney-kyc-banner"
                onClick={onOpenKYC}
              >
                <div className="fg-addmoney-kyc-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 10l9-6 9 6v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10z"
                      stroke="#00AAFF"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="fg-addmoney-kyc-text">
                  <h4>Get a permanent bank account</h4>
                  <span>Complete KYC</span>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ flexShrink: 0 }}
                >
                  <path
                    d="M9 18l6-6-6-6"
                    stroke="#8b95a5"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <div className="fg-addmoney-label">Instant Deposit</div>

              <div className="fg-addmoney-amount-wrap">
                <span className="fg-addmoney-currency">₦</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  className="fg-addmoney-amount"
                  placeholder="Enter amount"
                  value={amount ? Number(amount).toLocaleString('en-NG') : ''}
                  onChange={(e) => handleAmountChange(e.target.value)}
                />
              </div>

              <div className="fg-addmoney-quick">
                {QUICK_AMOUNTS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`fg-addmoney-quick-btn${
                      numericAmount === v ? ' selected' : ''
                    }`}
                    onClick={() => handleQuickAmount(v)}
                  >
                    {formatNaira(v)}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="fg-addmoney-fund-btn"
                disabled={isLoading || numericAmount < 100}
                onClick={handleFund}
              >
                Fund Wallet
              </button>
            </>
          )}

          {pending && (
            <>
              <div className="fg-addmoney-va">
                <div className="fg-addmoney-va-row">
                  <span className="fg-addmoney-va-label">Amount to Pay</span>
                  <span className="fg-addmoney-va-amount">
                    {formatNaira(pending.amount)}
                  </span>
                </div>

                <div className="fg-addmoney-va-row">
                  <span className="fg-addmoney-va-label">Bank</span>
                  <img
                    src="/frontend/img/9PSB.png"
                    alt={pending.bankName}
                    className="fg-addmoney-bank-logo"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>

                <div className="fg-addmoney-va-row">
                  <span className="fg-addmoney-va-label">Account Name</span>
                  <span className="fg-addmoney-va-value">
                    Flexgig Digital Network
                  </span>
                </div>

                <div className="fg-addmoney-va-row">
                  <span className="fg-addmoney-va-label">Account Number</span>
                  <div className="fg-addmoney-va-account">
                    <span className="fg-addmoney-va-number">
                      {pending.accountNumber}
                    </span>
                    <button
                      type="button"
                      className="fg-addmoney-copy-btn"
                      onClick={handleCopy}
                      aria-label="Copy account number"
                    >
                      {copied ? (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M5 13l4 4L19 7"
                            stroke="#10b981"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M6 11C6 8.17 6 6.76 6.88 5.88C7.76 5 9.17 5 12 5H15C17.83 5 19.24 5 20.12 5.88C21 6.76 21 8.17 21 11V16C21 18.83 21 20.24 20.12 21.12C19.24 22 17.83 22 15 22H12C9.17 22 7.76 22 6.88 21.12C6 20.24 6 18.83 6 16V11Z"
                            stroke="#fff"
                            strokeWidth="1.5"
                          />
                          <path
                            opacity="0.5"
                            d="M6 19C4.34 19 3 17.66 3 16V10C3 6.23 3 4.34 4.17 3.17C5.34 2 7.23 2 11 2H15C16.66 2 18 3.34 18 5"
                            stroke="#fff"
                            strokeWidth="1.5"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="fg-addmoney-va-row">
                  <span className="fg-addmoney-va-label">Expires In</span>
                  <div className="fg-addmoney-countdown-row">
                    <span
                      className={`fg-addmoney-countdown${
                        secondsLeft <= 0 ? ' expired' : ''
                      }`}
                    >
                      {secondsLeft > 0
                        ? formatCountdown(secondsLeft)
                        : 'EXPIRED'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="fg-addmoney-verify-btn"
                disabled={isLoading}
                onClick={handleVerify}
              >
                I Have Paid
              </button>
              <button
                type="button"
                className="fg-addmoney-cancel-btn"
                onClick={handleCancel}
              >
                Cancel transaction
              </button>
            </>
          )}
        </div>

        {isLoading && <Loader transparent />}
      </div>
    </div>,
    document.body
  )
}