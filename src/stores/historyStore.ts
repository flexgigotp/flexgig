// src/stores/historyStore.ts
import { create } from 'zustand'
import type { Transaction } from '@/types/api'
import { transactionsApi, extractApiError } from '@/services/api'
import type {
  HistoryCategoryFilter,
  HistoryStatusFilter,
} from '@/lib/history'

const PAGE_SIZE = 30
const MAX_PAGES = 20 // hard cap so infinite scroll can't run away

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
  selectedMonth: { year: number; month: number } | null

  // Actions
  ensureLoaded: () => Promise<void>
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
  setCategory: (v: HistoryCategoryFilter) => void
  setStatus: (v: HistoryStatusFilter) => void
  setSelectedMonth: (m: { year: number; month: number } | null) => void
  reset: () => void
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

      // De-dupe by id, then merge + sort
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
    }),
}))