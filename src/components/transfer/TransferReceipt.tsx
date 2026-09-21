import type { TransferReceipt } from '@/hooks/useTransfer'

interface TransferReceiptProps {
  receipt: TransferReceipt
  onDone: () => void
  onRetry: () => void
  onFundWallet: () => void
}

export default function TransferReceiptView({
  receipt,
  onDone,
  onRetry,
  onFundWallet,
}: TransferReceiptProps) {
  if (receipt.status === 'processing') {
    return (
      <div className="fg-tx-receipt">
        <div className="fg-tx-receipt-icon processing">
          <div className="fg-tx-spinner" />
        </div>
        <h2 className="fg-tx-receipt-status">Processing Transfer</h2>
        <p className="fg-tx-receipt-message">
          Please hold on while we process your transfer.
        </p>
      </div>
    )
  }

  if (receipt.status === 'success') {
    return (
      <div className="fg-tx-receipt">
        <div className="fg-tx-receipt-icon success">
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
        <h2 className="fg-tx-receipt-status">Transfer Successful</h2>
        <p className="fg-tx-receipt-message">
          Transfer has been made successfully from your balance!
        </p>

        <div className="fg-tx-receipt-amount">
          ₦{receipt.amount.toLocaleString('en-NG')}
        </div>
        <div className="fg-tx-receipt-sub">
          Transferred to @{receipt.recipient}
        </div>

        <div className="fg-tx-receipt-details">
          <div className="fg-tx-receipt-row">
            <span className="fg-tx-receipt-label">Sent to</span>
            <span className="fg-tx-receipt-value">@{receipt.recipient}</span>
          </div>
          <div className="fg-tx-receipt-row">
            <span className="fg-tx-receipt-label">Amount</span>
            <span className="fg-tx-receipt-value">
              ₦{receipt.amount.toLocaleString('en-NG')}
            </span>
          </div>
          <div className="fg-tx-receipt-row">
            <span className="fg-tx-receipt-label">New Balance</span>
            <span className="fg-tx-receipt-value">
              ₦{receipt.newBalance.toLocaleString('en-NG')}
            </span>
          </div>
          <div className="fg-tx-receipt-row">
            <span className="fg-tx-receipt-label">Date</span>
            <span className="fg-tx-receipt-value">
              {new Date(receipt.timestamp).toLocaleString('en-NG', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
          </div>
          <div className="fg-tx-receipt-row">
            <span className="fg-tx-receipt-label">Transaction ID</span>
            <span className="fg-tx-receipt-value fg-tx-receipt-id">
              {receipt.reference}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="fg-tx-receipt-btn primary"
          onClick={onDone}
        >
          Done
        </button>
      </div>
    )
  }

  if (receipt.status === 'insufficient') {
    return (
      <div className="fg-tx-receipt">
        <div className="fg-tx-receipt-icon failed">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 6L18 18M6 18L18 6"
              stroke="#fff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="fg-tx-receipt-status">Insufficient Balance</h2>
        <p className="fg-tx-receipt-message">
          You do not have enough funds to complete this transfer.
          <br />
          Current balance:{' '}
          <strong>₦{receipt.currentBalance.toLocaleString('en-NG')}</strong>
        </p>

        <div className="fg-tx-receipt-actions">
          <button
            type="button"
            className="fg-tx-receipt-btn primary"
            onClick={onFundWallet}
          >
            Fund Wallet
          </button>
          <button
            type="button"
            className="fg-tx-receipt-btn secondary"
            onClick={onDone}
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  // failed
  return (
    <div className="fg-tx-receipt">
      <div className="fg-tx-receipt-icon failed">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
          <path
            d="M6 6L18 18M6 18L18 6"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2 className="fg-tx-receipt-status">Transfer Failed</h2>
      <p className="fg-tx-receipt-message">{receipt.message}</p>

      <div className="fg-tx-receipt-actions">
        <button
          type="button"
          className="fg-tx-receipt-btn primary"
          onClick={onRetry}
        >
          Try Again
        </button>
        <button
          type="button"
          className="fg-tx-receipt-btn secondary"
          onClick={onDone}
        >
          Close
        </button>
      </div>
    </div>
  )
}