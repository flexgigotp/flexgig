import { useCallback, useRef, useState } from 'react'
import { userService } from '@/services/user'

const USERNAME_REGEX = /^[A-Za-z]{3,}(?:_[A-Za-z0-9]{3,})?$/
const DEBOUNCE_MS = 300

export type UsernameCheckState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export function useUsernameAvailability() {
  const [state, setState] = useState<UsernameCheckState>('idle')
  const seqRef = useRef(0)
  const timerRef = useRef<number>()

  const check = useCallback((value: string) => {
    window.clearTimeout(timerRef.current)

    const trimmed = value.trim()
    if (!trimmed) {
      setState('idle')
      return
    }
    if (!USERNAME_REGEX.test(trimmed)) {
      setState('invalid')
      return
    }

    setState('checking')
    const mySeq = ++seqRef.current

    timerRef.current = window.setTimeout(async () => {
      try {
        const available = await userService.checkUsername(trimmed)
        if (mySeq !== seqRef.current) return // stale
        setState(available ? 'available' : 'taken')
      } catch {
        if (mySeq !== seqRef.current) return
        setState('idle')
      }
    }, DEBOUNCE_MS)
  }, [])

  const reset = useCallback(() => {
    window.clearTimeout(timerRef.current)
    seqRef.current++
    setState('idle')
  }, [])

  return { state, check, reset }
}