// src/components/reauth/ReauthModal.tsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PinInputs from '@/components/pin/PinInputs'
import PinKeypad from '@/components/pin/PinKeypad'
import Loader from '@/components/Loader'
import { usePinKeyboard } from '@/hooks/usePinKeyboard'
import { reauthApi } from '@/services/api'
import { useSession } from '@/hooks'
import { useBiometric } from '@/hooks/useBiometric'
import { toast } from '@/stores/toastStore'

interface ReauthModalProps {
  onSuccess: () => void
}

const PIN_LENGTH = 4

export default function ReauthModal({ onSuccess }: ReauthModalProps) {
  const { user, logout } = useSession()
  const navigate = useNavigate()
  const bio = useBiometric()

  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Auto-attempt the biometric prompt at most once per modal open
  const autoAttemptedRef = useRef(false)
  // Guard so success can only complete once
  const finishedRef = useRef(false)

  const bioEligible =
    bio.isReady && bio.isSupported && bio.enabled && bio.forLogin

  // Keypad must be inert while either ceremony is running
  const keypadDisabled = submitting || bio.isAuthenticating

  // Loader shows only during active server round trips, never during
  // the OS-native prompt — that window is owned by the OS.
  const showLoader = submitting || bio.phase === 'verifying'

  // Toast shows while we're fetching the WebAuthn options. Once the
  // native prompt is up, the OS takes over — no app UI needed.
  const showBioToast = bio.phase === 'preparing'

  // Warm the auth-options cache as soon as the modal mounts
  useEffect(() => {
    if (bioEligible) bio.prefetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bioEligible])

  // Fire-and-forget on success: /webauthn/auth/verify already cleared
  // the server lock, so /reauth/complete is belt-and-braces only.
  const finishWithSuccess = () => {
    if (finishedRef.current) return
    finishedRef.current = true

    void reauthApi.complete()
    onSuccess()
  }

  // ── Auto-attempt biometrics on mount (when browser permits) ──
  // Native prompt requires recent user activation (Safari: always,
  // Android Chrome: usually). Without it the request rejects and the
  // user sees a pointless loader — so only auto-fire while transient
  // activation is alive; otherwise wait for the fingerprint button.
  useEffect(() => {
    if (autoAttemptedRef.current) return
    if (!bioEligible) return

    const nav = navigator as Navigator & {
      userActivation?: { isActive: boolean }
    }
    if (!nav.userActivation?.isActive) return

    autoAttemptedRef.current = true

    void (async () => {
      const result = await bio.authenticate('reauth')

      if (result.ok) {
        finishWithSuccess()
        return
      }
      if (result.message === 'Cancelled') return

      setError(result.message || 'Biometric authentication failed')
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bioEligible])

  // ── PIN path ─────────────────────────────────────────────
  const handleDigit = (d: string) => {
    if (keypadDisabled || pin.length >= PIN_LENGTH) return
    const next = pin + d
    setPin(next)

    if (next.length !== PIN_LENGTH) return

    if (!user?.uid) {
      setError('Session error — please reload')
      setPin('')
      return
    }

    setSubmitting(true)
    reauthApi.reauthWithPin(next, user.uid).then((result) => {
      if (result.ok) {
        finishWithSuccess()
      } else {
        setError(result.message || 'Incorrect PIN')
        setPin('')
        setSubmitting(false)
      }
    })
  }

  const handleDelete = () => {
    if (keypadDisabled) return
    setPin((p) => p.slice(0, -1))
  }

  // ── Biometric path ───────────────────────────────────────
  const handleBiometric = async () => {
    if (keypadDisabled) return
    setError('')

    const result = await bio.authenticate('reauth')

    if (result.ok) {
      finishWithSuccess()
      return
    }
    if (result.message === 'Cancelled') return

    setError(result.message || 'Biometric authentication failed')
  }

  // ── Escape hatches ───────────────────────────────────────
  const handleLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  const handleForgotPin = () => {
    toast.info('PIN reset — check your email', 4000)
  }

  usePinKeyboard(handleDigit, handleDelete, keypadDisabled)

  const displayName =
    user?.username ||
    user?.firstName ||
    (user?.fullName ? user.fullName.split(' ')[0] : '') ||
    'User'
  const avatarUrl = user?.profilePicture

  // ── Fingerprint button injected into the keypad's blank slot ──
  const bioSlot = bioEligible ? (
    <button
      type="button"
      className="fg-pin-bio"
      aria-label="Use biometric authentication"
      onClick={handleBiometric}
      disabled={keypadDisabled}
    >
      <svg
        width="34"
        height="34"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M5.796 6.587c2.483-2.099 5.629-3.486 9.084-3.812l.066-.005c4.263 0 8.188 1.446 11.312 3.874l-.042-.031a.75.75 0 0 1-.932 1.176l-.002-.002C22.35 5.569 18.645 4.245 15 4.245h-.06c-3.14.291-5.99 1.548-8.16 3.398l-.02.017a.75.75 0 1 1-.96-1.152l.002-.002zM28.555 11.495c-4.166-4.572-8.404-6.891-12.602-6.891h-.044c-4.184.017-8.378 2.336-12.468 6.895a.75.75 0 1 0 1.116 1.003c3.794-4.23 7.615-6.382 11.356-6.396h.02c3.78-.03 7.63 2.134 11.51 6.395a.75.75 0 0 0 1.112-1.006zM22.68 27.684c-1.684-.444-3.106-1.387-4.139-2.657l-.011-.014c-1.034-1.355-1.692-3.047-1.792-4.887v-.02a.75.75 0 0 0-1.499.037c.13 2.135.898 4.07 2.107 5.654l.017.022c1.245 1.532 2.94 2.654 4.882 3.169l.065.015a.75.75 0 1 0 .37-1.453zM20.094 9.35c-1.252-.502-2.703-.793-4.222-.793-.586 0-1.162.043-1.725.127l.064-.008c-2.143.362-4.029 1.268-5.569 2.571l.017-.014c-2.242 1.836-3.847 4.374-4.482 7.275l-.016.086c-.093.436-.166.871-.228 1.369-.029.323-.046.7-.046 1.08 0 2.965 1.012 5.694 2.709 7.86l-.021-.028a.75.75 0 0 0 1.17-.938c-1.47-1.867-2.36-4.252-2.36-6.845 0-.348.016-.692.047-1.032l-.003.044c.05-.4.117-.797.2-1.189.578-2.645 2.001-4.892 3.966-6.5l.02-.017c1.324-1.122 2.963-1.912 4.767-2.222l.06-.008c.429-.064.923-.1 1.426-.1 1.33 0 2.6.255 3.764.718l-.069-.024c3.107 1.2 5.481 3.696 6.492 6.807l.022.077c.549 1.778.705 4.901-.43 6.142-.348.34-.823.549-1.348.549-.219 0-.43-.037-.626-.104l.014.004c-.743-.197-1.382-.57-1.893-1.073l.001.001a3.32 3.32 0 0 1-.877-1.164l-.008-.02c-.108-.36-.171-.774-.171-1.202v-.09c0-.555-.076-1.093-.217-1.603l.01.042c-.527-1.406-1.684-2.466-3.118-2.849l-.032-.007c-.463-.172-.997-.272-1.555-.272-.344 0-.679.038-1.001.11l.03-.006c-.913.269-1.685.784-2.262 1.469l-.006.007c-.679.705-1.167 1.597-1.38 2.592l-.006.035c-.008.137-.013.297-.013.458 0 2.243.889 4.278 2.333 5.773l-.002-.002c1.365 1.634 2.84 3.086 4.444 4.385l.06.047a.75.75 0 0 0 .972-1.144c-1.586-1.282-2.993-2.664-4.257-4.17l-.038-.047c-1.249-1.225-2.024-2.93-2.024-4.816 0-.075.001-.15.004-.224l0 .011c.168-.742.528-1.383 1.024-1.889l-.001.001c.389-.476.907-.833 1.499-1.022l.023-.006c.181-.037.389-.059.602-.059.394 0 .771.073 1.119.206l-.021-.007c.993.249 1.786.941 2.17 1.847l.008.021c.09.346.141.744.141 1.154 0 .018 0 .036 0 .054l0-.003c0 .019 0 .042 0 .064 0 .602.096 1.182.273 1.725l-.011-.039c.287.702.722 1.291 1.269 1.752l.007.006c.699.676 1.574 1.174 2.549 1.421l.039.008c.285.087.612.137.951.137.956 0 1.819-.399 2.431-1.04l.001-.001c1.689-1.846 1.359-5.639.756-7.596-1.175-3.631-3.878-6.475-7.332-7.815l-.084-.029zM9.269 20.688c.052-2.064 1.027-3.89 2.526-5.088l.013-.01c.574-.489 1.234-.901 1.95-1.208l.05-.019c.8-.349 1.732-.552 2.712-.552 1.095 0 2.131.254 3.053.705l-.041-.018c2.115 1.295 3.505 3.594 3.505 6.217 0 .112-.003.224-.008.335l.001-.016a.75.75 0 1 0 1.5.014c.006-.117.009-.254.009-.392 0-3.165-1.727-5.926-4.29-7.394l-.042-.022c-1.078-.535-2.347-.848-3.69-.848-1.187 0-2.317.245-3.342.686l.055-.021c-.915.389-1.703.88-2.401 1.475l.013-.011c-1.823 1.479-2.999 3.694-3.073 6.186l0 .012c.125 3.937 1.87 7.444 4.586 9.893l.012.011a.75.75 0 1 0 .996-1.122l0-0c-2.434-2.174-3.998-5.277-4.134-8.746l-.001-.023z"
          fill="currentColor"
        />
      </svg>
    </button>
  ) : null

  return (
    <div className="fg-reauth-overlay">
      <div className="fg-reauth-body">
        <div className="fg-reauth-avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} />
          ) : (
            <span>{displayName.charAt(0).toUpperCase()}</span>
          )}
        </div>

        <div className="fg-reauth-pill">{displayName}</div>

        <h1 className="fg-reauth-title">Welcome Back</h1>

        <p className="fg-reauth-subtitle">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L4 5v6c0 5.25 3.84 9.74 8 11 4.16-1.26 8-5.75 8-11V5l-8-3z"
              fill="#FFD700"
              opacity="0.95"
            />
            <rect x="9" y="10" width="6" height="5" rx="1" fill="#021827" />
          </svg>
          {bioEligible
            ? 'Enter your PIN or use fingerprint'
            : 'Enter your 4-digit PIN'}
        </p>

        <PinInputs length={PIN_LENGTH} filled={pin.length} />

        {error && <div className="fg-pin-alert error">{error}</div>}

        <PinKeypad
          onDigit={handleDigit}
          onDelete={handleDelete}
          disabled={keypadDisabled}
          bioSlot={bioSlot}
        />

        <div className="fg-reauth-links">
          <button
            type="button"
            className="fg-reauth-pill-btn"
            onClick={handleLogout}
            disabled={submitting}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="1.8" />
              <circle cx="12" cy="10" r="3" stroke="#fff" strokeWidth="1.8" />
              <path
                d="M6.5 19.5c1-3 3-4.5 5.5-4.5s4.5 1.5 5.5 4.5"
                stroke="#fff"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            Logout
          </button>
          <button
            type="button"
            className="fg-reauth-pill-btn"
            onClick={handleForgotPin}
            disabled={submitting}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="1.8" />
              <path
                d="M9.5 9.5a2.5 2.5 0 115 0c0 1.5-2.5 2-2.5 3.5"
                stroke="#fff"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <circle cx="12" cy="17" r="1" fill="#fff" />
            </svg>
            Forgot PIN?
          </button>
        </div>
      </div>

      {/* Loading toast — appears while we fetch WebAuthn options so
          the user knows the fingerprint prompt is on its way. */}
      {showBioToast && (
        <div className="bio-loading-toast" role="status" aria-live="polite">
          <span className="bio-loading-spinner" aria-hidden />
          Waiting for fingerprint…
        </div>
      )}

      {/* Loader — only during server round trips (PIN verify or
          biometric verify). Hidden during the OS-native prompt. */}
      {showLoader && <Loader transparent />}
    </div>
  )
}