// src/components/pin/PinKeypad.tsx
import type { ReactNode } from 'react'

interface PinKeypadProps {
  onDigit: (digit: string) => void
  onDelete: () => void
  disabled?: boolean
  /**
   * Optional node rendered directly beneath the "7" key.
   * Used by ReauthModal to place the fingerprint button on the
   * blank slot in the 4th row.
   */
  bioSlot?: ReactNode
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export default function PinKeypad({
  onDigit,
  onDelete,
  disabled = false,
  bioSlot,
}: PinKeypadProps) {
  return (
    <div className="fg-pin-keypad">
      {DIGITS.map((d) => {
        const button = (
          <button
            key={d}
            type="button"
            className="fg-pin-key"
            disabled={disabled}
            onClick={() => onDigit(d)}
          >
            {d}
          </button>
        )

        // Wrap "7" only when we actually need to anchor the bioSlot.
        if (d === '7' && bioSlot) {
          return (
            <div key={d} className="fg-pin-key-wrap">
              {button}
              {bioSlot}
            </div>
          )
        }

        return button
      })}

      {/* Bottom row: [blank] [0] [delete] */}
      <div className="fg-pin-key fg-pin-key-empty" aria-hidden />

      <button
        type="button"
        className="fg-pin-key"
        disabled={disabled}
        onClick={() => onDigit('0')}
      >
        0
      </button>

      <button
        type="button"
        className="fg-pin-key"
        aria-label="Delete"
        disabled={disabled}
        onClick={onDelete}
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
          <path
            d="M16 9L10 15M10 9L16 15M8 18L2 12L8 6C8 6 10 5.5 13.5 5.5C19.1685 5.5 20.5 5.5 20.5 12C20.5 18.5 19.2925 18.5 13.5 18.5C10 18.5 8 18 8 18Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  )
}