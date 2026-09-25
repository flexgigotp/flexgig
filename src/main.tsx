import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './styles/globals.css'
import { toast } from '@/stores/toastStore'
import { useUpdateGuardStore } from '@/stores/updateGuardStore'

// Don't let a long-lived tab run on stale assets forever, even if it
// somehow never clears its guard (e.g. someone leaves the app open on
// a PIN screen and walks away).
const UPDATE_MAX_WAIT_MS = 10 * 60 * 1000

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    toast.info('Updating FlexGig to the latest version…', 3000)

    let applied = false
    let unsubscribe: (() => void) | null = null
    let maxWaitTimer: number | undefined

    const cleanup = () => {
      unsubscribe?.()
      unsubscribe = null
      if (maxWaitTimer) window.clearTimeout(maxWaitTimer)
      window.removeEventListener('visibilitychange', onVisibility)
    }

    const apply = () => {
      if (applied) return
      applied = true
      cleanup()
      void updateSW(true)
    }

    // Not looking at the tab is a safe moment to apply regardless of
    // any guard — the user isn't mid-keystroke if they've tabbed away.
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') apply()
    }

    // Give the toast a moment to actually appear before acting.
    window.setTimeout(() => {
      if (!useUpdateGuardStore.getState().isGuarded()) {
        apply()
        return
      }

      // Something sensitive is in progress — wait for it to clear.
      unsubscribe = useUpdateGuardStore.subscribe((s) => {
        if (s.activeGuards.size === 0) apply()
      })
      window.addEventListener('visibilitychange', onVisibility)
      maxWaitTimer = window.setTimeout(apply, UPDATE_MAX_WAIT_MS)
    }, 3000)
  },
  onOfflineReady() {
    toast.info('FlexGig is ready to work offline', 3000)
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)