import type { ProviderId } from '@/lib/providers'
import { phoneApi, type PhoneNumberHistoryEntry } from '@/services/api'

const HISTORY_TTL_MS = 5 * 60 * 1000

export type NumberHistoryEntry = PhoneNumberHistoryEntry

export interface SimilarMatch extends NumberHistoryEntry {
  diffs: number
}

/** Backend network string ("MTN", "9MOBILE", ...) -> ProviderId. */
export function networkToProviderId(
  network?: string | null
): ProviderId | null {
  if (!network) return null
  const n = network.toLowerCase().replace(/[\s_-]/g, '')
  if (n === '9mobile' || n === 'ninemobile' || n === 'etisalat') {
    return 'ninemobile'
  }
  if (n === 'mtn' || n === 'airtel' || n === 'glo') return n
  return null
}

// ── Confirmed network (from real past transactions) ─────────────────
const confirmedCache = new Map<string, ProviderId | null>()
const confirmedInflight = new Map<string, Promise<ProviderId | null>>()

export function getConfirmedNetwork(phone: string): Promise<ProviderId | null> {
  if (confirmedCache.has(phone)) {
    return Promise.resolve(confirmedCache.get(phone) ?? null)
  }
  const existing = confirmedInflight.get(phone)
  if (existing) return existing

  const p = (async () => {
    try {
      const data = await phoneApi.network(phone)
      const value = networkToProviderId(data?.network)
      confirmedCache.set(phone, value) // null = "no history", cache it
      return value
    } catch {
      return null // non-fatal, and not cached so a retry can succeed
    } finally {
      confirmedInflight.delete(phone)
    }
  })()

  confirmedInflight.set(phone, p)
  return p
}

export function invalidateConfirmedNetwork(phone?: string) {
  if (phone) confirmedCache.delete(phone)
  else confirmedCache.clear()
}

// ── User's own number history ───────────────────────────────────────
let historyCache: NumberHistoryEntry[] | null = null
let historyFetchedAt = 0
let historyInflight: Promise<NumberHistoryEntry[]> | null = null

export async function getNumberHistory(
  force = false
): Promise<NumberHistoryEntry[]> {
  const fresh =
    historyCache !== null && Date.now() - historyFetchedAt < HISTORY_TTL_MS
  if (!force && fresh) return historyCache as NumberHistoryEntry[]
  if (historyInflight) return historyInflight

  historyInflight = (async () => {
    try {
      const data = await phoneApi.numberHistory()
      historyCache = data?.history ?? []
      historyFetchedAt = Date.now()
      return historyCache
    } catch {
      return historyCache ?? []
    } finally {
      historyInflight = null
    }
  })()

  return historyInflight
}

export function invalidateNumberHistory() {
  historyCache = null
  historyFetchedAt = 0
}

// ── Typo detection (pure) ───────────────────────────────────────────
export function countDigitDiffs(a: string, b: string): number {
  if (a.length !== b.length) return Infinity
  let diffs = 0
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diffs++
  return diffs
}

/** History numbers that differ from `typed` by exactly 1-2 digits. */
export function findSimilarNumbers(
  typed: string,
  history: NumberHistoryEntry[],
  limit = 3
): SimilarMatch[] {
  return history
    .map((h) => ({ ...h, diffs: countDigitDiffs(h.phone, typed) }))
    .filter((h) => h.diffs >= 1 && h.diffs <= 2)
    .sort(
      (a, b) =>
        a.diffs - b.diffs ||
        new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime()
    )
    .slice(0, limit)
}