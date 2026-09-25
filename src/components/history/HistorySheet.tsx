// src/components/history/HistorySheet.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
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
import MonthPickerSheet from './MonthPickerSheet'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useModalParam } from '@/hooks/useModalParam'

interface HistorySheetProps {
  onClose: () => void
  onSelectTransaction: (tx: Transaction) => void
}

interface MonthTotal {
  in: number
  out: number
}

export default function HistorySheet({
  onClose,
  onSelectTransaction,
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
  const monthLoading = useHistoryStore((s) => s.monthLoading)
  const monthError = useHistoryStore((s) => s.monthError)
  const ensureLoaded = useHistoryStore((s) => s.ensureLoaded)
  const loadMore = useHistoryStore((s) => s.loadMore)

  const monthlyHistory = useAuthStore((s) => s.user?.monthlyHistory ?? [])

  const listRef = useRef<HTMLDivElement | null>(null)

  // URL-driven month picker: ?history=1&month=1
  const monthModal = useModalParam('month')
  const [pickerSeed, setPickerSeed] = useState<{
    year: number
    month: number
  } | null>(null)

  useBodyScrollLock(true)

  // ── Reset the month filter on close so reopening starts on All Time ──
  useEffect(() => {
    return () => {
      useHistoryStore.getState().setSelectedMonth(null)
    }
  }, [])

  // ── Server-provided month totals ──────────────────────────────
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
    const g = groupByMonth(visible)

    // If a specific month is selected and there are zero txs for it,
    // synthesize an empty group so the header (and its picker chip)
    // still renders. This keeps the user unstuck — they can tap the
    // chip and pick a different month.
    //
    // The visible "No transactions in X" placeholder is gated on
    // !monthLoading in the render, so this doesn't flash during fetch.
    if (selectedMonth && g.length === 0) {
      const { year, month } = selectedMonth
      const d = new Date(year, month, 1)
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
      return [
        {
          monthKey,
          prettyMonth: d.toLocaleDateString('en-GB', {
            month: 'short',
            year: 'numeric',
          }),
          totalIn: 0,
          totalOut: 0,
          txs: [],
        },
      ]
    }

    return g
  }, [items, category, status, selectedMonth])

  const isEmpty = hasFetched && !isLoading && groups.length === 0

  // Is the currently-selected month's data still in flight?
  const monthIsLoading = !!selectedMonth && monthLoading

  // Infinite scroll — disabled while a month fetch is running
  useEffect(() => {
    const el = listRef.current
    if (!el) return

    let scheduled = false
    const onScroll = () => {
      if (scheduled) return
      scheduled = true
      requestAnimationFrame(() => {
        scheduled = false
        if (!hasMore || isFetchingMore || monthIsLoading) return
        const nearBottom =
          el.scrollTop + el.clientHeight >= el.scrollHeight - 400
        if (nearBottom) void loadMore()
      })
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [hasMore, isFetchingMore, loadMore, monthIsLoading])

  // Escape closes the sheet — but only if the month picker is not open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !monthModal.isOpen) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, monthModal.isOpen])

  return createPortal(
    <>
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

              {!isLoading && error && (
                <div className="opay-error">{error}</div>
              )}

              {monthIsLoading && (
                <div className="opay-loading">
                  Loading{' '}
                  {new Date(
                    selectedMonth!.year,
                    selectedMonth!.month,
                    1
                  ).toLocaleDateString('en-GB', {
                    month: 'long',
                    year: 'numeric',
                  })}
                  …
                </div>
              )}

              {!monthIsLoading && monthError && (
                <div className="opay-error">{monthError}</div>
              )}

              {!isLoading &&
                !error &&
                !monthIsLoading &&
                !monthError &&
                isEmpty && (
                  <div className="opay-empty">No transactions yet.</div>
                )}

              {!monthIsLoading &&
                !monthError &&
                groups.map((group) => (
                  <MonthSection
                    key={group.monthKey}
                    group={group}
                    serverTotal={serverTotals.get(group.monthKey)}
                    onSelectTx={onSelectTransaction}
                    onSelectMonth={(monthKey) => {
                      const [y, m] = monthKey.split('-').map(Number)
                      setPickerSeed({ year: y, month: m - 1 })
                      monthModal.open()
                    }}
                  />
                ))}

              {isFetchingMore && (
                <div className="opay-loading">Loading more…</div>
              )}

              {!hasMore &&
                items.length > 0 &&
                !selectedMonth && (
                  <div className="opay-loading" style={{ opacity: 0.6 }}>
                    All transactions loaded
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>

      {monthModal.isOpen && (
        <MonthPickerSheet
          initialMonth={pickerSeed}
          onClose={monthModal.close}
        />
      )}
    </>,
    document.body
  )
}