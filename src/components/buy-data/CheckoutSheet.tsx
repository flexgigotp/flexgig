// src/components/buy-data/CheckoutSheet.tsx

import { createPortal } from 'react-dom'
import type { DataPlan } from '@/types/api'

interface CheckoutSheetProps {
  plan: DataPlan
  phone: string
  provider: string
  balance: number
  onClose: () => void
  onPay: () => void
}

const PROVIDER_LABELS: Record<string, string> = {
  mtn: 'MTN',
  airtel: 'Airtel',
  glo: 'GLO',
  ninemobile: '9MOBILE',
}

export default function CheckoutSheet({
  plan,
  phone,
  provider,
  balance,
  onClose,
  onPay,
}: CheckoutSheetProps) {
  const providerLabel = PROVIDER_LABELS[provider.toLowerCase()] || provider
  const price = Number(plan.price)
  const canPay = balance >= price

  const handlePay = () => {
    if (!canPay) return
    onPay()
  }

  return createPortal(
    <div
      className="fg-checkout-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="fg-checkout-sheet" role="dialog" aria-modal="true">
        <div className="fg-checkout-handle" aria-hidden />

        <button
          type="button"
          className="fg-checkout-close"
          aria-label="Close"
          onClick={onClose}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#2f3136" />
            <path
              d="M8 8l8 8M16 8l-8 8"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="fg-checkout-price">
          ₦{price.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
        </div>

        <div className="fg-checkout-info">
          <div className="fg-checkout-row">
            <span className="fg-checkout-label">Product Name</span>
            <span className="fg-checkout-value">Mobile Data</span>
          </div>
          <div className="fg-checkout-row">
            <span className="fg-checkout-label">Provider</span>
            <span className="fg-checkout-value">{providerLabel}</span>
          </div>
          <div className="fg-checkout-row">
            <span className="fg-checkout-label">Recipient Mobile</span>
            <span className="fg-checkout-value">{phone}</span>
          </div>
          <div className="fg-checkout-row">
            <span className="fg-checkout-label">Data Bundle</span>
            <span className="fg-checkout-value">
              {plan.data_amount} / {plan.duration}
            </span>
          </div>
          <div className="fg-checkout-row">
            <span className="fg-checkout-label">Amount</span>
            <span className="fg-checkout-value">
              ₦{price.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="fg-checkout-divider" />

        <div className="fg-checkout-balance-row">
          <span className="fg-checkout-label">Available Balance</span>
          <span
            className={`fg-checkout-balance${
              canPay ? '' : ' insufficient'
            }`}
          >
            ₦
            {balance.toLocaleString('en-NG', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        <button
          type="button"
          className={`fg-checkout-pay${canPay ? ' active' : ''}`}
          disabled={!canPay}
          onClick={handlePay}
        >
          Pay
        </button>

        {!canPay && (
          <p className="fg-checkout-warning">
            Insufficient balance — fund your wallet to continue
          </p>
        )}
      </div>
    </div>,
    document.body
  )
}