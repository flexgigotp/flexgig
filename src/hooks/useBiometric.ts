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

interface UseBiometricReturn {
  isSupported: boolean
  isReady: boolean
  enabled: boolean
  forLogin: boolean
  forTx: boolean
  isRegistering: boolean
  isAuthenticating: boolean
  register: () => Promise<{ ok: boolean; message?: string }>
  revoke: () => Promise<{ ok: boolean; message?: string }>
  authenticate: (
    action: BiometricAction
  ) => Promise<{ ok: boolean; token?: string; message?: string }>
  setChildEnabled: (which: 'login' | 'tx', value: boolean) => void
  /** Fire-and-forget: refresh the auth-options cache. */
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

  // Shared in-flight prefetch promise — lets a user tap JOIN the
  // already-running options fetch instead of starting a second one
  const prefetchPromiseRef = useRef<Promise<unknown> | null>(null)

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

  // ── Local helpers that keep storage + state in sync ──────────
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
    if (prefetchPromiseRef.current) return

    const p = webauthnApi
      .authOptions(uid)
      .then((opts) => {
        setCachedOptions(opts)
        return opts
      })
      .catch(() => null /* cache just stays empty */)
      .finally(() => {
        prefetchPromiseRef.current = null
      })

    prefetchPromiseRef.current = p
  }, [uid])

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
    try {
      // 1. Revoke any existing credentials first — server enforces
      //    one-per-user, and a stale excludeCredentials entry makes
      //    navigator.credentials.create throw InvalidStateError.
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
          // Defensive: tell the server to clear anything it has for us
          await webauthnApi.revoke(uid, null).catch(() => null)
        }
      } catch {
        /* non-fatal — continue to registration */
      }

      // 2. Fetch registration options
      const options = await webauthnApi.registerOptions(
        uid,
        user?.username || user?.email || uid,
        user?.fullName || user?.firstName || user?.username || 'User'
      )

      // 3. Trigger the native prompt — the library decodes
      //    challenge / user.id / excludeCredentials itself, so the
      //    server JSON is passed through untouched.
      //    (Boundary cast: api.ts returns loose types; the server
      //    actually sends the standard JSON shape.)
      const credential = await startRegistration({
        optionsJSON: options as unknown as PublicKeyCredentialCreationOptionsJSON,
      })

      // 4. Persist credential ID (already a base64url string)
      setCredentialId(credential.id)

      // 5. Verify server-side
      const verify = await webauthnApi.registerVerify(uid, credential)

      if (!verify.verified) {
        clearCredentialId()
        return { ok: false, message: 'Registration not verified' }
      }

      // 6. Server's ID wins
      if (verify.credentialId) {
        setCredentialId(verify.credentialId)
      }

      // 7. Set all flags on
      applyEnabled(true)
      applyForLogin(true)
      applyForTx(true)
      refetch()
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
        /* best-effort — clear local anyway */
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
    async (action: BiometricAction) => {
      if (!uid) return { ok: false, message: 'Not signed in' }
      if (!enabled) {
        return { ok: false, message: 'Biometrics not enabled' }
      }
      if (action === 'reauth' && !forLogin) {
        return { ok: false, message: 'Biometric reauth is disabled' }
      }
      if (action === 'buy-data' && !forTx) {
        return { ok: false, message: 'Biometric checkout is disabled' }
      }

      const storedId = getCredentialId()
      if (!storedId) {
        return {
          ok: false,
          message: 'No biometric credential on this device',
        }
      }

      setIsAuthenticating(true)
      setCeremonyActive(true)
      try {
                // 1. Get options — cached if fresh; otherwise JOIN the
        //    in-flight prefetch so the first tap never pays for a
        //    second round trip.
        let options: PublicKeyCredentialRequestOptionsJSON

        const cached = getCachedOptions()
        if (cached && cached.fresh) {
          options = cached.options as PublicKeyCredentialRequestOptionsJSON
        } else {
          prefetch() // no-op if one is already in flight
          const joined = await prefetchPromiseRef.current
          if (joined) {
            options = joined as PublicKeyCredentialRequestOptionsJSON
          } else {
            // prefetch failed or wasn't eligible — direct fetch.
            // Assignable now that WebAuthnAuthOptionsResponse.userVerification
            // is the proper union type.
            options = await webauthnApi.authOptions(uid)
          }
        }

        // 2. Prompt the user — pass the JSON straight through
        const assertion = await startAuthentication({ optionsJSON: options })

        // 3. Verify — the assertion is already the JSON shape
        //    @simplewebauthn/server expects
        const verify = await webauthnApi.authVerify(uid, assertion, action)

        if (!verify.verified) {
          return { ok: false, message: 'Authentication not verified' }
        }

        return { ok: true, token: verify.token }
      } catch (err) {
        console.error('[biometric] auth failed:', err)
        const e = err as { name?: string; message?: string }

        if (
          e?.name === 'NotAllowedError' ||
          e?.name === 'AbortError' ||
          e?.message === 'The operation either timed out or was not allowed.'
        ) {
          return { ok: false, message: 'Cancelled' }
        }

        // Cache may have been stale; blow it away for next attempt
        clearCachedOptions()

        const { message } = extractApiError(err)
        return { ok: false, message: message || 'Authentication failed' }
      } finally {
        setCeremonyActive(false)
        setIsAuthenticating(false)
      }
    },
    [uid, enabled, forLogin, forTx, prefetch]
  )

  // ── Set a child flag (with parent auto-enable/disable) ──────
  const setChildEnabled = useCallback(
    (which: 'login' | 'tx', value: boolean) => {
      if (which === 'login') {
        applyForLogin(value)
        if (value && !enabled) applyEnabled(true)
      } else {
        applyForTx(value)
        if (value && !enabled) applyEnabled(true)
      }

      // If BOTH children end up off, drop the parent too.
      // We defer by a microtask so the two setChildEnabled calls
      // from a single user action don't race.
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
    register,
    revoke,
    authenticate,
    setChildEnabled,
    prefetch,
  }
}