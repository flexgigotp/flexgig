import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProviderId } from '@/lib/providers'

interface DataPurchaseState {
  phone: string
  provider: ProviderId
  planId: string | null
  previewOrder: string[]

  setPhone: (phone: string) => void
  setProvider: (provider: ProviderId) => void
  setPlanId: (planId: string | null) => void
  setPreviewOrder: (order: string[]) => void
  /** Click inside the panel preview — select only, keep order. */
  selectPlanInPlace: (planId: string) => void
  /** Pick from All Plans — always promote to #1. */
  selectPlanFromAllPlans: (planId: string) => void
  reset: () => void
}

const MAX_PREVIEW_ORDER = 8

export const useDataPurchaseStore = create<DataPurchaseState>()(
  persist(
    (set) => ({
      phone: '',
      provider: 'mtn',
      planId: null,
      previewOrder: [],

      setPhone: (phone) => set({ phone }),
      setProvider: (provider) => set({ provider }),
      setPlanId: (planId) => set({ planId }),
      setPreviewOrder: (previewOrder) => set({ previewOrder }),

      selectPlanInPlace: (planId) => set({ planId }),

      selectPlanFromAllPlans: (planId) =>
        set((state) => {
          const filtered = state.previewOrder.filter((id) => id !== planId)
          const nextOrder = [planId, ...filtered].slice(0, MAX_PREVIEW_ORDER)
          return { planId, previewOrder: nextOrder }
        }),

      reset: () =>
        set({
          phone: '',
          provider: 'mtn',
          planId: null,
          previewOrder: [],
        }),
    }),
    {
      name: 'flexgig-data-purchase',
      version: 2,
    }
  )
)