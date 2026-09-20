import { useEffect, useState } from 'react'

interface BalanceCardProps {
  balance?: number
}

const STORAGE_KEY = 'flexgig-balance-visible'

export default function BalanceCard({ balance = 0 }: BalanceCardProps) {
  const [visible, setVisible] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  // React to external visibility changes (e.g. from the Security sheet)
useEffect(() => {
  const handler = () => {
    try {
      setVisible(localStorage.getItem(STORAGE_KEY) === 'true')
    } catch {
      /* ignore */
    }
  }
  window.addEventListener('balance-visibility-change', handler)
  return () =>
    window.removeEventListener('balance-visibility-change', handler)
}, [])

  const formatted = `₦${balance.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

  return (
    <div className="balance">
      <h4>
        <span
          className="balance-title"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <svg
            className="wallet-icon"
            viewBox="16 20 64 54"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: 24, height: 24 }}
          >
            <g>
              <path
                fill="#00A651"
                d="M77.5,38H77V27.5a.41.41,0,0,0,0-.19.49.49,0,0,0,0-.21.5.5,0,0,0-.53-.47L63,27.45V20.5a.5.5,0,0,0-.5-.5h-29a.5.5,0,0,0-.5.5v8.71l-11.29.9C18.56,30.11,16,32.32,16,35V71.5A2.5,2.5,0,0,0,18.5,74h59A2.5,2.5,0,0,0,80,71.5v-31A2.5,2.5,0,0,0,77.5,38Z"
              />
              <path
                fill="#FFFFFF"
                d="M69,56.5A3.5,3.5,0,1,0,72.5,53,3.5,3.5,0,0,0,69,56.5Z"
              />
            </g>
          </svg>
          Balance
          <button
            type="button"
            className="balance-eye-toggle"
            aria-pressed={visible}
            aria-label={visible ? 'Hide balance' : 'Show balance'}
            onClick={() => setVisible((v) => !v)}
          >
            <span
              aria-hidden
              style={{
                position: 'relative',
                display: 'inline-block',
                width: 18,
                height: 22,
                verticalAlign: 'middle',
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  position: 'absolute',
                  top: '58%',
                  left: '50%',
                  width: 18,
                  height: 18,
                  transform: `translate(-50%,-50%) scaleY(${
                    visible ? 1 : 0.25
                  })`,
                  transformOrigin: '50% 50%',
                  opacity: visible ? 1 : 0,
                  transition:
                    'transform 650ms cubic-bezier(.2,.9,.3,1), opacity 420ms ease',
                }}
              >
                <path
                  d="M4 12C4 12 5.6 7 12 7M12 7C18.4 7 20 12 20 12M12 7V4M18 5L16 7.5M6 5L8 7.5M15 13C15 14.6569 13.6569 16 12 16C10.3431 16 9 14.6569 9 13C9 11.3431 10.3431 10 12 10C13.6569 10 15 11.3431 15 13Z"
                  stroke="#ffffff"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  position: 'absolute',
                  top: '58%',
                  left: '50%',
                  width: 18,
                  height: 18,
                  transform: `translate(-50%,-50%) scaleY(${
                    visible ? 0.25 : 1
                  })`,
                  transformOrigin: '50% 50%',
                  opacity: visible ? 0 : 1,
                  transition:
                    'transform 520ms cubic-bezier(.2,.9,.3,1), opacity 320ms ease',
                }}
              >
                <path
                  d="M4 10C4 10 5.6 15 12 15M12 15C18.4 15 20 10 20 10M12 15V18M18 17L16 14.5M6 17L8 14.5"
                  stroke="#ffffff"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>
        </span>
      </h4>

      <p
        style={{
          color: 'white',
          fontWeight: 700,
          position: 'relative',
          display: 'inline-block',
        }}
      >
        <span className="balance-masked" data-visible={!visible}>
          • • • • • •
        </span>
        <span className="balance-real" data-visible={visible}>
          {formatted}
        </span>
      </p>
    </div>
  )
}