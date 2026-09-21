import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useBiometricPromptStore } from '@/stores/biometricPromptStore'
import { useBiometric } from '@/hooks/useBiometric'
import Loader from '@/components/Loader'
import { toast } from '@/stores/toastStore'

export default function BiometricPrompt() {
  const bio = useBiometric()
  const visible = useBiometricPromptStore((s) => s.visible)
  const dismiss = useBiometricPromptStore((s) => s.dismiss)

  // Keep a ref of the freshest isRegistering so the pop handler
  // (registered once per visible cycle) can read it without
  // re-subscribing on every registration state change.
  const isRegisteringRef = useRef(false)
  useEffect(() => {
    isRegisteringRef.current = bio.isRegistering
  })

  // Browser back closes the prompt — EXCEPT while the native
  // biometric ceremony is running. During registration we re-arm
  // the sentinel so back doesn't navigate away under the loader.
  useEffect(() => {
    if (!visible) return

    window.history.pushState({ __bioPrompt: true }, '')

    const onPop = () => {
      if (isRegisteringRef.current) {
        window.history.pushState({ __bioPrompt: true }, '')
        return
      }
      dismiss()
    }

    window.addEventListener('popstate', onPop)

    return () => {
      window.removeEventListener('popstate', onPop)
      if (window.history.state?.__bioPrompt) {
        window.history.replaceState(null, '')
      }
    }
  }, [visible, dismiss])

  if (!visible) return null

  const closeViaBack = () => {
    if (bio.isRegistering) return
    if (window.history.state?.__bioPrompt) {
      window.history.back()
    } else {
      dismiss()
    }
  }

  const handleSetBiometric = async () => {
    if (bio.isRegistering) return

    if (!bio.isReady) {
      toast.info('Checking device…')
      return
    }
    if (!bio.isSupported) {
      toast.error('Biometrics not available on this device')
      return
    }

    // NOTE: deliberately do NOT call dismiss() before register().
    // The prompt stays mounted (behind the loader + toast) so we
    // can layer those on top while the native ceremony warms up.
    try {
      const res = await bio.register()

      // Ceremony finished (success, cancel, or error) — now tear down
      // the prompt so the user lands back on the dashboard.
      dismiss()

      if (res.ok) {
        toast.success('Biometrics enabled')
      } else if (res.message !== 'Cancelled') {
        toast.error(res.message || 'Failed to enable biometrics')
      }
    } catch {
      dismiss()
      toast.error('Failed to enable biometrics')
    }
  }

  return createPortal(
    <>
      <div
        className="bio-prompt-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bioPromptTitle"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeViaBack()
        }}
      >
        <div className="bio-prompt">
          <button
            type="button"
            className="bio-prompt-close"
            aria-label="Close"
            onClick={closeViaBack}
            disabled={bio.isRegistering}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6L18 18M6 18L18 6"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <div className="bio-prompt-icon" aria-hidden>
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFD700"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
              <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
              <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
              <path d="M2 12a10 10 0 0 1 18-6" />
              <path d="M2 16h.01" />
              <path d="M21.8 16c.2-2 .131-5.354 0-6" />
              <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
              <path d="M8.65 22c.21-.66.45-1.32.57-2" />
              <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
            </svg>
          </div>

          <h2 id="bioPromptTitle" className="bio-prompt-title">
            Enable biometrics
          </h2>
          <p className="bio-prompt-body">
            Use your fingerprint or face to pay in seconds next time — no
            PIN needed.
          </p>

          <button
            type="button"
            className="bio-prompt-cta"
            onClick={handleSetBiometric}
            disabled={bio.isRegistering}
          >
            {bio.isRegistering ? 'Setting up…' : 'Set up biometrics'}
          </button>

          <button
            type="button"
            className="bio-prompt-skip"
            onClick={closeViaBack}
            disabled={bio.isRegistering}
          >
            Not now
          </button>
        </div>
      </div>

      {/* Loader + toast layered on top while the native ceremony
          warms up. Both are inside the same portal so they render
          above the prompt backdrop. */}
      {bio.isRegistering && (
        <>
          <Loader transparent />
          <div
            className="bio-loading-toast"
            role="status"
            aria-live="polite"
          >
            <span className="bio-loading-spinner" aria-hidden />
            Waiting for biometric…
          </div>
        </>
      )}
    </>,
    document.body
  )
}