// src/components/settings/SetPasswordSheet.tsx
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSession } from '@/hooks'
import { accountApi, extractApiError } from '@/services/api'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { toast } from '@/stores/toastStore'

interface SetPasswordSheetProps {
  onClose: () => void
}

const MIN_PASSWORD_LENGTH = 8

type Field = 'new' | 'confirm' | 'global'

export default function SetPasswordSheet({
  onClose,
}: SetPasswordSheetProps) {
  const { user } = useSession()

  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorField, setErrorField] = useState<Field | null>(null)

  const newRef = useRef<HTMLInputElement | null>(null)

  useBodyScrollLock(true)

  useEffect(() => {
    const t = window.setTimeout(() => newRef.current?.focus(), 420)
    return () => window.clearTimeout(t)
  }, [])

  const clearError = () => {
    if (error) setError(null)
    if (errorField) setErrorField(null)
  }

  const canSubmit =
    newPwd.length >= MIN_PASSWORD_LENGTH &&
    newPwd === confirmPwd &&
    !submitting

  const handleSubmit = async () => {
    clearError()

    if (newPwd.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      setErrorField('new')
      return
    }
    if (newPwd !== confirmPwd) {
      setError('Passwords do not match.')
      setErrorField('confirm')
      return
    }
    if (!user?.uid) {
      setError('Session expired. Please close and reopen this screen.')
      setErrorField('global')
      return
    }

    setSubmitting(true)
    try {
      await accountApi.setPassword(user.uid, newPwd)
      toast.success('Password created successfully')
      delete (window as unknown as { __rp_reset_token?: string }).__rp_reset_token
      onClose()
    } catch (err) {
      const { message, code } = extractApiError(err)
      if (code === 'INVALID_INPUT') {
        setError(message || `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
        setErrorField('new')
      } else {
        setError(message || 'Failed to set password. Try again.')
        setErrorField('global')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (submitting) return
    onClose()
  }

  const inputBorder = (field: Field) =>
    errorField === field ? '#ff4d4f' : undefined

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
          <h2 className="cp-title">Create New Password</h2>
          <div className="cp-spacer" aria-hidden />
        </header>

        {/* Body */}
        <main className="cp-body">
          <form
            className="cp-form"
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault()
              if (canSubmit) void handleSubmit()
            }}
          >
            <p
              style={{
                margin: '0 0 4px',
                color: '#cfcfcf',
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              Your OTP has been verified. Choose a strong password to
              secure your account.
            </p>

            {/* New */}
            <div className="form-row">
              <label htmlFor="spwNew">New password</label>
              <div className="input-with-toggle">
                <input
                  id="spwNew"
                  ref={newRef}
                  type={showNew ? 'text' : 'password'}
                  value={newPwd}
                  onChange={(e) => {
                    setNewPwd(e.target.value)
                    clearError()
                  }}
                  autoComplete="new-password"
                  disabled={submitting}
                  style={{ borderColor: inputBorder('new') }}
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
              <label htmlFor="spwConfirm">Confirm password</label>
              <div className="input-with-toggle">
                <input
                  id="spwConfirm"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPwd}
                  onChange={(e) => {
                    setConfirmPwd(e.target.value)
                    clearError()
                  }}
                  autoComplete="new-password"
                  disabled={submitting}
                  style={{ borderColor: inputBorder('confirm') }}
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

            {error && <div className="cp-error">{error}</div>}
          </form>
        </main>

        {/* Footer */}
        <footer className="cp-footer">
          <button
            type="button"
            className="cp-submit"
            disabled={submitting}
            onClick={handleSubmit}
            style={{ pointerEvents: 'auto' }}
          >
            {submitting ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  style={{ animation: 'spw-spin 0.8s linear infinite' }}
                >
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="0.9" />
                </svg>
                Creating…
              </span>
            ) : (
              'Create password'
            )}
            <style>{`@keyframes spw-spin { to { transform: rotate(360deg); } }`}</style>
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}

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