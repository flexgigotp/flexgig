import { createPortal } from 'react-dom'
import type { DataReceipt as Receipt } from '@/hooks/useBuyData'

interface DataReceiptProps {
  receipt: Receipt
  onDone: () => void
  onRetry: () => void
  onFundWallet: () => void
}

const PROVIDER_LABELS: Record<string, string> = {
  mtn: 'MTN',
  airtel: 'Airtel',
  glo: 'GLO',
  ninemobile: '9MOBILE',
}

export default function DataReceipt({
  receipt,
  onDone,
  onRetry,
  onFundWallet,
}: DataReceiptProps) {
  const renderBody = () => {
    if (receipt.status === 'processing') {
      return (
        <>
          <div className="fg-data-receipt-icon processing">
            <div className="fg-data-receipt-spinner" />
          </div>
          <h2 className="fg-data-receipt-title">Processing Transaction</h2>
          <p className="fg-data-receipt-message">
            Please hold on while we deliver your data…
          </p>
        </>
      )
    }

    if (receipt.status === 'success') {
      const providerLabel =
        PROVIDER_LABELS[receipt.provider.toLowerCase()] || receipt.provider
      return (
        <>
          <div className="fg-data-receipt-icon success">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 6L9 17l-5-5"
                stroke="#fff"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className="fg-data-receipt-title">Transaction Successful</h2>
          <p className="fg-data-receipt-message">
            Your data has been delivered successfully!
          </p>

          <div className="fg-data-receipt-details">
            <div className="fg-data-receipt-row">
              <span className="fg-data-receipt-label">Provider</span>
              <span className="fg-data-receipt-value">{providerLabel}</span>
            </div>
            <div className="fg-data-receipt-row">
              <span className="fg-data-receipt-label">Phone</span>
              <span className="fg-data-receipt-value">{receipt.phone}</span>
            </div>
            <div className="fg-data-receipt-row">
              <span className="fg-data-receipt-label">Data Plan</span>
              <span className="fg-data-receipt-value">
                {receipt.plan.data_amount} / {receipt.plan.duration}
              </span>
            </div>
            <div className="fg-data-receipt-row">
              <span className="fg-data-receipt-label">Amount Paid</span>
              <span className="fg-data-receipt-value">
                ₦
                {Number(receipt.plan.price).toLocaleString('en-NG')}
              </span>
            </div>
            <div className="fg-data-receipt-row">
              <span className="fg-data-receipt-label">Transaction ID</span>
              <span className="fg-data-receipt-value fg-data-receipt-id">
                {receipt.reference}
              </span>
            </div>
            <div className="fg-data-receipt-row">
              <span className="fg-data-receipt-label">New Balance</span>
              <span className="fg-data-receipt-value">
                ₦{receipt.newBalance.toLocaleString('en-NG')}
              </span>
            </div>
            <div className="fg-data-receipt-row">
              <span className="fg-data-receipt-label">Time</span>
              <span className="fg-data-receipt-value">
                {new Date(receipt.timestamp).toLocaleString('en-NG', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="fg-data-receipt-btn primary"
            onClick={onDone}
          >
            Done
          </button>
        </>
      )
    }

    if (receipt.status === 'pending') {
      const providerLabel =
        PROVIDER_LABELS[receipt.provider.toLowerCase()] || receipt.provider
      return (
        <>
          <div className="fg-data-receipt-icon pending">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="#fff"
                strokeWidth="2"
              />
              <path
                d="M12 7v5l3 3"
                stroke="#fff"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h2 className="fg-data-receipt-title">Pending Delivery</h2>
          <p className="fg-data-receipt-message">
            Your data is being delivered. This may take a few minutes.
            <br />
            Money safe — auto refund on failure.
          </p>

          <div className="fg-data-receipt-details">
            <div className="fg-data-receipt-row">
              <span className="fg-data-receipt-label">Provider</span>
              <span className="fg-data-receipt-value">{providerLabel}</span>
            </div>
            <div className="fg-data-receipt-row">
              <span className="fg-data-receipt-label">Phone</span>
              <span className="fg-data-receipt-value">{receipt.phone}</span>
            </div>
            <div className="fg-data-receipt-row">
              <span className="fg-data-receipt-label">Data Plan</span>
              <span className="fg-data-receipt-value">
                {receipt.plan.data_amount} / {receipt.plan.duration}
              </span>
            </div>
            <div className="fg-data-receipt-row">
              <span className="fg-data-receipt-label">Transaction ID</span>
              <span className="fg-data-receipt-value fg-data-receipt-id">
                {receipt.reference}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="fg-data-receipt-btn secondary"
            onClick={onDone}
          >
            OK
          </button>
        </>
      )
    }

    if (receipt.status === 'insufficient') {
      return (
        <>
          <div className="fg-data-receipt-icon failed">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M6 18L18 6"
                stroke="#fff"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h2 className="fg-data-receipt-title">Insufficient Balance</h2>
          <p className="fg-data-receipt-message">
            You do not have enough funds to complete this purchase.
            <br />
            Current balance:{' '}
            <strong>
              ₦{receipt.currentBalance.toLocaleString('en-NG')}
            </strong>
          </p>

          <div className="fg-data-receipt-actions">
            <button
              type="button"
              className="fg-data-receipt-btn primary"
              onClick={onFundWallet}
            >
              Fund Wallet
            </button>
            <button
              type="button"
              className="fg-data-receipt-btn secondary"
              onClick={onDone}
            >
              Close
            </button>
          </div>
        </>
      )
    }

    // failed
    return (
      <>
        <div className="fg-data-receipt-icon failed">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 6l12 12M6 18L18 6"
              stroke="#fff"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h2 className="fg-data-receipt-title">Transaction Failed</h2>
        <p className="fg-data-receipt-message">{receipt.message}</p>

        <div className="fg-data-receipt-actions">
          <button
            type="button"
            className="fg-data-receipt-btn primary"
            onClick={onRetry}
          >
            Try Again
          </button>
          <button
            type="button"
            className="fg-data-receipt-btn secondary"
            onClick={onDone}
          >
            Close
          </button>
        </div>
      </>
    )
  }

  return createPortal(
    <div className="fg-data-receipt-backdrop">
      <div className="fg-data-receipt-card" role="dialog" aria-modal="true">
        {renderBody()}
      </div>
    </div>,
    document.body
  )
}