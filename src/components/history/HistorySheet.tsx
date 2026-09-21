// src/components/history/HistorySheet.tsx
import { useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useHistoryStore } from '@/stores/historyStore'
import { useAuthStore } from '@/stores/authStore'
import {
  applyFilters,
  filterByMonth,
  groupByMonth,
  type MonthGroup,
} from '@/lib/history'
import type { Transaction } from '@/types/api'
import HistoryFilters from './HistoryFilters'
import MonthSection from './MonthSection'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

interface HistorySheetProps {
  onClose: () => void
  onSelectTransaction: (tx: Transaction) => void
  onSelectMonth: (month: { year: number; month: number }) => void
}

interface MonthTotal {
  in: number
  out: number
}

export default function HistorySheet({
  onClose,
  onSelectTransaction,
  onSelectMonth,
}: HistorySheetProps) {
  const items = useHistoryStore((s) => s.items)
  const isLoading = useHistoryStore((s) => s.isLoading)
  const isFetchingMore = useHistoryStore((s) => s.isFetchingMore)
  const hasFetched = useHistoryStore((s) => s.hasFetched)
  const hasMore = useHistoryStore((s) => s.hasMore)
  const error = useHistoryStore((s) => s.error)
  const category = useHistoryStore((s) => s.category)
  const status = useHistoryStore((s) => s.status)
  const selectedMonth = useHistoryStore((s) => s.selectedMonth)
  const ensureLoaded = useHistoryStore((s) => s.ensureLoaded)
  const loadMore = useHistoryStore((s) => s.loadMore)

  const monthlyHistory = useAuthStore((s) => s.user?.monthlyHistory ?? [])

  const listRef = useRef<HTMLDivElement | null>(null)

  useBodyScrollLock(true)

  // Sentinel so the browser back button closes the sheet via the URL param.
  // useModalParam already owns the ?history=1 entry; we just need to make
  // sure nothing else grabs popstate while we're open.

  // ── Server-provided month totals ──────────────────────────────
  // The `users.monthly_history` column is authoritative: it aggregates
  // every tx ever made, not just the ~30 we've paged in. Fall back to
  // client-side sums only when the server hasn't provided an entry.
  const serverTotals = useMemo(() => {
    const map = new Map<string, MonthTotal>()
    for (const raw of monthlyHistory as Array<{
      month?: string
      money_in?: number
      money_out?: number
    }>) {
      if (!raw?.month) continue
      map.set(raw.month, {
        in: Number(raw.money_in) || 0,
        out: Number(raw.money_out) || 0,
      })
    }
    return map
  }, [monthlyHistory])

  useEffect(() => {
    void ensureLoaded()
  }, [ensureLoaded])

  const groups: MonthGroup[] = useMemo(() => {
    let visible = applyFilters(items, category, status)
    visible = filterByMonth(visible, selectedMonth)
    return groupByMonth(visible)
  }, [items, category, status, selectedMonth])

  const isEmpty = hasFetched && !isLoading && groups.length === 0

  // Infinite scroll
  useEffect(() => {
    const el = listRef.current
    if (!el) return

    let scheduled = false
    const onScroll = () => {
      if (scheduled) return
      scheduled = true
      requestAnimationFrame(() => {
        scheduled = false
        if (!hasMore || isFetchingMore) return
        const nearBottom =
          el.scrollTop + el.clientHeight >= el.scrollHeight - 400
        if (nearBottom) void loadMore()
      })
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [hasMore, isFetchingMore, loadMore])

  // Escape closes the sheet
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      className="opay-history-modal"
      style={{ pointerEvents: 'auto', zIndex: 12000 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="historySheetTitle"
    >
      <div
        className="opay-backdrop"
        style={{ pointerEvents: 'auto' }}
        onClick={onClose}
      />

      <div className="opay-panel" style={{ overscrollBehavior: 'contain' }}>
        <header className="opay-header">
          <button
            type="button"
            className="opay-back-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 id="historySheetTitle" className="opay-title">
            Transactions
          </h2>
          <div style={{ width: 40 }} />
        </header>

        <HistoryFilters />

        <div className="main-month">
          <div
            className="opay-body"
            id="historyList"
            aria-label="Transaction list"
            ref={listRef}
          >
            {isLoading && items.length === 0 && (
              <div className="opay-loading">Loading transactions…</div>
            )}

            {!isLoading && error && <div className="opay-error">{error}</div>}

            {!isLoading && !error && isEmpty && (
              <div className="opay-empty">
                No transactions{selectedMonth ? ' in this month' : ' yet'}.
              </div>
            )}

            {groups.map((group) => (
              <MonthSection
                key={group.monthKey}
                group={group}
                serverTotal={serverTotals.get(group.monthKey)}
                onSelectTx={onSelectTransaction}
                onSelectMonth={(monthKey) => {
                  const [y, m] = monthKey.split('-').map(Number)
                  onSelectMonth({ year: y, month: m - 1 })
                }}
              />
            ))}

            {isFetchingMore && (
              <div className="opay-loading">Loading more…</div>
            )}

            {!hasMore && items.length > 0 && (
              <div className="opay-loading" style={{ opacity: 0.6 }}>
                All transactions loaded
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}