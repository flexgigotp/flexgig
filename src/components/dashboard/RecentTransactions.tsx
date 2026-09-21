// src/components/dashboard/RecentTransactions.tsx
import { useTransactions } from '@/hooks/useTransactions'
import TxIcon from '@/components/history/TxIcon'
import {
  displayDescription,
  formatDateTime,
  formatSignedAmount,
  isCreditTx,
  statusKind,
  statusLabel,
} from '@/lib/history'
import { useHistoryStore } from '@/stores/historyStore'

export default function RecentTransactions({
  onViewAll,
  onSelectTransaction,
}: {
  onViewAll?: () => void
  onSelectTransaction?: (tx: import('@/types/api').Transaction) => void
}) {
  const { items, isLoading, hasFetched, error } = useTransactions({ limit: 10 })
  const ensureLoaded = useHistoryStore((s) => s.ensureLoaded)

  const isEmpty = hasFetched && items.length === 0 && !isLoading

  const handleViewAll = () => {
    void ensureLoaded()
    onViewAll?.()
  }

  return (
    <div className="dash-tx-section-wrapper">
      <div className="dash-tx-header-row">
        <h3 className="dash-tx-main-title">Recent Transactions</h3>
        <button
          type="button"
          className="dash-tx-view-full-link"
          onClick={handleViewAll}
        >
          <span>View All</span>
          <span className="arrow">→</span>
        </button>
      </div>

      {isLoading && !hasFetched && (
        <div className="db-recent-tx-container">
          <p style={{ padding: 24, textAlign: 'center', color: '#888' }}>
            Loading transactions…
          </p>
        </div>
      )}

      {error && (
        <div className="db-recent-tx-container">
          <p style={{ padding: 24, textAlign: 'center', color: '#c66' }}>
            {error}
          </p>
        </div>
      )}

      {items.length > 0 && (
        <div className="db-recent-tx-container" id="dbRecentTransactionsHolder">
          {items.map((tx) => {
            const credit = isCreditTx(tx)
            const kind = statusKind(tx.status)
            return (
              <div
                key={tx.id}
                className="tx-item"
                onClick={() => onSelectTransaction?.(tx)}
                style={{ cursor: onSelectTransaction ? 'pointer' : 'default' }}
              >
                <TxIcon tx={tx} />
                <div className="tx-content" style={{ flex: 1 }}>
                  <div className="tx-row">
                    <span className="tx-desc">{displayDescription(tx)}</span>
                    <span
                      className={`tx-amount ${credit ? 'credit' : 'debit'}`}
                    >
                      {formatSignedAmount(tx)}
                    </span>
                  </div>
                  <div className="tx-row meta">
                    <span className="tx-time">
                      {formatDateTime(tx.created_at)}
                    </span>
                    <span className="tx-status" data-status={kind}>
                      {statusLabel(tx.status)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {isEmpty && (
        <div className="db-no-activity-placeholder" id="dbNoRecentActivity">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#666"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 7h18v12H3z" />
            <path d="M3 7l9 6 9-6" />
            <line x1="12" y1="13" x2="12" y2="19" />
          </svg>
          <p>No Recent Activity Yet</p>
          <small>Transactions will show here once you start using your wallet</small>
        </div>
      )}
    </div>
  )
}