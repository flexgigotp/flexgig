// src/components/settings/ChangePasswordSheet.tsx
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { accountApi, extractApiError } from '@/services/api'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { toast } from '@/stores/toastStore'
import Loader from '@/components/Loader'

interface ChangePasswordSheetProps {
  onClose: () => void
}

const MIN_PASSWORD_LENGTH = 8

export default function ChangePasswordSheet({
  onClose,
}: ChangePasswordSheetProps) {
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useBodyScrollLock(true)

  const canSubmit =
    currentPwd.length > 0 &&
    newPwd.length >= MIN_PASSWORD_LENGTH &&
    newPwd === confirmPwd &&
    !submitting

  const handleSubmit = async () => {
    setError(null)

    if (newPwd.length < MIN_PASSWORD_LENGTH) {
      setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (newPwd !== confirmPwd) {
      setError('New passwords do not match.')
      return
    }
    if (newPwd === currentPwd) {
      setError('New password must be different from your current one.')
      return
    }

    setSubmitting(true)
    try {
      await accountApi.changePassword(currentPwd, newPwd)
      toast.success('Password changed successfully')
      onClose()
    } catch (err) {
      const { message, code } = extractApiError(err)

      if (code === 'INVALID_CURRENT_PASSWORD') {
        setError('Current password is incorrect.')
      } else if (code === 'NO_CURRENT_PASSWORD') {
        setError(
          'Your account has no password yet. Please use the Forgot password flow.'
        )
      } else if (code === 'INVALID_INPUT') {
        setError(
          message || `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
        )
      } else {
        setError(message || 'Failed to change password. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (submitting) return
    onClose()
  }

  return createPortal(
    <div className="fg-sheet-overlay" role="dialog" aria-modal="true">
      <div className="cp-page">
        {/* Header */}
        <header className="cp-header">
          <button
            type="button"
            className="cp-close"
            aria-label="Back"
            onClick={handleClose}
            disabled={submitting}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h2 className="cp-title">Change Password</h2>
          <div className="cp-spacer" aria-hidden />
        </header>

        {/* Body */}
        <main className="cp-body">
          <form
            className="cp-form"
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault()
              if (canSubmit) handleSubmit()
            }}
          >
            {/* Current */}
            <div className="form-row">
              <label htmlFor="cpCurrent">Current password</label>
              <div className="input-with-toggle">
                <input
                  id="cpCurrent"
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPwd}
                  onChange={(e) => {
                    setCurrentPwd(e.target.value)
                    if (error) setError(null)
                  }}
                  autoComplete="current-password"
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="pwd-toggle"
                  aria-label={showCurrent ? 'Hide' : 'Show'}
                  onClick={() => setShowCurrent((v) => !v)}
                  tabIndex={-1}
                >
                  <EyeIcon open={showCurrent} />
                </button>
              </div>
            </div>

            {/* New */}
            <div className="form-row">
              <label htmlFor="cpNew">New password</label>
              <div className="input-with-toggle">
                <input
                  id="cpNew"
                  type={showNew ? 'text' : 'password'}
                  value={newPwd}
                  onChange={(e) => {
                    setNewPwd(e.target.value)
                    if (error) setError(null)
                  }}
                  autoComplete="new-password"
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="pwd-toggle"
                  aria-label={showNew ? 'Hide' : 'Show'}
                  onClick={() => setShowNew((v) => !v)}
                  tabIndex={-1}
                >
                  <EyeIcon open={showNew} />
                </button>
              </div>
              <div className="cp-hint">
                At least {MIN_PASSWORD_LENGTH} characters.
              </div>
            </div>

            {/* Confirm */}
            <div className="form-row">
              <label htmlFor="cpConfirm">Confirm new password</label>
              <div className="input-with-toggle">
                <input
                  id="cpConfirm"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPwd}
                  onChange={(e) => {
                    setConfirmPwd(e.target.value)
                    if (error) setError(null)
                  }}
                  autoComplete="new-password"
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="pwd-toggle"
                  aria-label={showConfirm ? 'Hide' : 'Show'}
                  onClick={() => setShowConfirm((v) => !v)}
                  tabIndex={-1}
                >
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
            </div>

            {/* Error */}
            {error && <div className="cp-error">{error}</div>}
          </form>
        </main>

        {/* Footer */}
        <footer className="cp-footer">
          <button
            type="button"
            className="cp-submit"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            Change password
          </button>
        </footer>

        {submitting && <Loader transparent />}
      </div>
    </div>,
    document.body
  )
}

// ── Eye toggle icon ─────────────────────────────────
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-6 0-10-7-10-7 .88-1.53 2.07-2.92 3.56-4.08"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1 1l22 22"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}