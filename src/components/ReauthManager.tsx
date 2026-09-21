import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSession } from '@/hooks'
import { useAuthStore } from '@/stores/authStore'
import { reauthApi } from '@/services/api'
import { useInactivity } from '@/hooks/useInactivity'
import ReauthModal from '@/components/reauth/ReauthModal'
import InactivityPrompt from '@/components/reauth/InactivityPrompt'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { isCeremonyActive } from '@/lib/biometricStorage'

// ⚠️ 10s soft idle means "read one screen → reauth". Fine for dev testing;
// for production raise these (see note below this file). Overridable via env.
const SOFT_IDLE_MS = Number(import.meta.env.VITE_SOFT_IDLE_MS ?? 15 * 1000)
const HARD_IDLE_MS = Number(import.meta.env.VITE_HARD_IDLE_MS ?? 20 * 1000)
const PROMPT_DURATION_MS = Number(import.meta.env.VITE_PROMPT_DURATION_MS ?? 10000)

export default function ReauthManager() {
  const { user, refetch } = useSession()

  // Initial state comes straight from the session response — no extra
  // /reauth/status call on boot, so we don't race against the dashboard.
  const reauthRequiredFromStore = useAuthStore((s) => s.reauthRequired)
  const setReauthRequired = useAuthStore((s) => s.setReauthRequired)

  const [promptOpen, setPromptOpen] = useState(false)
  const [reauthOpen, setReauthOpen] = useState(false)

  // Sync local modal state with store value (source of truth)
  useEffect(() => {
    if (reauthRequiredFromStore === true) {
      setPromptOpen(false)
      setReauthOpen(true)
    } else if (reauthRequiredFromStore === false) {
      // Session says we're clear — don't fight the store
      setReauthOpen(false)
    }
  }, [reauthRequiredFromStore])

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

  // Global 423 from axios interceptor.
  // A poll that was in flight when the lock was cleared can deliver its
  // 423 AFTER a successful reauth — verify with the server before
  // reopening, or the modal resurrects itself "sometimes".
  useEffect(() => {
    let alive = true
    const handler = () => {
  void (async () => {
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

  // Inactivity timers.
  // enabled=false while a modal is open (covers the reauth modal's own
  // ceremony). The isCeremonyActive() guards cover ceremonies that run
  // OUTSIDE this modal — checkout / transfer fingerprint prompts —
  // during which no DOM activity events fire and the soft timer would
  // otherwise lock the user mid-prompt.
  useInactivity({
    enabled: !!user && !reauthOpen && !promptOpen,
    softIdleMs: SOFT_IDLE_MS,
    hardIdleMs: HARD_IDLE_MS,
    promptDurationMs: PROMPT_DURATION_MS,
    onSoftIdle: () => {
      if (isCeremonyActive()) return
      setPromptOpen(true)
    },
    onPromptTimeout: () => {
      /* handled below */
    },
    onHardIdle: () => {
      if (isCeremonyActive()) return
      triggerReauth('hard_idle_timeout')
    },
  })

  // Prompt auto-timeout
  useEffect(() => {
    if (!promptOpen) return
    const t = window.setTimeout(() => {
      triggerReauth('soft_idle_timeout')
    }, PROMPT_DURATION_MS)
    return () => window.clearTimeout(t)
  }, [promptOpen, triggerReauth])

    const handleReauthSuccess = useCallback(() => {
    setReauthOpen(false)
    setPromptOpen(false)
    setReauthRequired(false)
    // Silent refresh — data updates in place, no loading UI
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