import { useState } from 'react'
import FullScreenModal from '@/components/modals/FullScreenModal'
import PinInputs from './PinInputs'
import PinKeypad from './PinKeypad'
import Loader from '@/components/Loader'
import { pinApi } from '@/hooks/usePin'
import { usePinKeyboard } from '@/hooks/usePinKeyboard'

interface SetupPinModalProps {
  onClose: () => void
  onSuccess: () => Promise<void> | void
}

type Stage = 'create' | 'confirm'

const PIN_LENGTH = 4

export default function SetupPinModal({
  onClose,
  onSuccess,
}: SetupPinModalProps) {
  const [stage, setStage] = useState<Stage>('create')
  const [pin, setPin] = useState('')
  const [firstPin, setFirstPin] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleDigit = (d: string) => {
    if (submitting || pin.length >= PIN_LENGTH) return

    const next = pin + d
    setPin(next)

    if (next.length !== PIN_LENGTH) return

    // ── 4th digit landed ──
    if (stage === 'create') {
      // Short pause so the user sees the dots fill before we advance
      window.setTimeout(() => {
        setFirstPin(next)
        setPin('')
        setStage('confirm')
        setError('')
      }, 150)
      return
    }

    // stage === 'confirm'
    if (next !== firstPin) {
      setError('PINs do not match — try again')
      setPin('')
      setFirstPin('')
      setStage('create')
      return
    }

    // Match! Batched with setPin above → loader shows on the same frame.
    setSubmitting(true)

    pinApi.savePin(next).then(async (result) => {
      if (result.ok) {
        await onSuccess()
      } else {
        setError(result.message || 'Failed to save PIN')
        setPin('')
        setFirstPin('')
        setStage('create')
        setSubmitting(false)
      }
    })
  }

  const handleDelete = () => {
    if (submitting) return
    setPin((p) => p.slice(0, -1))
  }

  usePinKeyboard(handleDigit, handleDelete, submitting)

  const title = stage === 'create' ? 'Create PIN' : 'Confirm PIN'
  const heading =
    stage === 'create' ? 'Create a 4-digit PIN' : 'Confirm your 4-digit PIN'

  return (
    <FullScreenModal title={title} onClose={onClose}>
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

      <p className="fg-pin-heading">{heading}</p>

      <PinInputs length={PIN_LENGTH} filled={pin.length} />

      {error && <div className="fg-pin-alert error">{error}</div>}

      <PinKeypad
        onDigit={handleDigit}
        onDelete={handleDelete}
        disabled={submitting}
      />

      {submitting && <Loader transparent />}
    </FullScreenModal>
  )
}