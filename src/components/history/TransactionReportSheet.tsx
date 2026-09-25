// src/components/history/TransactionReportSheet.tsx
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Transaction } from '@/types/api'
import { formatAmount } from '@/lib/history'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { reportApi } from '@/services/report'

const REPORT_REASONS = [
  {
    id: 'not_received',
    label: 'Data not received',
    desc: 'You were charged but data was never delivered',
  },
  {
    id: 'not_delivered',
    label: 'Charged but not delivered',
    desc: 'Payment left wallet but transaction shows failed',
  },
  {
    id: 'wrong_amount',
    label: 'Wrong amount charged',
    desc: 'A different amount was deducted than expected',
  },
  {
    id: 'other',
    label: 'Other issue',
    desc: 'Any other problem not listed above',
  },
] as const

type ReasonId = (typeof REPORT_REASONS)[number]['id']
type Step = 'reason' | 'details' | 'loading' | 'success' | 'error'

interface ReportSheetProps {
  tx: Transaction
  onClose: () => void
}

export default function TransactionReportSheet({
  tx,
  onClose,
}: ReportSheetProps) {
  const [step, setStep] = useState<Step>('reason')
  const [selected, setSelected] = useState<ReasonId | null>(null)
  const [details, setDetails] = useState('')

  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  /**
   * URL-driven back handling.
   *
   * Two entry paths:
   *
   *  1. Receipt → Report transition. The dashboard handler has already
   *     done `replaceState({ __fgReport: true }, ...)` on the receipt's
   *     history entry. We detect that marker and skip our own push — the
   *     existing entry IS our entry.
   *
   *  2. Fresh mount (deep link, reload, or opening the sheet directly).
   *     No marker present → we push our own entry so back closes us.
   *
   * The popstate listener always closes the sheet — including during
   * the loading step. The in-flight request resolving after unmount is
   * harmless (React 18 doesn't warn on setState-after-unmount).
   */
  useEffect(() => {
    if (!window.history.state?.__fgReport) {
      const url = new URL(window.location.href)
      url.searchParams.set('report', tx.id)
      window.history.pushState(
        { __fgReport: true },
        '',
        url.pathname + url.search
      )
    }

    const onPop = () => onCloseRef.current()
    window.addEventListener('popstate', onPop)

    return () => {
      window.removeEventListener('popstate', onPop)
      // Only strip the URL if we're still the active report entry.
      // If the entry was already popped, history.state is null and there's
      // nothing to clean up. If the parent replaced it with something else
      // (another modal transition), __fgReport is gone too — also skip.
      if (window.history.state?.__fgReport) {
        const u = new URL(window.location.href)
        u.searchParams.delete('report')
        window.history.replaceState(null, '', u.pathname + u.search)
      }
    }
  }, [tx.id])

  useBodyScrollLock(true)

  // Close = pop the entry so history stays consistent. Falls back to a
  // direct close if we're not the current history owner.
  const close = () => {
    if (window.history.state?.__fgReport) {
      window.history.back()
    } else {
      onClose()
    }
  }

  // Escape closes the sheet — matches the receipt sheet's behavior
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ref = tx.reference || tx.id || '—'

  const submit = async (extraDetails: string) => {
    if (!selected) return
    const reason = REPORT_REASONS.find((r) => r.id === selected)
    if (!reason) return

    setStep('loading')
    try {
      const res = await reportApi.submit({
        transaction_ref: ref,
        transaction_amount: Number(tx.amount) || 0,
        transaction_status: tx.status,
        transaction_date: tx.created_at,
        issue_reason: reason.label,
        issue_details: extraDetails.slice(0, 300),
      })
      setStep(res.ok ? 'success' : 'error')
    } catch {
      setStep('error')
    }
  }

  const selectedReason = selected
    ? REPORT_REASONS.find((r) => r.id === selected) ?? null
    : null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 22000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        pointerEvents: 'auto',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reportSheetTitle"
    >
      <div
        onClick={() => step !== 'loading' && close()}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          background: '#121212',
          borderRadius: '20px 20px 0 0',
          padding: '24px 20px 36px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.6)',
          zIndex: 1,
          color: '#fff',
          fontFamily: 'inherit',
        }}
      >
        {step === 'reason' && (
          <ReasonStep
            tx={tx}
            ref_={ref}
            selected={selected}
            onSelect={setSelected}
            onClose={close}
            onContinue={() => selected && setStep('details')}
          />
        )}

        {step === 'details' && selectedReason && (
          <DetailsStep
            reasonLabel={selectedReason.label}
            value={details}
            onChange={setDetails}
            onBack={() => setStep('reason')}
            onSkip={() => void submit('')}
            onSubmit={() => void submit(details.trim())}
          />
        )}

        {step === 'loading' && <LoadingStep />}

        {step === 'success' && <SuccessStep ref_={ref} onClose={close} />}

        {step === 'error' && (
          <ErrorStep onRetry={() => setStep('details')} onClose={close} />
        )}
      </div>
    </div>,
    document.body
  )
}

// ─────────────────────────────────────────────────────────
// Step: reason
// ─────────────────────────────────────────────────────────

function ReasonStep({
  tx,
  ref_,
  selected,
  onSelect,
  onClose,
  onContinue,
}: {
  tx: Transaction
  ref_: string
  selected: ReasonId | null
  onSelect: (id: ReasonId) => void
  onClose: () => void
  onContinue: () => void
}) {
  const enabled = !!selected

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h2
          id="reportSheetTitle"
          style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}
        >
          Report Transaction
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            fontSize: 24,
            lineHeight: 1,
            cursor: 'pointer',
            padding: 4,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ color: '#999', fontSize: 13, lineHeight: 1.5 }}>
        Ref: <span style={{ color: '#ccc', fontFamily: 'monospace' }}>{ref_}</span>
        <span style={{ margin: '0 6px' }}>·</span>
        {formatAmount(Number(tx.amount) || 0)}
      </div>

      <p style={{ color: '#ccc', fontSize: 14, margin: 0 }}>
        What is the issue?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {REPORT_REASONS.map((r) => {
          const active = selected === r.id
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelect(r.id)}
              style={{
                background: active ? '#0d2b26' : '#1e1e1e',
                border: `1.5px solid ${active ? '#00d4aa' : '#333'}`,
                borderRadius: 12,
                padding: '14px 16px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                color: '#fff',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600 }}>{r.label}</span>
              <span style={{ fontSize: 12, color: '#777' }}>{r.desc}</span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        disabled={!enabled}
        onClick={onContinue}
        style={{
          marginTop: 8,
          padding: 14,
          borderRadius: 50,
          border: 'none',
          background: enabled
            ? 'linear-gradient(90deg,#00d4aa,#00bfa5)'
            : '#333',
          color: enabled ? '#fff' : '#666',
          fontSize: 15,
          fontWeight: 600,
          cursor: enabled ? 'pointer' : 'not-allowed',
          fontFamily: 'inherit',
          transition: 'all 0.2s',
        }}
      >
        Continue
      </button>
    </>
  )
}

// ─────────────────────────────────────────────────────────
// Step: details
// ─────────────────────────────────────────────────────────

function DetailsStep({
  reasonLabel,
  value,
  onChange,
  onBack,
  onSkip,
  onSubmit,
}: {
  reasonLabel: string
  value: string
  onChange: (v: string) => void
  onBack: () => void
  onSkip: () => void
  onSubmit: () => void
}) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          style={{
            background: 'none',
            border: 'none',
            color: '#00d4aa',
            cursor: 'pointer',
            padding: 4,
            lineHeight: 0,
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>
          Add Details
        </h2>
      </div>

      <div
        style={{
          background: '#1e1e1e',
          borderRadius: 10,
          padding: '12px 14px',
          color: '#ccc',
          fontSize: 13,
        }}
      >
        Issue: <strong style={{ color: '#fff' }}>{reasonLabel}</strong>
      </div>

      <p style={{ color: '#999', fontSize: 13, margin: 0 }}>
        Optional: describe the issue in a few words.
      </p>

      <textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Sent to 08012345678 but no data received..."
        style={{
          background: '#1e1e1e',
          border: '1.5px solid #333',
          borderRadius: 12,
          padding: 14,
          color: '#fff',
          fontSize: 14,
          resize: 'none',
          outline: 'none',
          width: '100%',
          boxSizing: 'border-box',
          fontFamily: 'inherit',
        }}
      />

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button
          type="button"
          onClick={onSkip}
          style={{
            flex: 1,
            padding: 14,
            borderRadius: 50,
            border: '1.5px solid #444',
            background: 'transparent',
            color: '#ccc',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Skip
        </button>
        <button
          type="button"
          onClick={onSubmit}
          style={{
            flex: 2,
            padding: 14,
            borderRadius: 50,
            border: 'none',
            background: 'linear-gradient(90deg,#00d4aa,#00bfa5)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Submit Report
        </button>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────
// Step: loading
// ─────────────────────────────────────────────────────────

function LoadingStep() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        padding: '40px 0',
        textAlign: 'center',
      }}
    >
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#00d4aa"
        strokeWidth="2"
        style={{ animation: 'fg-report-spin 1s linear infinite' }}
      >
        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
        <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="0.9" />
      </svg>
      <style>{`@keyframes fg-report-spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: '#999', fontSize: 14, margin: 0 }}>
        Submitting your report...
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Step: success
// ─────────────────────────────────────────────────────────

function SuccessStep({
  ref_,
  onClose,
}: {
  ref_: string
  onClose: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        padding: '20px 0 10px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: '#0d2b26',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#00d4aa"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 }}>
        Report Submitted
      </h2>
      <p style={{ color: '#999', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
        Our support team will review your report within 24 hours.
        <br />
        <span
          style={{ color: '#666', fontSize: 12, fontFamily: 'monospace' }}
        >
          Ref: {ref_}
        </span>
      </p>
      <button
        type="button"
        onClick={onClose}
        style={{
          width: '100%',
          marginTop: 8,
          padding: 14,
          borderRadius: 50,
          border: 'none',
          background: 'linear-gradient(90deg,#00d4aa,#00bfa5)',
          color: '#fff',
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Done
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Step: error
// ─────────────────────────────────────────────────────────

function ErrorStep({
  onRetry,
  onClose,
}: {
  onRetry: () => void
  onClose: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        padding: '20px 0 10px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: '#2b1010',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ff3b30"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </div>
      <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 }}>
        Submission Failed
      </h2>
      <p style={{ color: '#999', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
        We couldn't reach support right now.
        <br />
        Please contact us directly at{' '}
        <strong style={{ color: '#fff' }}>+2349160227505</strong>
      </p>
      <button
        type="button"
        onClick={onRetry}
        style={{
          width: '100%',
          padding: 14,
          borderRadius: 50,
          border: '1.5px solid #00d4aa',
          background: 'transparent',
          color: '#00d4aa',
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Try Again
      </button>
      <button
        type="button"
        onClick={onClose}
        style={{
          width: '100%',
          padding: 14,
          borderRadius: 50,
          border: 'none',
          background: '#2c2c2c',
          color: '#ccc',
          fontSize: 14,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Close
      </button>
    </div>
  )
}