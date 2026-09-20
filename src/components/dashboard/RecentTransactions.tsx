import { useTransactions } from '@/hooks/useTransactions'
import type { Transaction } from '@/types/api'

const PROVIDER_COLORS: Record<string, string> = {
  mtn: '#FFCC00',
  airtel: '#FF0000',
  glo: '#00B140',
  '9mobile': '#7DB700',
}

function providerFromTx(tx: Transaction): string {
  const p = (tx.provider || '').toLowerCase()
  if (p === 'ninemobile' || p === '9mobile') return '9mobile'
  return p
}

function formatAmount(tx: Transaction): string {
  const n = Number(tx.amount)
  const sign = tx.type === 'credit' || tx.status === 'refund' ? '+' : '-'
  return `${sign}₦${Math.abs(n).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function RecentTransactions() {
  const { items, isLoading, hasFetched, error } = useTransactions({ limit: 10 })

  const isEmpty = hasFetched && items.length === 0 && !isLoading

  return (
    <div className="dash-tx-section-wrapper">
      <div className="dash-tx-header-row">
        <h3 className="dash-tx-main-title">Recent Transactions</h3>
        <button type="button" className="dash-tx-view-full-link">
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
            const provider = providerFromTx(tx)
            const color = PROVIDER_COLORS[provider] || '#666'
            return (
              <div key={tx.id} className="tx-item">
                <div
                  className="tx-icon"
                  style={{
                    background: `${color}22`,
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: color,
                      display: 'inline-block',
                    }}
                  />
                </div>
                <div className="tx-content" style={{ flex: 1 }}>
                  <div className="tx-row">
                    <span className="tx-desc">
                      {tx.description || `${tx.provider || 'Transaction'}`}
                    </span>
                    <span className={`tx-amount ${tx.type === 'credit' ? 'credit' : 'debit'}`}>
                      {formatAmount(tx)}
                    </span>
                  </div>
                  <div className="tx-row meta">
                    <span className="tx-time">{formatDate(tx.created_at)}</span>
                    <span className="tx-status" data-status={tx.status}>
                      {tx.status}
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