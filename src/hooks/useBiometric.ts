// src/hooks/useBiometric.ts
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser'
import {
  webauthnApi,
  extractApiError,
  type BiometricAction,
} from '@/services/api'
import { useSession } from '@/hooks'
import {
  getCredentialId,
  setCredentialId,
  clearCredentialId,
  isBiometricEnabled,
  setBiometricEnabled,
  isBioForLogin,
  setBioForLogin,
  isBioForTx,
  setBioForTx,
  getCachedOptions,
  setCachedOptions,
  clearCachedOptions,
  clearAllBiometricState,
  setCeremonyActive,
} from '@/lib/biometricStorage'

/**
 * Encode a string as base64url. WebAuthn assertions are plain JSON
 * (ASCII-safe inside — base64url strings and numbers), so btoa is
 * safe here.
 */
function toBase64Url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export type CeremonyPhase = 'idle' | 'preparing' | 'prompting' | 'verifying'

interface AuthenticateResult {
  ok: boolean
  /** Set in legacy mode — single-use JWT from /webauthn/auth/verify */
  token?: string
  /** Set in inline mode — base64url JSON assertion for the action endpoint */
  assertion?: string
  message?: string
}

interface UseBiometricReturn {
  isSupported: boolean
  isReady: boolean
  enabled: boolean
  forLogin: boolean
  forTx: boolean
  isRegistering: boolean
  isAuthenticating: boolean
  phase: CeremonyPhase
  register: () => Promise<{ ok: boolean; message?: string }>
  revoke: () => Promise<{ ok: boolean; message?: string }>
  authenticate: (
    action: BiometricAction,
    opts?: { inline?: boolean }
  ) => Promise<AuthenticateResult>
  setChildEnabled: (which: 'login' | 'tx', value: boolean) => void
  prefetch: () => void
}

export function useBiometric(): UseBiometricReturn {
  const { user, refetch } = useSession()
  const uid = user?.uid ?? null
  const hasPin = user?.hasPin === true

  const [isSupported, setIsSupported] = useState(false)
  const [isReady, setIsReady] = useState(false)

  const [enabled, setEnabledState] = useState(isBiometricEnabled)
  const [forLogin, setForLoginState] = useState(isBioForLogin)
  const [forTx, setForTxState] = useState(isBioForTx)

  const [isRegistering, setIsRegistering] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [phase, setPhase] = useState<CeremonyPhase>('idle')

  const prefetchPromiseRef = useRef<Promise<unknown> | null>(null)
  const ceremonyLockRef = useRef(false)

  // ── Feature detection ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (!browserSupportsWebAuthn()) {
          if (!cancelled) {
            setIsSupported(false)
            setIsReady(true)
          }
          return
        }
        const ok = await platformAuthenticatorIsAvailable()
        if (!cancelled) {
          setIsSupported(!!ok)
          setIsReady(true)
        }
      } catch {
        if (!cancelled) {
          setIsSupported(false)
          setIsReady(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // ── Cross-tab sync via storage events ────────────────────────
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (!e.key) return
      if (e.key.startsWith('flexgig.bio.')) {
        setEnabledState(isBiometricEnabled())
        setForLoginState(isBioForLogin())
        setForTxState(isBioForTx())
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  // ── Local helpers ────────────────────────────────────────────
  const applyEnabled = useCallback((v: boolean) => {
    setBiometricEnabled(v)
    setEnabledState(v)
  }, [])

  const applyForLogin = useCallback((v: boolean) => {
    setBioForLogin(v)
    setForLoginState(v)
  }, [])

  const applyForTx = useCallback((v: boolean) => {
    setBioForTx(v)
    setForTxState(v)
  }, [])

  // ── Prefetch auth options ────────────────────────────────────
  const prefetch = useCallback(() => {
    if (!uid) return
    if (!isBiometricEnabled()) return
    if (!getCredentialId()) return
    if (ceremonyLockRef.current) return
    if (prefetchPromiseRef.current) return

    const p = webauthnApi
      .authOptions(uid)
      .then((opts) => {
        setCachedOptions(opts)
        return opts
      })
      .catch(() => null)
      .finally(() => {
        prefetchPromiseRef.current = null
      })

    prefetchPromiseRef.current = p
  }, [uid])

  // ── Keep the challenge warm on tab focus ─────────────────────
  useEffect(() => {
    if (!enabled) return
    if (!forTx && !forLogin) return

    const maybeRefresh = () => {
      if (document.visibilityState !== 'visible') return
      if (ceremonyLockRef.current) return
      const cached = getCachedOptions()
      if (cached && cached.fresh) return
      clearCachedOptions()
      prefetch()
    }

    window.addEventListener('focus', maybeRefresh)
    document.addEventListener('visibilitychange', maybeRefresh)
    return () => {
      window.removeEventListener('focus', maybeRefresh)
      document.removeEventListener('visibilitychange', maybeRefresh)
    }
  }, [enabled, forTx, forLogin, prefetch])

  // ── REGISTER ─────────────────────────────────────────────────
  const register = useCallback(async () => {
    if (!uid) return { ok: false, message: 'Not signed in' }
    if (!isSupported) {
      return { ok: false, message: 'Biometrics not available on this device' }
    }
    if (!hasPin) {
      return {
        ok: false,
        message: 'Please set a PIN first before enabling biometrics.',
      }
    }

    setIsRegistering(true)
    setCeremonyActive(true)
    setPhase('preparing')
    ceremonyLockRef.current = true
    try {
      try {
        const existing = await webauthnApi.list(uid).catch(() => [])
        if (Array.isArray(existing) && existing.length > 0) {
          for (const auth of existing) {
            if (auth.credential_id) {
              await webauthnApi
                .revoke(uid, auth.credential_id)
                .catch(() => null)
            }
          }
        } else {
          await webauthnApi.revoke(uid, null).catch(() => null)
        }
      } catch {
        /* non-fatal */
      }

      const options = await webauthnApi.registerOptions(
        uid,
        user?.username || user?.email || uid,
        user?.fullName || user?.firstName || user?.username || 'User'
      )

      setPhase('prompting')
      const credential = await startRegistration({
        optionsJSON: options as unknown as PublicKeyCredentialCreationOptionsJSON,
      })

      setCredentialId(credential.id)

      setPhase('verifying')
      const verify = await webauthnApi.registerVerify(uid, credential)

      if (!verify.verified) {
        clearCredentialId()
        return { ok: false, message: 'Registration not verified' }
      }

      if (verify.credentialId) {
        setCredentialId(verify.credentialId)
      }

      applyEnabled(true)
      applyForLogin(true)
      applyForTx(true)
      refetch()
      clearCachedOptions()
      prefetch()

      return { ok: true }
    } catch (err) {
      console.error('[biometric] register failed:', err)
      clearCredentialId()

      const e = err as { name?: string; message?: string }

      if (
        e?.name === 'NotAllowedError' ||
        e?.name === 'AbortError' ||
        e?.message === 'The operation either timed out or was not allowed.'
      ) {
        return { ok: false, message: 'Cancelled' }
      }
      if (e?.name === 'InvalidStateError') {
        return {
          ok: false,
          message: 'A biometric credential already exists on this device.',
        }
      }

      const { message } = extractApiError(err)
      return { ok: false, message: message || 'Registration failed' }
    } finally {
      ceremonyLockRef.current = false
      setPhase('idle')
      setCeremonyActive(false)
      setIsRegistering(false)
    }
  }, [
    uid,
    isSupported,
    hasPin,
    user,
    refetch,
    prefetch,
    applyEnabled,
    applyForLogin,
    applyForTx,
  ])

  // ── REVOKE ───────────────────────────────────────────────────
  const revoke = useCallback(async () => {
    if (!uid) return { ok: false, message: 'Not signed in' }

    setIsRegistering(true)
    try {
      const credentialId = getCredentialId()

      try {
        await webauthnApi.revoke(uid, credentialId ?? null)
      } catch (revokeErr) {
        console.error('[biometric] revoke request failed:', revokeErr)
      }

      clearAllBiometricState()
      setEnabledState(false)
      setForLoginState(false)
      setForTxState(false)
      refetch()

      return { ok: true }
    } catch (err) {
      console.error('[biometric] revoke failed:', err)
      const { message } = extractApiError(err)
      return { ok: false, message: message || 'Failed to disable biometrics' }
    } finally {
      setIsRegistering(false)
    }
  }, [uid, refetch])

  // ── AUTHENTICATE ─────────────────────────────────────────────
  const authenticate = useCallback(
    async (
      action: BiometricAction,
      opts?: { inline?: boolean }
    ): Promise<AuthenticateResult> => {
      if (!uid) return { ok: false, message: 'Not signed in' }
      if (!enabled) return { ok: false, message: 'Biometrics not enabled' }

      if (action === 'reauth') {
        if (!forLogin) return { ok: false, message: 'Biometric reauth is disabled' }
      } else {
        if (!forTx) return { ok: false, message: 'Biometric checkout is disabled' }
      }

      const storedId = getCredentialId()
      if (!storedId) {
        return { ok: false, message: 'No biometric credential on this device' }
      }

      const inline = opts?.inline === true

            setIsAuthenticating(true)
      setCeremonyActive(true)
      setPhase('preparing')
      ceremonyLockRef.current = true

      // Track how long the toast has been visible so we can enforce a
      // minimum duration. Without this, a warm cache makes the toast
      // flash for <100ms and disappear before the OS prompt renders.
      const preparingStartedAt = Date.now()
      const MIN_TOAST_MS = 500

      try {
        // ── 1. Get options (cached, in-flight, or fresh) ──
        let options: PublicKeyCredentialRequestOptionsJSON

        const inFlight = prefetchPromiseRef.current
        if (inFlight) {
          const joined = await inFlight
          options =
            (joined as PublicKeyCredentialRequestOptionsJSON) ??
            (await webauthnApi.authOptions(uid))
        } else {
          const cached = getCachedOptions()
          if (cached && cached.fresh) {
            options = cached.options as PublicKeyCredentialRequestOptionsJSON
          } else {
            const fresh = await webauthnApi.authOptions(uid)
            setCachedOptions(fresh)
            options = fresh as PublicKeyCredentialRequestOptionsJSON
          }
        }

        // ── 1.5. Minimum toast duration ────────────────────────
        // Keep the "Waiting for fingerprint…" toast on screen long
        // enough for the user to register it AND for the OS-native
        // prompt to be laid out on top. Only waits if the options
        // fetch was faster than MIN_TOAST_MS — a cold fetch that
        // already took longer proceeds immediately.
        const elapsed = Date.now() - preparingStartedAt
        if (elapsed < MIN_TOAST_MS) {
          await new Promise((r) => setTimeout(r, MIN_TOAST_MS - elapsed))
        }

        // ── 2. Native prompt ──
        setPhase('prompting')
        const assertion = await startAuthentication({ optionsJSON: options })

        // ── 3a. Inline mode ─────────────────────────────────────
        // Skip /webauthn/auth/verify entirely. Hand the raw assertion
        // to the caller, which will pass it to the action endpoint
        // (buy-data / transfer). That endpoint verifies the assertion
        // inline and executes the transaction in the same round trip.
        if (inline) {
          // Release the ceremony lock BEFORE prefetch so prefetch
          // can actually run.
          ceremonyLockRef.current = false
          // Challenge will be consumed by the action endpoint — drop
          // the client cache immediately so we never sign it twice.
          clearCachedOptions()
          // Warm a fresh challenge for the *next* payment.
          prefetch()

          return {
            ok: true,
            assertion: toBase64Url(JSON.stringify(assertion)),
          }
        }

        // ── 3b. Legacy mode (reauth) ────────────────────────────
        // Verify against /webauthn/auth/verify, which also clears
        // the reauth lock server-side as a side effect.
        setPhase('verifying')
        const verify = await webauthnApi.authVerify(uid, assertion, action)

        if (!verify.verified) {
          clearCachedOptions()
          return { ok: false, message: 'Authentication not verified' }
        }

        ceremonyLockRef.current = false
        clearCachedOptions()
        prefetch()

        return { ok: true, token: verify.token }
      } catch (err) {
        console.error('[biometric] auth failed:', err)
        const e = err as { name?: string; message?: string }

        if (
          e?.name === 'NotAllowedError' ||
          e?.name === 'AbortError' ||
          e?.message === 'The operation either timed out or was not allowed.'
        ) {
          // Cancelled — challenge wasn't signed. Keep the cache;
          // the next tap reuses it for free.
          ceremonyLockRef.current = false
          return { ok: false, message: 'Cancelled' }
        }

        ceremonyLockRef.current = false
        clearCachedOptions()

        const { message } = extractApiError(err)
        return { ok: false, message: message || 'Authentication failed' }
      } finally {
        ceremonyLockRef.current = false
        setPhase('idle')
        setCeremonyActive(false)
        setIsAuthenticating(false)
      }
    },
    [uid, enabled, forLogin, forTx, prefetch]
  )

  // ── Set a child flag ────────────────────────────────────────
  const setChildEnabled = useCallback(
    (which: 'login' | 'tx', value: boolean) => {
      if (which === 'login') {
        applyForLogin(value)
        if (value && !enabled) applyEnabled(true)
      } else {
        applyForTx(value)
        if (value && !enabled) applyEnabled(true)
      }

      Promise.resolve().then(() => {
        const loginNow = which === 'login' ? value : isBioForLogin()
        const txNow = which === 'tx' ? value : isBioForTx()

        if (!loginNow && !txNow) {
          applyEnabled(false)
        }
      })
    },
    [enabled, applyEnabled, applyForLogin, applyForTx]
  )

  return {
    isSupported,
    isReady,
    enabled,
    forLogin,
    forTx,
    isRegistering,
    isAuthenticating,
    phase,
    register,
    revoke,
    authenticate,
    setChildEnabled,
    prefetch,
  }
}