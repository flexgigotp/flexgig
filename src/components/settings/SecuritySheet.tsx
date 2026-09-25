// src/components/settings/SecuritySheet.tsx
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useSession } from '@/hooks'
import { useBiometric } from '@/hooks/useBiometric'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useModalParam } from '@/hooks/useModalParam'
import { toast } from '@/stores/toastStore'
import Loader from '@/components/Loader'
import ChangePasswordSheet from './ChangePasswordSheet'
import ResetPasswordSheet from './ResetPasswordSheet'
import SetPasswordSheet from './SetPasswordSheet'
import PushToggleRow from './PushToggleRow'

interface SecuritySheetProps {
  onClose: () => void
}

const BALANCE_KEY = 'flexgig-balance-visible'

export default function SecuritySheet({ onClose }: SecuritySheetProps) {
  const navigate = useNavigate()
  const { user } = useSession()

  const bio = useBiometric()

  // URL params — three separate flows, one visible at a time
  const cpModal = useModalParam('cp')
  const rpModal = useModalParam('rp')
  const spwModal = useModalParam('spw')

  const [showChildren, setShowChildren] = useState(bio.enabled)
  const [balanceVisible, setBalanceVisible] = useState(() => {
    try {
      return localStorage.getItem(BALANCE_KEY) === 'true'
    } catch {
      return false
    }
  })

  useBodyScrollLock(true)

  const hasPin = user?.hasPin === true
  const busy = bio.isRegistering

  // ── Transition: CP → Reset (forgot password) ────────────────
  const handleForgotPassword = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('cp')
    url.searchParams.set('rp', '1')
    navigate(url.pathname + url.search, { replace: true })
  }

  // ── Transition: Reset → Set Password (OTP verified) ─────────
  const handleOtpVerified = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('rp')
    url.searchParams.set('spw', '1')
    navigate(url.pathname + url.search, { replace: true })
  }

  const handlePinClick = () => {
    if (busy) return
    onClose()
    navigate(hasPin ? '/pin-change' : '/pin-setup')
  }

  const handleParentToggle = async () => {
    if (busy) return

    if (bio.enabled) {
      const confirmed = window.confirm(
        'Disable biometrics? You will need your PIN next time.'
      )
      if (!confirmed) return

      setShowChildren(false)
      const res = await bio.revoke()
      if (res.ok) {
        toast.success('Biometrics disabled')
      } else {
        toast.error(res.message || 'Failed to disable biometrics')
        setShowChildren(true)
      }
      return
    }

    if (!hasPin) {
      toast.info('Please set a PIN first before enabling biometrics.')
      return
    }
    if (!bio.isSupported) {
      toast.error('Biometrics not available on this device')
      return
    }

    const res = await bio.register()
    if (res.ok) {
      setShowChildren(true)
      toast.success('Biometrics enabled')
      return
    }
    if (res.message === 'Cancelled') return
    toast.error(res.message || 'Failed to enable biometrics')
  }

  const handleChildToggle = (which: 'login' | 'tx') => {
    if (busy) return
    const current = which === 'login' ? bio.forLogin : bio.forTx
    bio.setChildEnabled(which, !current)
  }

  const handleBalanceToggle = () => {
    const next = !balanceVisible
    setBalanceVisible(next)
    try {
      localStorage.setItem(BALANCE_KEY, String(next))
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event('balance-visibility-change'))
  }

  return createPortal(
    <div
      className="security-modal active"
      role="dialog"
      aria-modal="true"
      aria-labelledby="securityTitle"
    >
      <button
        type="button"
        className="security-modal-close all-modal-chevron"
        aria-label="Back"
        onClick={onClose}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M15 18L9 12L15 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className="security-modal-header all-modal-headers">
        <h1 id="securityTitle" className="all-modal-title">
          Security
        </h1>
      </div>

      <div className="security-modal-body">
        <div className="security-settings" role="list">
          {/* ── Biometrics parent ─────────────────────── */}
          <div className="setting-row" role="listitem">
            <div className="setting-left">
              <div className="setting-title">Biometrics</div>
              <div className="setting-desc">
                {!bio.isReady
                  ? 'Checking device…'
                  : !bio.isSupported
                    ? 'Not available on this device'
                    : bio.enabled
                      ? 'Enabled — tap to disable'
                      : 'Use fingerprint / face recognition'}
              </div>
            </div>
            <div className="setting-right">
              <button
                type="button"
                className="switch"
                role="switch"
                aria-checked={bio.enabled}
                aria-label="Toggle biometrics"
                onClick={handleParentToggle}
                disabled={!bio.isReady || !bio.isSupported || busy}
              >
                <span className="knob" />
              </button>
            </div>
          </div>

          {showChildren && bio.enabled && (
            <div
              className="setting-subgroup show"
              role="group"
              aria-label="Biometric usage"
            >
              <div className="setting-row visible" role="listitem">
                <div className="setting-left">
                  <div className="setting-title">
                    Use for login &amp; reauth
                  </div>
                  <div className="setting-desc">
                    Fingerprint to unlock your account
                  </div>
                </div>
                <div className="setting-right">
                  <button
                    type="button"
                    className="switch small"
                    role="switch"
                    aria-checked={bio.forLogin}
                    aria-label="Toggle biometrics for login"
                    onClick={() => handleChildToggle('login')}
                    disabled={busy}
                  >
                    <span className="knob" />
                  </button>
                </div>
              </div>

              <div className="setting-row visible" role="listitem">
                <div className="setting-left">
                  <div className="setting-title">Use for checkout</div>
                  <div className="setting-desc">
                    Fingerprint to confirm payments
                  </div>
                </div>
                <div className="setting-right">
                  <button
                    type="button"
                    className="switch small"
                    role="switch"
                    aria-checked={bio.forTx}
                    aria-label="Toggle biometrics for checkout"
                    onClick={() => handleChildToggle('tx')}
                    disabled={busy}
                  >
                    <span className="knob" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Account PIN ────────────────────────────── */}
          <div
            className="setting-row pin-row"
            role="button"
            tabIndex={0}
            onClick={handlePinClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handlePinClick()
            }}
          >
            <div className="setting-left">
              <div className="setting-title">Account PIN</div>
              <div className="setting-desc">
                {hasPin
                  ? 'Change your 4-digit PIN'
                  : 'No PIN set — set one now'}
              </div>
            </div>
            <div className="setting-right">
              <svg
                className="arrow-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M9 18l6-6-6-6"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* ── Change password ────────────────────────── */}
          <div
            className="setting-row"
            role="button"
            tabIndex={0}
            onClick={() => !busy && cpModal.open()}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !busy) {
                cpModal.open()
              }
            }}
          >
            <div className="setting-left">
              <div className="setting-title">Change password</div>
              <div className="setting-desc">
                Update your account password
              </div>
            </div>
            <div className="setting-right">
              <svg
                className="arrow-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M9 18l6-6-6-6"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* ── Show wallet balance ────────────────────── */}
          <div className="setting-row" role="listitem">
            <div className="setting-left">
              <div className="setting-title">Show wallet balance</div>
              <div className="setting-desc">
                If off, balance is hidden on the dashboard
              </div>
            </div>
            <div className="setting-right">
              <button
                type="button"
                className="switch"
                role="switch"
                aria-checked={balanceVisible}
                aria-label="Toggle balance visibility"
                onClick={handleBalanceToggle}
              >
                <span className="knob" />
              </button>
            </div>
          </div>
          <PushToggleRow />
        </div>

        <div style={{ height: 10 }} />
      </div>

      {cpModal.isOpen && (
        <ChangePasswordSheet
          onClose={cpModal.close}
          onForgotPassword={handleForgotPassword}
        />
      )}

      {rpModal.isOpen && (
        <ResetPasswordSheet
          onClose={rpModal.close}
          onVerified={handleOtpVerified}
        />
      )}

      {spwModal.isOpen && <SetPasswordSheet onClose={spwModal.close} />}

      {bio.isRegistering && <Loader transparent />}
    </div>,
    document.body
  )
}