import { Fragment } from 'react'
import { PROVIDERS } from '@/lib/providers'
import { networkToProviderId, type SimilarMatch } from '@/services/phoneHistory'

interface SimilarNumberModalProps {
  typedDigits: string
  matches: SimilarMatch[]
  onPick: (match: SimilarMatch) => void
  onContinue: () => void
}

const mismatchStyle: React.CSSProperties = {
  color: '#fff',
  background: '#e53935',
  borderRadius: 4,
  padding: '0 3px',
  margin: '0 1px',
  fontWeight: 700,
  boxShadow: '0 0 0 1px #e53935',
}

/** Full number on one line; only the digits that differ from what was typed are highlighted. */
function HighlightedNumber({
  digits,
  typed,
}: {
  digits: string
  typed: string
}) {
  return (
    <span
      style={{
        color: '#111',
        fontWeight: 600,
        letterSpacing: 0.5,
        whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {digits.split('').map((d, i) => {
        const isMismatch = typed[i] !== undefined && d !== typed[i]
        return (
          <Fragment key={i}>
            <span
              title={isMismatch ? `You typed ${typed[i]}` : undefined}
              style={{
                display: 'inline-block',
                ...(isMismatch ? mismatchStyle : null),
              }}
            >
              {d}
            </span>
            {/* 0803 123 4567 */}
            {(i === 3 || i === 6) && (
              <span style={{ display: 'inline-block', width: 5 }} />
            )}
          </Fragment>
        )
      })}
    </span>
  )
}

export default function SimilarNumberModal({
  typedDigits,
  matches,
  onPick,
  onContinue,
}: SimilarNumberModalProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onContinue()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          background: '#fff',
          maxWidth: 420,
          width: '90%',
          padding: 24,
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            marginBottom: 16,
          }}
        >
          <span
            style={{ flex: 1, fontSize: 14, lineHeight: 1.5, color: '#333' }}
          >
            This number is similar to a previous recharge, but a digit or 2 is
            different.
          </span>
          <button
            type="button"
            onClick={onContinue}
            style={{
              flexShrink: 0,
              border: 'none',
              background: '#333',
              color: '#fff',
              borderRadius: 20,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Continue
          </button>
        </div>

        <div style={{ fontWeight: 600, color: '#555', marginBottom: 8 }}>
          Do you mean one of these?
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {matches.map((m) => {
            const info = PROVIDERS.find(
              (p) => p.id === networkToProviderId(m.network)
            )
            return (
              <div
                key={m.phone}
                role="button"
                tabIndex={0}
                onClick={() => onPick(m)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onPick(m)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f6f7f9',
                  border: '1px solid #eee',
                  borderRadius: 8,
                  padding: '10px 14px',
                  cursor: 'pointer',
                }}
              >
                <HighlightedNumber digits={m.phone} typed={typedDigits} />
                <span
                  style={{
                    fontSize: 12,
                    color: '#666',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {info && (
                    <img
                      src={info.img}
                      alt=""
                      style={{ width: 16, height: 16 }}
                    />
                  )}
                  {info?.label ?? m.network}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}