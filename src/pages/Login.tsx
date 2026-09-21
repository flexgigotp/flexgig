import { useState, useEffect, useRef, FormEvent, KeyboardEvent, ClipboardEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, extractApiError } from '@/services/api'
import '@/styles/login.css'

type Step = 'email' | 'password' | 'otp' | 'set-password' | 'reset-password'

const OTP_LENGTH = 6

// ── Shared password input with eye toggle ──────────────────────────
function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoFocus = false,
  autoComplete = 'off',
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
  autoComplete?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="fg-login-password-field">
      <label className="fg-login-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        className="fg-login-input"
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
      />
      <button
        type="button"
        className="fg-login-eye"
        aria-label={show ? 'Hide password' : 'Show password'}
        onClick={() => setShow((v) => !v)}
      >
        {show ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.5 21.5 0 0 1 5.11-6.56" />
            <path d="M1 1l22 22" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────
export default function Login() {
  const [params] = useSearchParams()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [password, setPassword] = useState('')
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const otpRefs = useRef<Array<HTMLInputElement | null>>([])

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [userUid, setUserUid] = useState('')

  const [resetCode, setResetCode] = useState('')
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetConfirmPassword, setResetConfirmPassword] = useState('')

  const [resendCooldown, setResendCooldown] = useState(0)
  const countdownRef = useRef<number | null>(null)

  // handle ?email=X&code=Y (email-link flow) on load
  useEffect(() => {
    const e = params.get('email')
    const c = params.get('code')
    if (e && c) {
      setEmail(e)
      setResetCode(c)
      setStep('reset-password')
    }
  }, [params])

  useEffect(() => {
    return () => {
      if (countdownRef.current) window.clearInterval(countdownRef.current)
    }
  }, [])

  const startResendCountdown = () => {
    setResendCooldown(120)
    if (countdownRef.current) window.clearInterval(countdownRef.current)
    countdownRef.current = window.setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          if (countdownRef.current) window.clearInterval(countdownRef.current)
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  // ── Step 1: email ────────────────────────────────────────────────
  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const cleaned = email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(cleaned)) {
      setError('Enter a valid email address')
      return
    }
    setEmail(cleaned)

    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email: cleaned })
      const data = res.data

      if (data.status === 'otp_sent') {
        setStep('otp')
        startResendCountdown()
      } else if (
        data.status === 'password_required' ||
        data.hasPassword === true ||
        data.requires_password === true
      ) {
        setStep('password')
      } else {
        // Fallback — assume password
        setStep('password')
      }
    } catch (err) {
      setError(extractApiError(err).message)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: password ─────────────────────────────────────────────
  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email, password })
      const data = res.data
      if (data.status === 'otp_sent') {
        setStep('otp')
        startResendCountdown()
      } else if (data.token) {
        // full reload so session fetches with fresh cookies
        window.location.href = '/dashboard'
      } else {
        setError('Unexpected response from server')
      }
    } catch (err) {
      setError(extractApiError(err).message)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 3: OTP ──────────────────────────────────────────────────
  const handleOtpSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const code = otpDigits.join('')
    if (code.length !== OTP_LENGTH) {
      setError(`Enter the ${OTP_LENGTH}-digit code`)
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/auth/verify-otp', { email, token: code })
      const data = res.data
      if (data.token && data.user?.uid) {
        setAccessToken(data.token)
        setUserUid(data.user.uid)
        setStep('set-password')
      } else {
        setError('Invalid response from server')
      }
    } catch (err) {
      setError(extractApiError(err).message)
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, '')
    if (!digits) {
      setOtpDigits((prev) => {
        const next = [...prev]
        next[index] = ''
        return next
      })
      return
    }
    setOtpDigits((prev) => {
      const next = [...prev]
      for (let i = 0; i < digits.length && index + i < OTP_LENGTH; i++) {
        next[index + i] = digits[i]
      }
      return next
    })
    const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1)
    setTimeout(() => otpRefs.current[nextIndex]?.focus(), 0)
  }

  const handleOtpKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpPaste = (e: ClipboardEvent) => {
    e.preventDefault()
    const text = (e.clipboardData || (window as any).clipboardData)
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, OTP_LENGTH)
    if (!text) return
    setOtpDigits((prev) => {
      const next = [...prev]
      for (let i = 0; i < text.length; i++) next[i] = text[i]
      return next
    })
    otpRefs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus()
  }

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/resend-otp', { email })
      startResendCountdown()
    } catch (err) {
      setError(extractApiError(err).message)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/send-otp', { email })
      setStep('otp')
      startResendCountdown()
    } catch (err) {
      setError(extractApiError(err).message)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 4: set password (new users after OTP) ───────────────────
  const handleSetPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await api.post(
        '/auth/set-password',
        { uid: userUid, password: newPassword },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      const loginRes = await api.post('/auth/login', { email, password: newPassword })
      if (loginRes.data?.token) {
        window.location.href = '/dashboard'
      } else {
        setError('Failed to sign in after setting password')
      }
    } catch (err) {
      setError(extractApiError(err).message)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 5: reset password (email-link flow) ─────────────────────
  const handleResetPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!resetCode) {
      setError('Enter the reset code')
      return
    }
    if (resetNewPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const verifyRes = await api.post('/auth/verify-otp', {
        email,
        token: resetCode,
      })
      const token = verifyRes.data?.token
      const uid = verifyRes.data?.user?.uid
      if (!token || !uid) throw new Error('Invalid reset code')

      await api.post(
        '/auth/set-password',
        { uid, password: resetNewPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      const loginRes = await api.post('/auth/login', {
        email,
        password: resetNewPassword,
      })
      if (loginRes.data?.token) {
        window.location.href = '/dashboard'
      }
    } catch (err) {
      setError(extractApiError(err).message)
    } finally {
      setLoading(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="fg-login-wrap">
      <div className="fg-login-nav">
        <Link to="/" aria-label="Back to Flexgig">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back to Flexgig
        </Link>
      </div>

      {/* ─── Step 1: email ─────────────────────────────── */}
      {step === 'email' && (
        <form className="fg-login-card" onSubmit={handleEmailSubmit}>
          <div className="fg-login-row">
            <div className="fg-login-logo">FG</div>
            <h1>Continue with Email</h1>
          </div>
          <p className="fg-login-sub">What is your email?</p>

          <label className="fg-login-label" htmlFor="email">Email address</label>
          <input
            id="email"
            className="fg-login-input"
            type="email"
            autoComplete="email"
            placeholder="you@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
          {error && <div className="fg-login-error">{error}</div>}

          <button
            type="submit"
            className={`fg-login-btn${loading ? ' loading' : ''}`}
            disabled={loading}
          >
            Continue
            {loading && <span className="fg-login-spinner" />}
          </button>

          <p className="fg-login-hint">
            We'll check if you already have an account.
          </p>
        </form>
      )}

      {/* ─── Step 2: password ──────────────────────────── */}
      {step === 'password' && (
        <form className="fg-login-card" onSubmit={handlePasswordSubmit}>
          <button
            type="button"
            className="fg-login-back"
            onClick={() => {
              setStep('email')
              setError('')
              setPassword('')
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back
          </button>

          <h1>Welcome back</h1>
          <p className="fg-login-sub">for {email}</p>

          <PasswordInput
            id="password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            autoFocus
          />
          {error && <div className="fg-login-error">{error}</div>}

          <button
            type="submit"
            className={`fg-login-btn${loading ? ' loading' : ''}`}
            disabled={loading}
          >
            Login
            {loading && <span className="fg-login-spinner" />}
          </button>

          <p className="fg-login-hint">
            <button
              type="button"
              className="fg-login-link"
              onClick={handleForgotPassword}
              disabled={loading}
            >
              Forgot password?
            </button>
          </p>
        </form>
      )}

      {/* ─── Step 3: OTP ───────────────────────────────── */}
      {step === 'otp' && (
        <form className="fg-login-card" onSubmit={handleOtpSubmit}>
          <button
            type="button"
            className="fg-login-back"
            onClick={() => {
              setStep('email')
              setError('')
              setOtpDigits(Array(OTP_LENGTH).fill(''))
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back
          </button>

          <h1>Enter the OTP</h1>
          <p className="fg-login-sub">We sent a code to {email}</p>

          <div className="fg-login-otp-grid" onPaste={handleOtpPaste}>
            {otpDigits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { otpRefs.current[i] = el }}
                className="fg-login-input"
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                autoFocus={i === 0}
              />
            ))}
          </div>
          {error && <div className="fg-login-error">{error}</div>}

          <button
            type="submit"
            className={`fg-login-btn${loading ? ' loading' : ''}`}
            disabled={loading}
          >
            Verify
            {loading && <span className="fg-login-spinner" />}
          </button>

          <p className="fg-login-hint">
            Didn't see it?{' '}
            <button
              type="button"
              className="fg-login-link"
              onClick={handleResendOtp}
              disabled={resendCooldown > 0 || loading}
            >
              Resend OTP
            </button>
            {resendCooldown > 0 && (
              <span className="fg-login-countdown">
                {' '}(Wait {Math.floor(resendCooldown / 60)}:
                {String(resendCooldown % 60).padStart(2, '0')})
              </span>
            )}
          </p>
        </form>
      )}

      {/* ─── Step 4: set password ──────────────────────── */}
      {step === 'set-password' && (
        <form className="fg-login-card" onSubmit={handleSetPasswordSubmit}>
          <h1>Set your password</h1>
          <p className="fg-login-sub">
            Create a password for your new Flexgig account.
          </p>

          <PasswordInput
            id="newPassword"
            label="Password"
            value={newPassword}
            onChange={setNewPassword}
            autoFocus
          />

          <PasswordInput
            id="confirmPassword"
            label="Confirm password"
            value={confirmPassword}
            onChange={setConfirmPassword}
          />
          {error && <div className="fg-login-error">{error}</div>}

          <button
            type="submit"
            className={`fg-login-btn${loading ? ' loading' : ''}`}
            disabled={loading}
          >
            Save password
            {loading && <span className="fg-login-spinner" />}
          </button>
        </form>
      )}

      {/* ─── Step 5: reset password ────────────────────── */}
      {step === 'reset-password' && (
        <form className="fg-login-card" onSubmit={handleResetPasswordSubmit}>
          <h1>Reset your password</h1>
          <p className="fg-login-sub">
            Enter the code sent to your email and set a new password.
          </p>

          <label className="fg-login-label" htmlFor="resetCode">Reset code</label>
          <input
            id="resetCode"
            className="fg-login-input"
            type="text"
            placeholder="Enter the code"
            value={resetCode}
            onChange={(e) => setResetCode(e.target.value)}
          />

          <PasswordInput
            id="resetNewPassword"
            label="New password"
            value={resetNewPassword}
            onChange={setResetNewPassword}
          />

          <PasswordInput
            id="resetConfirmPassword"
            label="Confirm new password"
            value={resetConfirmPassword}
            onChange={setResetConfirmPassword}
          />
          {error && <div className="fg-login-error">{error}</div>}

          <button
            type="submit"
            className={`fg-login-btn${loading ? ' loading' : ''}`}
            disabled={loading}
          >
            Reset password
            {loading && <span className="fg-login-spinner" />}
          </button>
        </form>
      )}
    </div>
  )
}