import { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface FullScreenModalProps {
  title: string
  onClose: () => void
  children: ReactNode
}

export default function FullScreenModal({
  title,
  onClose,
  children,
}: FullScreenModalProps) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return createPortal(
    <div className="fg-fullscreen-modal">
      <header className="fg-fs-header">
        <button
          type="button"
          className="fg-fs-back"
          aria-label="Back"
          onClick={onClose}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="fg-fs-title">{title}</h1>
      </header>
      <div className="fg-fs-body">{children}</div>
    </div>,
    document.body
  )
}