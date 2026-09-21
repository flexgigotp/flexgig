// src/lib/history.ts
import type { Transaction } from '@/types/api'

export type HistoryCategoryFilter = 'all' | 'data'
export type HistoryStatusFilter =
  | 'all'
  | 'success'
  | 'failed'
  | 'pending'
  | 'refund'
  | 'credit'
  | 'mtn'
  | 'airtel'
  | 'glo'
  | '9mobile'

export interface MonthGroup {
  monthKey: string // "2026-08"
  prettyMonth: string // "Aug 2026"
  totalIn: number
  totalOut: number
  txs: Transaction[]
}

// ── Normalize provider → canonical key ────────────────────────
export function normalizeProvider(raw: string | null | undefined): string {
  const p = (raw || '').toLowerCase().trim()
  if (p === '9mobile' || p === 'ninemobile' || p === 'etisalat') return '9mobile'
  return p
}

// ── Amount: sign and formatted string ─────────────────────────
export function isCreditTx(tx: Transaction): boolean {
  return tx.type === 'credit' || tx.status === 'refund'
}

export function formatAmount(n: number): string {
  return `₦${Math.abs(Number(n) || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatSignedAmount(tx: Transaction): string {
  const sign = isCreditTx(tx) ? '+' : '-'
  return `${sign}${formatAmount(tx.amount)}`
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const date = d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    const time = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    return `${date} · ${time}`
  } catch {
    return iso || ''
  }
}

// ── Status normalization: status → badge class + label ────────
export type StatusKind = 'success' | 'failed' | 'pending' | 'refund'

export function statusKind(raw: string | null | undefined): StatusKind {
  const s = (raw || '').toLowerCase()
  if (s.includes('refund')) return 'refund'
  if (s.includes('fail')) return 'failed'
  if (s.includes('pending') || s.includes('processing')) return 'pending'
  return 'success'
}

export function statusLabel(raw: string | null | undefined): string {
  switch (statusKind(raw)) {
    case 'refund': return 'REFUNDED'
    case 'failed': return 'FAILED'
    case 'pending': return 'PENDING'
    default: return 'SUCCESS'
  }
}

// ── Description cleanup (mirrors server-friendly view) ────────
export function displayDescription(tx: Transaction): string {
  const desc = (tx.description || '').trim()
  const status = (tx.status || '').toLowerCase()

  if (status.includes('refund')) {
    const provider = (tx.provider || '').toUpperCase()
    const dataAmt = tx.data_amount || ''
    const phone = tx.phone || ''
    if (dataAmt && phone) return `Refund — ${provider} ${dataAmt} to ${phone}`
    if (dataAmt) return `Refund — ${provider} ${dataAmt}`
    if (phone) return `Refund — ${phone}`
    return 'Data Refund'
  }

  const d = desc.toLowerCase()
  if (d.includes('refunded to admin') || d.includes('advance repaid by')) return desc
  if (tx.type === 'credit') return desc || 'Wallet Funding'
  if (d.startsWith('wallet transfer')) return desc

  const provider = (tx.provider || '').toUpperCase()
  if (tx.data_amount && tx.phone) return `${provider} ${tx.data_amount} — ${tx.phone}`
  if (tx.data_amount) return `${provider} ${tx.data_amount} Data`
  if (tx.phone) return `${provider} Data — ${tx.phone}`
  return desc || `${provider} Transaction`
}

// ── Group by month, newest first ──────────────────────────────
export function groupByMonth(items: Transaction[]): MonthGroup[] {
  const map = new Map<string, MonthGroup>()

  for (const tx of items) {
    const d = new Date(tx.created_at)
    if (Number.isNaN(d.getTime())) continue
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

    let g = map.get(key)
    if (!g) {
      g = {
        monthKey: key,
        prettyMonth: d.toLocaleDateString('en-GB', {
          month: 'short',
          year: 'numeric',
        }),
        totalIn: 0,
        totalOut: 0,
        txs: [],
      }
      map.set(key, g)
    }
    g.txs.push(tx)
    const amt = Math.abs(Number(tx.amount) || 0)
    if (isCreditTx(tx)) g.totalIn += amt
    else g.totalOut += amt
  }

  // Sort groups desc (newest first); txs within a group desc by created_at
  return Array.from(map.values())
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
    .map((g) => ({
      ...g,
      txs: g.txs.slice().sort((a, b) =>
        (b.created_at || '').localeCompare(a.created_at || '')
      ),
    }))
}

// ── Apply category + status filters ───────────────────────────
export function applyFilters(
  items: Transaction[],
  category: HistoryCategoryFilter,
  status: HistoryStatusFilter
): Transaction[] {
  let out = items

  if (category === 'data') {
    out = out.filter((tx) => {
      const d = (tx.description || '').toLowerCase()
      return d.includes('data') || d.includes('gb') || d.includes('mb')
    })
  }

  if (status !== 'all') {
    out = out.filter((tx) => {
      const st = statusKind(tx.status)
      const prov = normalizeProvider(tx.provider)
      const d = (tx.description || '').toLowerCase()

      switch (status) {
        case 'success': return st === 'success'
        case 'failed':  return st === 'failed'
        case 'pending': return st === 'pending'
        case 'refund':  return st === 'refund'
        case 'credit':  return tx.type === 'credit'
        case 'mtn':     return prov === 'mtn' || d.includes('mtn')
        case 'airtel':  return prov === 'airtel' || d.includes('airtel')
        case 'glo':     return prov === 'glo' || d.includes('glo')
        case '9mobile': return prov === '9mobile' || d.includes('9mobile')
        default:        return true
      }
    })
  }

  return out
}

// ── Filter by selected month ──────────────────────────────────
export function filterByMonth(
  items: Transaction[],
  month: { year: number; month: number } | null
): Transaction[] {
  if (!month) return items
  return items.filter((tx) => {
    const d = new Date(tx.created_at)
    return d.getFullYear() === month.year && d.getMonth() === month.month
  })
}

// ── Card-style labels for filters ─────────────────────────────
export const CATEGORY_LABELS: Record<HistoryCategoryFilter, string> = {
  all: 'All Categories',
  data: 'Data',
}

export const STATUS_LABELS: Record<HistoryStatusFilter, string> = {
  all: 'All Status',
  success: 'Success',
  failed: 'Failed',
  pending: 'Pending',
  refund: 'Refunded',
  credit: 'Wallet Credit',
  mtn: 'MTN Transactions',
  airtel: 'Airtel Transactions',
  glo: 'GLO Transactions',
  '9mobile': '9Mobile Transactions',
}