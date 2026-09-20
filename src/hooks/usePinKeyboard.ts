import { useEffect } from 'react'

/**
 * Attaches global keydown listener so users can enter PIN with
 * their physical keyboard on desktop.
 */
export function usePinKeyboard(
  onDigit: (digit: string) => void,
  onDelete: () => void,
  disabled = false
) {
  useEffect(() => {
    if (disabled) return

    const handler = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = e.target as HTMLElement
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      ) {
        return
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault()
        onDigit(e.key)
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault()
        onDelete()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onDigit, onDelete, disabled])
}