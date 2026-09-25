// src/components/history/TransactionReceiptSheet.tsx
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Transaction } from '@/types/api'
import TxIcon from './TxIcon'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import {
  displayDescription,
  formatAmount,
  formatDateTime,
  isCreditTx,
  normalizeProvider,
  statusKind,
  statusLabel,
} from '@/lib/history'

interface ReceiptProps {
  tx: Transaction
  onClose: () => void
  onReport?: (tx: Transaction) => void
}

export default function TransactionReceiptSheet({
  tx,
  onClose,
  onReport,
}: ReceiptProps) {
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  /**
   * URL-driven back handling.
   *
   * On mount:
   *   - push a history entry with ?receipt=<id> so the browser back
   *     button pops it naturally, restoring the pre-receipt URL.
   *
   * On unmount via the X button (no popstate):
   *   - strip ?receipt from the current URL via replaceState so the
   *     back button doesn't navigate to a stale receipt view.
   *
   * On popstate:
   *   - just call onClose. The browser already popped the URL.
   *
   * When the parent replaces the URL entry with ?report before this
   * sheet unmounts (Report Issue flow), the __fgReceipt state is gone
   * and the cleanup skips its replaceState so it doesn't clobber the
   * report URL.
   */
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('receipt', tx.id)
    window.history.pushState(
      { __fgReceipt: true },
      '',
      url.pathname + url.search
    )

    const onPop = () => onCloseRef.current()
    window.addEventListener('popstate', onPop)

    return () => {
      window.removeEventListener('popstate', onPop)
      if (window.history.state?.__fgReceipt) {
        const u = new URL(window.location.href)
        u.searchParams.delete('receipt')
        window.history.replaceState(null, '', u.pathname + u.search)
      }
    }
  }, [tx.id])

  useBodyScrollLock(true)

  // Back-consumes-sentinel: X button triggers same navigation as back
  const close = () => {
    if (window.history.state?.__fgReceipt) {
      window.history.back()
    } else {
      onClose()
    }
  }

  const credit = isCreditTx(tx)
  const kind = statusKind(tx.status)
  const provider = normalizeProvider(tx.provider)
  const networkLabel =
    provider === 'mtn' ? 'MTN' :
    provider === 'airtel' ? 'Airtel' :
    provider === 'glo' ? 'GLO' :
    provider === '9mobile' ? '9Mobile' :
    null

  const statusColor =
    kind === 'failed' ? '#FF3B30' :
    kind === 'pending' ? '#FF9500' :
    kind === 'refund' ? '#FB923C' :
    '#00D4AA'

  const showAsData = !!(tx.data_amount || tx.phone)

  return createPortal(
    <div
      className="opay-history-modal"
      style={{
        pointerEvents: 'auto',
        zIndex: 20000, // above bottom nav (10001) + history sheet (12000)
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="txReceiptTitle"
    >
      <div
        className="opay-backdrop"
        style={{ pointerEvents: 'auto' }}
        onClick={close}
      />

      <div
        className="opay-panel"
        style={{
          background: '#0a0a0a',
          maxWidth: 480,
          margin: '0 auto',
          overscrollBehavior: 'contain',
        }}
      >
        <header className="opay-header">
          <button
            type="button"
            className="opay-back-btn"
            onClick={close}
            aria-label="Back"
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
          <h2 id="txReceiptTitle" className="opay-title">
            Transaction Details
          </h2>
          <div style={{ width: 40 }} />
        </header>

        <div
          style={{
            padding: '24px 20px 40px',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '16px 0 24px',
            }}
          >
            <TxIcon tx={tx} />
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: '#fff',
                marginTop: 16,
                letterSpacing: '-1px',
              }}
            >
              {credit ? '+' : '-'}
              {formatAmount(tx.amount)}
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 14,
                fontWeight: 600,
                color: statusColor,
              }}
            >
              {statusLabel(tx.status)}
            </div>
          </div>

          <div
            style={{
              background: '#1e1e1e',
              borderRadius: 16,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <Row label="Description" value={displayDescription(tx)} />

            {showAsData && tx.phone && (
              <Row label="Recipient Number" value={tx.phone} mono />
            )}
            {showAsData && tx.data_amount && (
              <Row label="Data Bundle" value={tx.data_amount} />
            )}
            {showAsData && networkLabel && (
              <Row label="Network" value={networkLabel} />
            )}

            <Row
              label="Type"
              value={
                showAsData
                  ? 'Mobile Data'
                  : tx.type === 'credit'
                  ? 'Wallet Credit'
                  : tx.type === 'refund'
                  ? 'Refund'
                  : 'Debit'
              }
            />
            <Row
              label="Status"
              value={statusLabel(tx.status)}
              valueColor={statusColor}
            />
            <Row label="Reference" value={tx.reference || tx.id || '—'} mono />
            <Row label="Date" value={formatDateTime(tx.created_at)} />
          </div>

          {onReport && (
            <button
              type="button"
              onClick={() => onReport(tx)}
              style={{
                marginTop: 20,
                width: '100%',
                padding: '14px 16px',
                background: '#2c2c2c',
                color: '#00D4AA',
                border: '1.5px solid #00D4AA',
                borderRadius: 50,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Report Issue
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

function Row({
  label,
  value,
  mono,
  valueColor,
}: {
  label: string
  value: string
  mono?: boolean
  valueColor?: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
        fontSize: 14,
      }}
    >
      <span style={{ color: '#9aa3ad', flexShrink: 0 }}>{label}</span>
      <span
        style={{
          color: valueColor || '#fff',
          fontWeight: 600,
          textAlign: 'right',
          wordBreak: 'break-word',
          fontFamily: mono ? 'ui-monospace, monospace' : undefined,
          letterSpacing: mono ? '0.4px' : undefined,
        }}
      >
        {value}
      </span>
    </div>
  )
}