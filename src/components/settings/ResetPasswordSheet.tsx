// src/components/settings/ResetPasswordSheet.tsx
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSession } from '@/hooks'
import { accountApi, extractApiError } from '@/services/api'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { toast } from '@/stores/toastStore'

interface ResetPasswordSheetProps {
  onClose: () => void
  onVerified: () => void
}

const OTP_LENGTH = 6
const RESEND_SECONDS = 60

export default function ResetPasswordSheet({
  onClose,
  onVerified,
}: ResetPasswordSheetProps) {
  const { user } = useSession()
  const email = user?.email || ''

  const [otp, setOtp] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)

  const inputRef = useRef<HTMLInputElement | null>(null)
  const sentOnceRef = useRef(false)
  const verifyLockRef = useRef(false)

  useBodyScrollLock(true)

  // Focus the input shortly after slide-in
  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 420)
    return () => window.clearTimeout(t)
  }, [])

  // Auto-send the first OTP on mount
  useEffect(() => {
    if (sentOnceRef.current) return
    sentOnceRef.current = true
    void sendOtp()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Resend countdown ticker
  useEffect(() => {
    if (countdown <= 0) return
    const id = window.setInterval(
      () => setCountdown((c) => Math.max(0, c - 1)),
      1000
    )
    return () => window.clearInterval(id)
  }, [countdown])

  async function sendOtp() {
    if (!email) {
      setError('No email on file. Please contact support.')
      return
    }
    setSending(true)
    setError(null)
    try {
      await accountApi.resendOtp(email)
      toast.success(`OTP sent to ${email}`)
      setCountdown(RESEND_SECONDS)
      setOtp('')
      inputRef.current?.focus()
    } catch (err) {
      const { message } = extractApiError(err)
      setError(message || 'Failed to send OTP. Try again.')
    } finally {
      setSending(false)
    }
  }

  async function handleVerify() {
    if (otp.length !== OTP_LENGTH) return
    if (!email) {
      setError('No email on file.')
      return
    }
    if (verifyLockRef.current) return
    verifyLockRef.current = true
    setVerifying(true)
    setError(null)
    try {
      const res = await accountApi.verifyOtp(email, otp)
      // Server may return a short-lived reset token — stash it on window
      // for the subsequent set-password call to pick up if it needs it.
      if (res && typeof res === 'object' && 'token' in res) {
        ;(window as unknown as { __rp_reset_token?: string }).__rp_reset_token =
          String(res.token)
      }
      toast.success('OTP verified')
      onVerified()
    } catch (err) {
      const { message } = extractApiError(err)
      setError(message || 'Invalid or expired OTP. Try again.')
      setOtp('')
      inputRef.current?.focus()
      verifyLockRef.current = false
    } finally {
      setVerifying(false)
    }
  }

  // Auto-verify when the 6th digit lands
  useEffect(() => {
    if (otp.length === OTP_LENGTH) void handleVerify()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp])

  const busy = verifying || sending

  const handleClose = () => {
    if (busy) return
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
            disabled={busy}
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
          <h2 className="cp-title">Reset Password</h2>
          <div className="cp-spacer" aria-hidden />
        </header>

        {/* Body */}
        <main className="cp-body">
          <div className="cp-form">
            <p
              style={{
                margin: '0 0 8px',
                color: '#cfcfcf',
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              We sent a 6-digit code to{' '}
              <strong style={{ color: '#fff', wordBreak: 'break-all' }}>
                {email || 'your email'}
              </strong>
              . Enter it below to continue.
            </p>

            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={OTP_LENGTH}
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => {
                const v = e.target.value
                  .replace(/\D/g, '')
                  .slice(0, OTP_LENGTH)
                setOtp(v)
                if (error) setError(null)
              }}
              disabled={busy}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                color: '#fff',
                fontSize: 18,
                letterSpacing: 8,
                textAlign: 'center',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 13,
                marginTop: 6,
              }}
            >
              <span style={{ color: '#8b95a5' }}>
                Didn't get the code?
              </span>
              <button
                type="button"
                onClick={() => void sendOtp()}
                disabled={countdown > 0 || sending || verifying}
                style={{
                  background: 'none',
                  border: 'none',
                  color:
                    countdown > 0 || sending
                      ? 'rgba(77,166,255,0.4)'
                      : '#4da6ff',
                  fontWeight: 600,
                  cursor:
                    countdown > 0 || sending ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  padding: '4px 8px',
                }}
              >
                {sending
                  ? 'Sending…'
                  : countdown > 0
                    ? `Resend in ${countdown}s`
                    : 'Resend OTP'}
              </button>
            </div>

            {error && (
              <div
                style={{
                  marginTop: 10,
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(255,77,79,0.08)',
                  border: '1px solid rgba(255,77,79,0.3)',
                  color: '#ff8a8a',
                  fontSize: 13,
                  lineHeight: 1.4,
                }}
              >
                {error}
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="cp-footer">
          <button
            type="button"
            className="cp-submit"
            onClick={handleVerify}
            disabled={otp.length !== OTP_LENGTH || busy}
            style={{ pointerEvents: 'auto' }}
          >
            {verifying ? (
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
                  style={{ animation: 'rp-spin 0.8s linear infinite' }}
                >
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="0.9" />
                </svg>
                Verifying…
              </span>
            ) : (
              'Verify OTP'
            )}
            <style>{`@keyframes rp-spin { to { transform: rotate(360deg); } }`}</style>
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}