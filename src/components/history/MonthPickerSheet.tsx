// src/components/history/MonthPickerSheet.tsx
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useHistoryStore } from '@/stores/historyStore'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

interface MonthPickerSheetProps {
  initialMonth?: { year: number; month: number } | null
  onClose: () => void
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

type MonthRef = { year: number; month: number }

export default function MonthPickerSheet({
  initialMonth = null,
  onClose,
}: MonthPickerSheetProps) {
  const committed = useHistoryStore((s) => s.selectedMonth)
  const selectMonth = useHistoryStore((s) => s.selectMonth)

  const today = new Date()

  // Which year the grid is showing — prefers the seed, then the committed
  // filter, then today's year.
  const [viewYear, setViewYear] = useState<number>(
    initialMonth?.year ?? committed?.year ?? today.getFullYear()
  )

  // Staged selection — clicking a month only updates this. Nothing is
  // committed to the store until Confirm.
  const [pending, setPending] = useState<MonthRef | null>(
    initialMonth ?? committed ?? null
  )

  // Local submitting state — drives the loader and locks the buttons
  // while we fetch the month's transactions from the server. Kept local
  // (not read from the store) so it can't be accidentally true from a
  // different code path.
  const [submitting, setSubmitting] = useState(false)

  useBodyScrollLock(true)

  // Escape closes — but not while a fetch is in flight. Letting the user
  // bail mid-fetch would leave them staring at the picker with no
  // feedback, since the destination loader is behind this modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, submitting])

  const handleConfirm = async () => {
    if (!pending || submitting) return
    setSubmitting(true)
    try {
      await selectMonth(pending)
    } finally {
      setSubmitting(false)
      onClose()
    }
  }

  const handleAllTime = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      await selectMonth(null)
    } finally {
      setSubmitting(false)
      onClose()
    }
  }

  const handleBackdropClick = () => {
    if (!submitting) onClose()
  }

  const isSelected = (year: number, month: number) =>
    pending?.year === year && pending?.month === month

  const isToday = (year: number, month: number) =>
    year === today.getFullYear() && month === today.getMonth()

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 13000, // above HistorySheet (12000)
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="monthPickerTitle"
    >
      <div
        onClick={handleBackdropClick}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
        }}
      />

      <div
        style={{
          position: 'relative',
          width: '90%',
          maxWidth: 380,
          background: '#fff',
          color: '#222',
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
          fontFamily: 'inherit',
          zIndex: 1,
        }}
      >
        {/* Header — always visible */}
        <div
          style={{
            position: 'relative',
            padding: '18px 16px',
            borderBottom: '1px solid #eee',
            textAlign: 'center',
            fontSize: 18,
            fontWeight: 600,
            color: '#222',
          }}
        >
          <button
            type="button"
            onClick={handleBackdropClick}
            aria-label="Close"
            disabled={submitting}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              fontSize: 26,
              lineHeight: 1,
              color: '#999',
              cursor: submitting ? 'not-allowed' : 'pointer',
              padding: 4,
              opacity: submitting ? 0.4 : 1,
            }}
          >
            ×
          </button>
          <span id="monthPickerTitle">
            {submitting ? 'Loading…' : 'Select Month'}
          </span>
        </div>

        {submitting ? (
          // ── Loader: replaces grid + footer while fetching ────────
          <div
            style={{
              padding: '60px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#00d4aa"
              strokeWidth="2"
              style={{ animation: 'fg-mp-spin 0.9s linear infinite' }}
            >
              <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="0.9" />
            </svg>
            <style>{`@keyframes fg-mp-spin { to { transform: rotate(360deg); } }`}</style>
            <div
              style={{
                fontSize: 14,
                color: '#666',
                textAlign: 'center',
              }}
            >
              {pending
                ? `Loading ${new Date(
                    pending.year,
                    pending.month,
                    1
                  ).toLocaleDateString('en-GB', {
                    month: 'long',
                    year: 'numeric',
                  })} transactions…`
                : 'Loading transactions…'}
            </div>
          </div>
        ) : (
          <>
            {/* Year navigation */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                background: '#f8f9fa',
                borderBottom: '1px solid #eee',
              }}
            >
              <button
                type="button"
                onClick={() => setViewYear((y) => y - 1)}
                aria-label="Previous year"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 26,
                  lineHeight: 1,
                  color: '#00d4aa',
                  cursor: 'pointer',
                  padding: '4px 10px',
                }}
              >
                ‹
              </button>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#222' }}>
                {viewYear}
              </div>
              <button
                type="button"
                onClick={() => setViewYear((y) => y + 1)}
                aria-label="Next year"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 26,
                  lineHeight: 1,
                  color: '#00d4aa',
                  cursor: 'pointer',
                  padding: '4px 10px',
                }}
              >
                ›
              </button>
            </div>

            {/* Month grid */}
            <div
              style={{
                padding: 24,
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 14,
              }}
            >
              {MONTH_LABELS.map((label, idx) => {
                const active = isSelected(viewYear, idx)
                const todayMonth = isToday(viewYear, idx)
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setPending({ year: viewYear, month: idx })}
                    style={{
                      padding: '16px 8px',
                      border: `1px solid ${active ? '#00d4aa' : '#ddd'}`,
                      borderRadius: 8,
                      background: active ? '#00d4aa' : '#fff',
                      color: active ? '#fff' : '#222',
                      fontSize: 15,
                      fontWeight: active || todayMonth ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      fontFamily: 'inherit',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: 16,
                borderTop: '1px solid #eee',
                display: 'flex',
                gap: 12,
                justifyContent: 'center',
              }}
            >
              <button
                type="button"
                onClick={handleAllTime}
                style={{
                  background: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: 10,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 14,
                }}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!pending}
                style={{
                  background: pending
                    ? 'linear-gradient(90deg,#00d4aa,#00bfa5)'
                    : '#ccc',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 32px',
                  borderRadius: 10,
                  fontWeight: 600,
                  cursor: pending ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  boxShadow: pending
                    ? '0 4px 10px rgba(0,212,170,0.3)'
                    : 'none',
                }}
              >
                Confirm
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}