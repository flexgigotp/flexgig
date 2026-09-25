import { useEffect } from 'react'
import { useUpdateGuardStore } from '@/stores/updateGuardStore'

let counter = 0

/**
 * Registers a "do not apply a pending SW update right now" flag for as
 * long as this component is mounted (or while `active` is true). Use
 * in any component where an interrupting reload would wipe user input
 * — PIN entry, OTP entry, forms mid-fill.
 */
export function useUpdateGuard(active: boolean = true) {
  useEffect(() => {
    if (!active) return
    const key = `guard-${++counter}`
    useUpdateGuardStore.getState().guard(key)
    return () => useUpdateGuardStore.getState().unguard(key)
  }, [active])
}