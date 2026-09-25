import { useState } from 'react'
import FullScreenModal from '@/components/modals/FullScreenModal'
import PinInputs from './PinInputs'
import PinKeypad from './PinKeypad'
import Loader from '@/components/Loader'
import { pinApi } from '@/hooks/usePin'
import { usePinKeyboard } from '@/hooks/usePinKeyboard'

interface ChangePinModalProps {
  onClose: () => void
  onSuccess: () => Promise<void> | void
  onForgotPin?: () => void
}

type Stage = 'current' | 'new' | 'confirm'

const PIN_LENGTH = 4

const TITLES: Record<Stage, string> = {
  current: 'Account PIN',
  new: 'New PIN',
  confirm: 'Confirm PIN',
}

const HEADINGS: Record<Stage, string> = {
  current: 'Enter your current PIN',
  new: 'Choose a new 4-digit PIN',
  confirm: 'Confirm your new PIN',
}

export default function ChangePinModal({
  onClose,
  onSuccess,
  onForgotPin,
}: ChangePinModalProps) {
  const [stage, setStage] = useState<Stage>('current')
  const [pin, setPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleDigit = (d: string) => {
    if (submitting || pin.length >= PIN_LENGTH) return

    const next = pin + d
    setPin(next)

    if (next.length !== PIN_LENGTH) return

    // ── 4th digit landed ──
    if (stage === 'current') {
      setSubmitting(true)
      pinApi.verifyPin(next, 'reauth').then((result) => {
        if (result.ok) {
          setStage('new')
          setPin('')
          setError('')
          setSubmitting(false)
        } else {
          setError(result.message || 'Current PIN is incorrect')
          setPin('')
          setSubmitting(false)
        }
      })
      return
    }

    if (stage === 'new') {
      window.setTimeout(() => {
        setNewPin(next)
        setPin('')
        setStage('confirm')
        setError('')
      }, 150)
      return
    }

    // stage === 'confirm'
    if (next !== newPin) {
      setError('PINs do not match — try again')
      setPin('')
      setNewPin('')
      setStage('new')
      return
    }

    setSubmitting(true)
    pinApi.savePin(next).then(async (result) => {
      if (result.ok) {
        void import('@/services/api').then(({ api }) =>
          api.post('/reauth/complete').catch(() => null)
        )
        await onSuccess()
      } else {
        setError(result.message || 'Failed to change PIN')
        setPin('')
        setNewPin('')
        setStage('new')
        setSubmitting(false)
      }
    })
  }

  const handleDelete = () => {
    if (submitting) return
    setPin((p) => p.slice(0, -1))
  }

  usePinKeyboard(handleDigit, handleDelete, submitting)

  const showForgotLink = stage === 'current' && !!onForgotPin

  return (
    <FullScreenModal title={TITLES[stage]} onClose={onClose}>
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

      <p className="fg-pin-heading">{HEADINGS[stage]}</p>

      <PinInputs length={PIN_LENGTH} filled={pin.length} />

      {error && <div className="fg-pin-alert error">{error}</div>}

      <PinKeypad
        onDigit={handleDigit}
        onDelete={handleDelete}
        disabled={submitting}
      />

      {showForgotLink && (
        <button
          type="button"
          onClick={onForgotPin}
          disabled={submitting}
          style={{
            marginTop: 24,
            background: 'none',
            border: 'none',
            color: '#4da6ff',
            fontSize: 14,
            fontFamily: 'inherit',
            textDecoration: 'none',
            cursor: submitting ? 'not-allowed' : 'pointer',
            padding: '8px 16px',
            opacity: submitting ? 0.5 : 1,
          }}
        >
          Forgot your PIN?
        </button>
      )}

      {submitting && <Loader transparent />}
    </FullScreenModal>
  )
}