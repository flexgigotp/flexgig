import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSession } from '@/hooks'
import { useAuthStore } from '@/stores/authStore'
import { reauthApi } from '@/services/api'
import { useInactivity } from '@/hooks/useInactivity'
import ReauthModal from '@/components/reauth/ReauthModal'
import InactivityPrompt from '@/components/reauth/InactivityPrompt'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

const SOFT_IDLE_MS = 10 * 1000
const HARD_IDLE_MS = 15 * 1000
const PROMPT_DURATION_MS = 5000

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

  // Global 423 from axios interceptor
  useEffect(() => {
    const handler = () => {
      setReauthRequired(true)
      setPromptOpen(false)
      setReauthOpen(true)
    }
    window.addEventListener('session:reauth-required', handler)
    return () => window.removeEventListener('session:reauth-required', handler)
  }, [setReauthRequired])

  // Inactivity timers
  useInactivity({
    enabled: !!user && !reauthOpen && !promptOpen,
    softIdleMs: SOFT_IDLE_MS,
    hardIdleMs: HARD_IDLE_MS,
    promptDurationMs: PROMPT_DURATION_MS,
    onSoftIdle: () => setPromptOpen(true),
    onPromptTimeout: () => {
      /* handled below */
    },
    onHardIdle: () => triggerReauth('hard_idle_timeout'),
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
    void reauthApi.complete()
    void refetch()
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