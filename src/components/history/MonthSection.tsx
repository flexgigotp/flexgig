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
  // Server totals from `users.monthly_history` are authoritative and
  // cover every tx ever made. Client-side sums only cover what's been
  // paged in, so use them only as a fallback.
  const totalIn = serverTotal?.in ?? group.totalIn
  const totalOut = serverTotal?.out ?? group.totalOut

  return (
    <>
      {/*
        This header is a DIRECT child of `.opay-body` (the scroll
        container). Do NOT wrap it in a div with `overflow: hidden` —
        that creates a new scroll context and kills `position: sticky`.

        When the next month's header scrolls up and touches this one,
        it will push this one off the top. That's the vanilla behaviour.
      */}
      <div className="month-section-header">
        <div className="opay-month-header">
          <div
            className="opay-month-selector"
            onClick={() => onSelectMonth(group.monthKey)}
            role="button"
            tabIndex={0}
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

      <div className="month-txs">
        {group.txs.map((tx) => (
          <HistoryRow key={tx.id} tx={tx} onClick={onSelectTx} />
        ))}
      </div>
    </>
  )
}