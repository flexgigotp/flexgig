import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePinKeyboard } from '@/hooks/usePinKeyboard'
import Loader from '@/components/Loader'

interface CheckoutPinSheetProps {
  onSubmit: (pin: string) => Promise<{ ok: boolean; message?: string }>
  onClose: () => void
  onForgotPin?: () => void
  biometricEnabled?: boolean
  onBiometric?: () => void
}

const PIN_LENGTH = 4

export default function CheckoutPinSheet({
  onSubmit,
  onClose,
  onForgotPin,
  biometricEnabled = false,
  onBiometric,
}: CheckoutPinSheetProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleDigit = useCallback(
    (d: string) => {
      if (submitting || pin.length >= PIN_LENGTH) return
      const next = pin + d
      setPin(next)
      if (next.length !== PIN_LENGTH) return

      setSubmitting(true)
      setError('')
      onSubmit(next).then((result) => {
        if (!result.ok) {
          setError(result.message || 'Incorrect PIN')
          setPin('')
          setSubmitting(false)
        }
        // on success the parent unmounts this sheet
      })
    },
    [pin, submitting, onSubmit]
  )

  const handleDelete = useCallback(() => {
    if (submitting) return
    setPin((p) => p.slice(0, -1))
  }, [submitting])

  usePinKeyboard(handleDigit, handleDelete, submitting)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, submitting])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return createPortal(
    <div
      className="fg-cpin-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose()
      }}
    >
      <div className="fg-cpin-sheet" role="dialog" aria-modal="true">
        <header className="fg-cpin-header">
          <button
            type="button"
            className="fg-cpin-close"
            aria-label="Close"
            onClick={onClose}
            disabled={submitting}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6L18 18M6 18L18 6"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <h2 className="fg-cpin-title">Enter PIN</h2>
          <div style={{ width: 32, flexShrink: 0 }} aria-hidden />
        </header>

        <div className="fg-cpin-inputs" aria-hidden>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <div
              key={i}
              className={`fg-cpin-box${i < pin.length ? ' filled' : ''}`}
            />
          ))}
        </div>

        {onForgotPin && (
          <div className="fg-cpin-forgot">
            <button
              type="button"
              className="fg-cpin-forgot-btn"
              onClick={onForgotPin}
              disabled={submitting}
            >
              Forgot PIN?
            </button>
          </div>
        )}

        <div className="fg-cpin-keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              className="fg-cpin-key"
              onClick={() => handleDigit(d)}
              disabled={submitting}
            >
              {d}
            </button>
          ))}

          {biometricEnabled ? (
            <button
              type="button"
              className="fg-cpin-key fg-cpin-key-blank"
              aria-label="Use biometrics"
              onClick={onBiometric}
              disabled={submitting}
            >
              <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
                <path
                  d="M5.8 6.6A15 15 0 0 1 16 3c4.3 0 8.2 1.5 11.3 3.9M28.6 11.5C24.4 6.9 20.1 4.6 16 4.6c-4.2 0-8.4 2.3-12.5 6.9M22.7 27.7c-1.7-.4-3.1-1.4-4.2-2.7-1-1.4-1.7-3-1.8-4.9M20.1 9.4A11 11 0 0 0 16 8.6c-.6 0-1.2 0-1.7.1-2.1.4-4 1.3-5.6 2.6A12.7 12.7 0 0 0 4.2 18.6M9.3 20.7c.1-2 1-3.9 2.5-5.1A8 8 0 0 1 16 14c.8 0 1.5.1 2.2.3"
                  stroke="#fff"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          ) : (
            <div className="fg-cpin-key fg-cpin-key-blank" aria-hidden />
          )}

          <button
            type="button"
            className="fg-cpin-key"
            onClick={() => handleDigit('0')}
            disabled={submitting}
          >
            0
          </button>

          <button
            type="button"
            className="fg-cpin-key fg-cpin-key-delete"
            aria-label="Delete"
            onClick={handleDelete}
            disabled={submitting}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <path
                d="M16 9L10 15M10 9L16 15M8 18L2 12L8 6C8 6 10 5.5 13.5 5.5C19.2 5.5 20.5 5.5 20.5 12C20.5 18.5 19.3 18.5 13.5 18.5C10 18.5 8 18 8 18Z"
                stroke="#fff"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

                {error && <div className="fg-cpin-error">{error}</div>}

        {submitting && <Loader transparent />}
      </div>
    </div>,
    document.body
  )
}