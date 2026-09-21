// src/lib/biometricStorage.ts

const KEYS = {
  enabled: 'flexgig.bio.enabled',
  forLogin: 'flexgig.bio.login',
  forTx: 'flexgig.bio.tx',
  credentialId: 'flexgig.bio.credentialId',
  cachedOptions: 'flexgig.bio.cachedOptions',
} as const

/** Cached WebAuthn options are trusted for this long.
 *  Must stay BELOW the server's challenge TTL (90s). */
export const OPTIONS_TTL_MS = 60_000

// ── WebAuthn ceremony flag (module-level, cross-instance) ──
// Lets ReauthManager (a different component tree) know that a native
// WebAuthn prompt is open somewhere — during which no DOM activity
// events fire and idle timers must not trigger reauth.
let ceremonyActive = false
export function setCeremonyActive(v: boolean): void {
  ceremonyActive = v
}
export function isCeremonyActive(): boolean {
  return ceremonyActive
}

// ── Flags ─────────────────────────────────────────────

export function isBiometricEnabled(): boolean {
  try {
    return localStorage.getItem(KEYS.enabled) === 'true'
  } catch {
    return false
  }
}

export function setBiometricEnabled(value: boolean): void {
  try {
    localStorage.setItem(KEYS.enabled, String(value))
  } catch {
    /* ignore */
  }
}

export function isBioForLogin(): boolean {
  try {
    return localStorage.getItem(KEYS.forLogin) === 'true'
  } catch {
    return false
  }
}

export function setBioForLogin(value: boolean): void {
  try {
    localStorage.setItem(KEYS.forLogin, String(value))
  } catch {
    /* ignore */
  }
}

export function isBioForTx(): boolean {
  try {
    return localStorage.getItem(KEYS.forTx) === 'true'
  } catch {
    return false
  }
}

export function setBioForTx(value: boolean): void {
  try {
    localStorage.setItem(KEYS.forTx, String(value))
  } catch {
    /* ignore */
  }
}

// ── Credential ID ─────────────────────────────────────

export function getCredentialId(): string | null {
  try {
    return localStorage.getItem(KEYS.credentialId)
  } catch {
    return null
  }
}

export function setCredentialId(id: string): void {
  try {
    localStorage.setItem(KEYS.credentialId, id)
  } catch {
    /* ignore */
  }
}

export function clearCredentialId(): void {
  try {
    localStorage.removeItem(KEYS.credentialId)
  } catch {
    /* ignore */
  }
}

// ── Cached options ────────────────────────────────────

interface CachedOptionsRecord {
  fetchedAt: number
  options: unknown
}

export function getCachedOptions(): {
  options: unknown
  fresh: boolean
} | null {
  try {
    const raw = localStorage.getItem(KEYS.cachedOptions)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedOptionsRecord
    if (!parsed?.fetchedAt || !parsed?.options) return null
    return {
      options: parsed.options,
      fresh: Date.now() - parsed.fetchedAt < OPTIONS_TTL_MS,
    }
  } catch {
    return null
  }
}

export function setCachedOptions(options: unknown): void {
  try {
    const rec: CachedOptionsRecord = { fetchedAt: Date.now(), options }
    localStorage.setItem(KEYS.cachedOptions, JSON.stringify(rec))
  } catch {
    /* ignore */
  }
}

export function clearCachedOptions(): void {
  try {
    localStorage.removeItem(KEYS.cachedOptions)
  } catch {
    /* ignore */
  }
}

// ── Master clear ──────────────────────────────────────

export function clearAllBiometricState(): void {
  Object.values(KEYS).forEach((k) => {
    try {
      localStorage.removeItem(k)
    } catch {
      /* ignore */
    }
  })
}