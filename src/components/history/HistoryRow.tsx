// src/components/history/HistoryRow.tsx
import type { Transaction } from '@/types/api'
import TxIcon from './TxIcon'
import {
  displayDescription,
  formatDateTime,
  formatSignedAmount,
  isCreditTx,
  statusKind,
  statusLabel,
} from '@/lib/history'

interface HistoryRowProps {
  tx: Transaction
  onClick?: (tx: Transaction) => void
}

export default function HistoryRow({ tx, onClick }: HistoryRowProps) {
  const credit = isCreditTx(tx)
  const kind = statusKind(tx.status)
  const label = statusLabel(tx.status)

  return (
    <article
      className="tx-item"
      role="listitem"
      onClick={() => onClick?.(tx)}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <TxIcon tx={tx} />
      <div className="tx-content">
        <div className="tx-row">
          <div className="tx-desc" title={displayDescription(tx)}>
            {displayDescription(tx)}
          </div>
          <div
            className={`tx-amount ${credit ? 'credit' : 'debit'}`}
            title={formatSignedAmount(tx)}
          >
            {formatSignedAmount(tx)}
          </div>
        </div>
        <div className="tx-row meta">
          <div className="tx-time">{formatDateTime(tx.created_at)}</div>
          <div className="tx-status" data-status={kind}>
            {label}
          </div>
        </div>
      </div>
    </article>
  )
}