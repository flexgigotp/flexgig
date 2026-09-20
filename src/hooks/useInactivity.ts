import { useEffect, useRef } from 'react'

interface Options {
  enabled: boolean
  softIdleMs: number
  hardIdleMs: number
  promptDurationMs: number
  onSoftIdle: () => void
  onPromptTimeout: () => void
  onHardIdle: () => void
}

const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'touchend',
  'touchmove',
  'click',
  'pointerdown',
] as const

export function useInactivity({
  enabled,
  softIdleMs,
  hardIdleMs,
  promptDurationMs,
  onSoftIdle,
  onPromptTimeout,
  onHardIdle,
}: Options) {
  const softTimerRef = useRef<number | null>(null)
  const promptTimerRef = useRef<number | null>(null)
  const hiddenAtRef = useRef<number | null>(null)

  // Keep callback refs up to date without restarting the effect
  const cbRef = useRef({ onSoftIdle, onPromptTimeout, onHardIdle })
  useEffect(() => {
    cbRef.current = { onSoftIdle, onPromptTimeout, onHardIdle }
  }, [onSoftIdle, onPromptTimeout, onHardIdle])

  useEffect(() => {
    if (!enabled) return

    const clearAll = () => {
      if (softTimerRef.current) {
        window.clearTimeout(softTimerRef.current)
        softTimerRef.current = null
      }
      if (promptTimerRef.current) {
        window.clearTimeout(promptTimerRef.current)
        promptTimerRef.current = null
      }
    }

    const arm = () => {
      clearAll()
      softTimerRef.current = window.setTimeout(() => {
        cbRef.current.onSoftIdle()
        promptTimerRef.current = window.setTimeout(() => {
          cbRef.current.onPromptTimeout()
        }, promptDurationMs)
      }, softIdleMs)
    }

    const onActivity = () => {
      if (document.visibilityState !== 'visible') return
      arm()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Pause the soft timer, remember when we left
        clearAll()
        hiddenAtRef.current = Date.now()
      } else {
        // Returned to the tab
        const away =
          hiddenAtRef.current !== null
            ? Date.now() - hiddenAtRef.current
            : 0
        hiddenAtRef.current = null

        if (away >= hardIdleMs) {
          cbRef.current.onHardIdle()
          // Do not arm the soft timer — the reauth modal is taking over
          return
        }
        arm()
      }
    }

    ACTIVITY_EVENTS.forEach((evt) =>
      document.addEventListener(evt, onActivity, { passive: true })
    )
    document.addEventListener('visibilitychange', onVisibilityChange)

    arm()

    return () => {
      ACTIVITY_EVENTS.forEach((evt) =>
        document.removeEventListener(evt, onActivity)
      )
      document.removeEventListener('visibilitychange', onVisibilityChange)
      clearAll()
    }
  }, [enabled, softIdleMs, hardIdleMs, promptDurationMs])
}