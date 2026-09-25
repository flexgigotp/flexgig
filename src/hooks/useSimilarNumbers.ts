import { useCallback, useRef, useState } from 'react'
import {
  findSimilarNumbers,
  getNumberHistory,
  type SimilarMatch,
} from '@/services/phoneHistory'

const FULL_LENGTH = 11

/**
 * Call `check(digits)` from the input's change handler (not from an effect on
 * store state) so the suggestion only appears when the user actually types or
 * pastes a number, not when a persisted number is restored on page load.
 */
export function useSimilarNumbers() {
  const [matches, setMatches] = useState<SimilarMatch[]>([])
  const requestId = useRef(0)

  const check = useCallback(async (digits: string) => {
    const id = ++requestId.current

    if (digits.length !== FULL_LENGTH) {
      setMatches([])
      return
    }

    const history = await getNumberHistory()
    if (id !== requestId.current) return // a newer keystroke superseded this

    // Exact match = a number they've used before, nothing to suggest.
    if (history.some((h) => h.phone === digits)) {
      setMatches([])
      return
    }
    setMatches(findSimilarNumbers(digits, history))
  }, [])

  const dismiss = useCallback(() => {
    requestId.current++
    setMatches([])
  }, [])

  return { matches, check, dismiss }
}