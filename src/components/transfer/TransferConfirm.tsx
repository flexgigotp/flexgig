interface TransferConfirmProps {
  recipient: string
  amount: number
  onCancel: () => void
  onConfirm: () => void
}

export default function TransferConfirm({
  recipient,
  amount,
  onCancel,
  onConfirm,
}: TransferConfirmProps) {
  return (
    <div className="fg-tx-confirm">
      <div className="fg-tx-confirm-body">
        <div className="fg-tx-confirm-row">
          <span className="fg-tx-confirm-label">Product</span>
          <span className="fg-tx-confirm-value">Wallet Transfer</span>
        </div>
        <div className="fg-tx-confirm-row">
          <span className="fg-tx-confirm-label">Amount</span>
          <span className="fg-tx-confirm-value">
            ₦{amount.toLocaleString('en-NG')}
          </span>
        </div>
        <div className="fg-tx-confirm-row">
          <span className="fg-tx-confirm-label">To</span>
          <span className="fg-tx-confirm-value">@{recipient}</span>
        </div>
        <p className="fg-tx-confirm-note">
          Transfers are instant and cannot be reversed.
        </p>
      </div>

      <div className="fg-tx-confirm-actions">
        <button
          type="button"
          className="fg-tx-cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="fg-tx-send"
          onClick={onConfirm}
        >
          Send
        </button>
      </div>
    </div>
  )
}