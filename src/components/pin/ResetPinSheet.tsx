// src/components/pin/ResetPinSheet.tsx
import { useEffect, useRef, useState } from 'react'
import FullScreenModal from '@/components/modals/FullScreenModal'
import { useSession } from '@/hooks'
import { accountApi, extractApiError } from '@/services/api'
import { toast } from '@/stores/toastStore'

interface ResetPinSheetProps {
  onClose: () => void
  onVerified: () => void
}

const OTP_LENGTH = 6
const RESEND_SECONDS = 60

export default function ResetPinSheet({
  onClose,
  onVerified,
}: ResetPinSheetProps) {
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

  // Focus after slide-in
  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 400)
    return () => window.clearTimeout(t)
  }, [])

  // Send OTP on mount
  useEffect(() => {
    if (sentOnceRef.current) return
    sentOnceRef.current = true
    void sendOtp()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Resend countdown
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
      if (res && typeof res === 'object' && 'token' in res) {
        ;(
          window as unknown as { __rp_reset_token?: string }
        ).__rp_reset_token = String(res.token)
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

  // Auto-verify on 6th digit
  useEffect(() => {
    if (otp.length === OTP_LENGTH) void handleVerify()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp])

  const busy = verifying || sending
  const ready = otp.length === OTP_LENGTH && !busy

  return (
    <FullScreenModal title="Reset PIN" onClose={onClose}>
      <div className="fg-pin-icon">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L4 5v6c0 5.25 3.84 9.74 8 11 4.16-1.26 8-5.75 8-11V5l-8-3z"
            fill="#FFD700"
            opacity="0.95"
          />
          <rect x="9" y="10" width="6" height="5" rx="1" fill="#021827" />
        </svg>
      </div>

      <p className="fg-pin-heading" style={{ marginBottom: 6 }}>
        Enter the 6-digit code sent to
      </p>
      <p
        style={{
          margin: '0 0 28px',
          color: '#fff',
          fontWeight: 700,
          fontSize: 14,
          wordBreak: 'break-all',
          textAlign: 'center',
        }}
      >
        {email || 'your email'}
      </p>

      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={OTP_LENGTH}
        placeholder="──────"
        value={otp}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH)
          setOtp(v)
          if (error) setError(null)
        }}
        disabled={busy}
        style={{
          width: '100%',
          maxWidth: 300,
          padding: '16px',
          borderRadius: 12,
          border: '1.5px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.05)',
          color: '#fff',
          fontSize: 26,
          letterSpacing: 10,
          textAlign: 'center',
          outline: 'none',
          fontFamily: 'inherit',
          boxSizing: 'border-box',
          marginBottom: 14,
        }}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: 300,
          width: '100%',
          fontSize: 13,
          marginBottom: 18,
        }}
      >
        <span style={{ color: '#8b95a5' }}>Didn't get the code?</span>
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
          className="fg-pin-alert error"
          style={{ maxWidth: 300, width: '100%', marginBottom: 12 }}
        >
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={() => void handleVerify()}
        disabled={!ready}
        style={{
          marginTop: 4,
          padding: '14px 32px',
          borderRadius: 50,
          border: 'none',
          background: ready
            ? 'linear-gradient(90deg,#00d4aa,#00bfa5)'
            : 'rgba(255,255,255,0.06)',
          color: ready ? '#fff' : '#666',
          fontSize: 15,
          fontWeight: 700,
          cursor: ready ? 'pointer' : 'not-allowed',
          fontFamily: 'inherit',
          minWidth: 200,
          transition: 'all 0.15s',
        }}
      >
        {verifying ? 'Verifying…' : 'Verify OTP'}
      </button>
    </FullScreenModal>
  )
}