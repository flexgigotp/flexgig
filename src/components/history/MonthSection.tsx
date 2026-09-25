// src/components/history/MonthSection.tsx
import type { MonthGroup } from '@/lib/history'
import { formatAmount } from '@/lib/history'
import type { Transaction } from '@/types/api'
import HistoryRow from './HistoryRow'

interface MonthSectionProps {
  group: MonthGroup
  serverTotal?: { in: number; out: number }
  onSelectTx: (tx: Transaction) => void
  onSelectMonth: (monthKey: string) => void
}

export default function MonthSection({
  group,
  serverTotal,
  onSelectTx,
  onSelectMonth,
}: MonthSectionProps) {
  const totalIn = serverTotal?.in ?? group.totalIn
  const totalOut = serverTotal?.out ?? group.totalOut
  const isEmpty = group.txs.length === 0

  return (
    <>
      <div className="month-section-header">
        <div className="opay-month-header">
          <div
            className="opay-month-selector"
            role="button"
            tabIndex={0}
            onClick={() => onSelectMonth(group.monthKey)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelectMonth(group.monthKey)
              }
            }}
          >
            <span>{group.prettyMonth}</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>

        <div className="opay-summary">
          <div>
            In: <strong>{formatAmount(totalIn)}</strong>
          </div>
          <div>
            Out: <strong>{formatAmount(totalOut)}</strong>
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: '#999',
            fontSize: 14,
          }}
        >
          No transactions in {group.prettyMonth}.
        </div>
      ) : (
        group.txs.map((tx) => (
          <HistoryRow key={tx.id} tx={tx} onClick={onSelectTx} />
        ))
      )}
    </>
  )
}