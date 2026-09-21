import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSession } from '@/hooks'
import { useAuthStore } from '@/stores/authStore'
import { reauthApi } from '@/services/api'
import { useInactivity } from '@/hooks/useInactivity'
import ReauthModal from '@/components/reauth/ReauthModal'
import InactivityPrompt from '@/components/reauth/InactivityPrompt'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { isCeremonyActive } from '@/lib/biometricStorage'

const SOFT_IDLE_MS = Number(import.meta.env.VITE_SOFT_IDLE_MS ?? 15 * 1000)
const HARD_IDLE_MS = Number(import.meta.env.VITE_HARD_IDLE_MS ?? 20 * 1000)
const PROMPT_DURATION_MS = Number(import.meta.env.VITE_PROMPT_DURATION_MS ?? 10000)

// 423s that land within this window after a successful reauth are treated
// as stale in-flight responses from before the lock cleared — ignore them.
const REAUTH_SETTLE_MS = 3000

export default function ReauthManager() {
  const { user, refetch } = useSession()

  const reauthRequiredFromStore = useAuthStore((s) => s.reauthRequired)
  const setReauthRequired = useAuthStore((s) => s.setReauthRequired)

  const [promptOpen, setPromptOpen] = useState(false)
  const [reauthOpen, setReauthOpen] = useState(false)

  const lastReauthSuccessRef = useRef(0)

    // Sync local modal state with store value.
  //
  // We ONLY open on true. We deliberately do NOT close on false —
  // closing is handled explicitly by handleReauthSuccess. A stale
  // /api/session response (or any other source that flips the store
  // to false momentarily) would otherwise rip the modal out from
  // under a user who is mid-PIN-entry, forcing a remount and
  // re-running the auto-attempt effect. That's the "double reauth
  // page load" bug.
  useEffect(() => {
    if (reauthRequiredFromStore === true && !reauthOpen) {
      setPromptOpen(false)
      setReauthOpen(true)
    }
  }, [reauthRequiredFromStore, reauthOpen])

  useBodyScrollLock(promptOpen || reauthOpen)

  const triggerReauth = useCallback(
    (reason: string) => {
      void reauthApi.require(reason)
      setReauthRequired(true)
      setPromptOpen(false)
      setReauthOpen(true)
    },
    [setReauthRequired]
  )

  useEffect(() => {
    let alive = true
    const handler = () => {
      void (async () => {
        if (Date.now() - lastReauthSuccessRef.current < REAUTH_SETTLE_MS) {
          return
        }
        const required = await reauthApi.checkStatus()
        if (!alive || !required) return
        setReauthRequired(true)
        setPromptOpen(false)
        setReauthOpen(true)
      })()
    }
    window.addEventListener('session:reauth-required', handler)
    return () => {
      alive = false
      window.removeEventListener('session:reauth-required', handler)
    }
  }, [setReauthRequired])

  useInactivity({
    enabled: !!user && !reauthOpen && !promptOpen,
    softIdleMs: SOFT_IDLE_MS,
    hardIdleMs: HARD_IDLE_MS,
    promptDurationMs: PROMPT_DURATION_MS,
    onSoftIdle: () => {
      if (isCeremonyActive()) return
      setPromptOpen(true)
    },
    onPromptTimeout: () => {},
    onHardIdle: () => {
      if (isCeremonyActive()) return
      triggerReauth('hard_idle_timeout')
    },
  })

  useEffect(() => {
    if (!promptOpen) return
    const t = window.setTimeout(() => {
      triggerReauth('soft_idle_timeout')
    }, PROMPT_DURATION_MS)
    return () => window.clearTimeout(t)
  }, [promptOpen, triggerReauth])

    const handleReauthSuccess = useCallback(() => {
    // NOTE: do NOT await reauthApi.complete() here.
    //
    // The server already cleared the reauth lock inline during
    // /webauthn/auth/verify or /api/reauth-pin (see server logs:
    //   "[/webauthn/auth/verify] lock cleared for uid ..."
    //   "[server] /api/reauth-pin success src=... totalMs=..."
    // ). /reauth/complete is a belt-and-braces second clear.
    //
    // ReauthModal.finishWithSuccess() already fires it as a
    // fire-and-forget void — awaiting it here just held the modal
    // open for a network round trip after the ceremony had already
    // succeeded, which is what the user saw as "loader disappears
    // then a few ms before the dashboard".

    // Mark the moment of success so stale 423s are ignored by the
    // settle-guard in the event handler above.
    lastReauthSuccessRef.current = Date.now()

    // Synchronously hide the modal + reset the store flag.
    // Everything below fires in the same React batch, so the modal
    // unmounts in the same frame the auth succeeded — no gap.
    setReauthOpen(false)
    setPromptOpen(false)
    setReauthRequired(false)

    // Tell every cached data hook that it's safe to fetch again.
    window.dispatchEvent(new Event('session:reauth-cleared'))

    // Silent session refresh — data updates in place.
    void refetch({ silent: true })
  }, [refetch, setReauthRequired])

  if (!user) return null

  return createPortal(
    <>
      {promptOpen && !reauthOpen && (
        <InactivityPrompt onYes={() => setPromptOpen(false)} />
      )}
      {reauthOpen && <ReauthModal onSuccess={handleReauthSuccess} />}
    </>,
    document.body
  )
}