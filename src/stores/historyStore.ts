// src/stores/historyStore.ts
import { create } from 'zustand'
import type { Transaction } from '@/types/api'
import { transactionsApi, extractApiError } from '@/services/api'
import type {
  HistoryCategoryFilter,
  HistoryStatusFilter,
} from '@/lib/history'

const PAGE_SIZE = 30
const MAX_PAGES = 20
const MONTH_PAGE_SIZE = 100
const MONTH_MAX_PAGES = 10 // caps a single month at 1000 txs

interface MonthRef {
  year: number
  month: number // 0-indexed
}

interface HistoryState {
  items: Transaction[]
  isLoading: boolean
  isFetchingMore: boolean
  hasFetched: boolean
  hasMore: boolean
  page: number
  error: string | null

  category: HistoryCategoryFilter
  status: HistoryStatusFilter
  selectedMonth: MonthRef | null

  // Per-month fetch state (for the picker)
  monthCache: Record<string, Transaction[]>
  monthLoading: boolean
  monthError: string | null

  // Actions
  ensureLoaded: () => Promise<void>
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
  setCategory: (v: HistoryCategoryFilter) => void
  setStatus: (v: HistoryStatusFilter) => void
  setSelectedMonth: (m: MonthRef | null) => void
  ensureMonthLoaded: (m: MonthRef) => Promise<void>
  selectMonth: (m: MonthRef | null) => Promise<void>
  reset: () => void
}

function monthKey(m: MonthRef): string {
  return `${m.year}-${String(m.month + 1).padStart(2, '0')}`
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  items: [],
  isLoading: false,
  isFetchingMore: false,
  hasFetched: false,
  hasMore: true,
  page: 0,
  error: null,

  category: 'all',
  status: 'all',
  selectedMonth: null,

  monthCache: {},
  monthLoading: false,
  monthError: null,

  async ensureLoaded() {
    const s = get()
    if (s.hasFetched || s.isLoading) return
    await get().refresh()
  },

  async refresh() {
    set({ isLoading: true, error: null })
    try {
      const res = await transactionsApi.list({ page: 1, limit: PAGE_SIZE })
      set({
        items: res.items || [],
        page: 1,
        hasMore: (res.items?.length || 0) >= PAGE_SIZE,
        hasFetched: true,
        isLoading: false,
      })
    } catch (err) {
      const { message } = extractApiError(err)
      set({ error: message || 'Failed to load transactions', isLoading: false })
    }
  },

  async loadMore() {
    const s = get()
    if (s.isFetchingMore || !s.hasMore) return
    if (s.page >= MAX_PAGES) {
      set({ hasMore: false })
      return
    }

    set({ isFetchingMore: true })
    try {
      const nextPage = s.page + 1
      const res = await transactionsApi.list({ page: nextPage, limit: PAGE_SIZE })
      const incoming = res.items || []

      const seen = new Set(s.items.map((tx) => tx.id))
      const fresh = incoming.filter((tx) => !seen.has(tx.id))

      set({
        items: [...s.items, ...fresh].sort((a, b) =>
          (b.created_at || '').localeCompare(a.created_at || '')
        ),
        page: nextPage,
        hasMore: incoming.length >= PAGE_SIZE,
        isFetchingMore: false,
      })
    } catch (err) {
      const { message } = extractApiError(err)
      set({ error: message || 'Failed to load more', isFetchingMore: false })
    }
  },

  setCategory: (v) => set({ category: v, selectedMonth: null }),
  setStatus: (v) => set({ status: v, selectedMonth: null }),

  setSelectedMonth: (m) => set({ selectedMonth: m }),

  /**
   * Fetch every transaction for a specific month.
   *
   * Why this exists: the base `items` array only holds what infinite
   * scroll has paged in so far. If the user picks an old month without
   * scrolling, we'd have nothing to filter and would show a false
   * "no transactions" message. This action hits the server with an
   * explicit from/to range so the month's full set is guaranteed.
   *
   * Results are cached per month key so re-selecting is instant.
   * Fetched txs are merged into `items` (dedup'd) so realtime updates
   * and infinite scroll continue to work without any special casing
   * in the render layer.
   */
  async ensureMonthLoaded(m) {
    const key = monthKey(m)

    // Already cached → merge and return instantly
    const cached = get().monthCache[key]
    if (cached) {
      mergeIntoItems(set, get, cached)
      return
    }

    set({ monthLoading: true, monthError: null })

    try {
      // Local-time boundaries → UTC ISO. This gives us the calendar
      // month as the user experiences it, regardless of their tz offset.
      const start = new Date(m.year, m.month, 1, 0, 0, 0, 0)
      const end = new Date(m.year, m.month + 1, 0, 23, 59, 59, 999)
      const from = start.toISOString()
      const to = end.toISOString()

      const collected: Transaction[] = []
      let page = 1

      while (page <= MONTH_MAX_PAGES) {
        const res = await transactionsApi.list({
          page,
          limit: MONTH_PAGE_SIZE,
          from,
          to,
        })
        const batch = res.items || []
        collected.push(...batch)
        if (batch.length < MONTH_PAGE_SIZE) break
        page++
      }

      // Store cache (replace object so Zustand sees the change)
      set({ monthCache: { ...get().monthCache, [key]: collected } })

      mergeIntoItems(set, get, collected)

      set({ monthLoading: false })
    } catch (err) {
      const { message } = extractApiError(err)
      set({
        monthLoading: false,
        monthError: message || 'Failed to load month',
      })
    }
  },

  async selectMonth(m) {
    if (!m) {
      set({ selectedMonth: null, monthError: null })
      return
    }
    set({ selectedMonth: m })
    await get().ensureMonthLoaded(m)
  },

  reset: () =>
    set({
      items: [],
      isLoading: false,
      isFetchingMore: false,
      hasFetched: false,
      hasMore: true,
      page: 0,
      error: null,
      category: 'all',
      status: 'all',
      selectedMonth: null,
      monthCache: {},
      monthLoading: false,
      monthError: null,
    }),
}))

/**
 * Merge a batch of txs into `items`, deduped by id and re-sorted desc.
 * Shared by the cache-hit path and the fresh-fetch path.
 */
function mergeIntoItems(
  set: (partial: Partial<HistoryState>) => void,
  get: () => HistoryState,
  incoming: Transaction[]
) {
  if (incoming.length === 0) return

  const existing = get().items
  const seen = new Set(existing.map((t) => t.id))
  const fresh = incoming.filter((t) => !seen.has(t.id))

  if (fresh.length === 0) return

  set({
    items: [...existing, ...fresh].sort((a, b) =>
      (b.created_at || '').localeCompare(a.created_at || '')
    ),
  })
}