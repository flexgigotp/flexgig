// src\hooks\useBackTrap.ts

import { useEffect } from 'react'

/**
 * Traps the browser/device back button while `enabled` is true.
 * The user stays put — pressing back re-pushes the same entry.
 *
 * IMPORTANT: pass `enabled={false}` while a modal/sheet is open so back
 * can pop the modal's own history entry normally.
 */
export function useBackTrap(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined') return

    const marker = { __fgBackTrap: true }

    // Push one marker so we have a same-URL entry to intercept
    window.history.pushState(marker, '')

    const handlePop = () => {
      // Re-push so the URL never actually changes
      window.history.pushState(marker, '')
    }

    window.addEventListener('popstate', handlePop)
    return () => {
      window.removeEventListener('popstate', handlePop)
    }
  }, [enabled])
}