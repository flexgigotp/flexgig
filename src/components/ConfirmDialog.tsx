import { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Red confirm button for destructive actions like logout. */
  destructive?: boolean
  /** Disables both buttons and shows a busy label while the action runs. */
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const btnBase: React.CSSProperties = {
  flex: 1,
  padding: 14,
  border: 'none',
  borderRadius: 50,
  fontWeight: 600,
  fontSize: 16,
  cursor: 'pointer',
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, loading, onCancel])

  if (!open) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 9999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel()
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        style={{
          background: '#fff',
          maxWidth: 380,
          width: '90%',
          padding: 24,
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div
          id="confirm-dialog-title"
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#111',
            textAlign: 'center',
            marginBottom: message ? 8 : 20,
          }}
        >
          {title}
        </div>

        {message && (
          <div
            style={{
              fontSize: 15,
              lineHeight: 1.5,
              color: '#555',
              textAlign: 'center',
              marginBottom: 20,
            }}
          >
            {message}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            autoFocus
            disabled={loading}
            onClick={onCancel}
            style={{
              ...btnBase,
              background: '#e0e0e0',
              color: '#333',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            style={{
              ...btnBase,
              background: destructive ? '#e53935' : '#00bfa5',
              color: '#fff',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}