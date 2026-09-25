import { create } from 'zustand'

interface UpdateGuardState {
  activeGuards: Set<string>
  guard: (key: string) => void
  unguard: (key: string) => void
  isGuarded: () => boolean
}

export const useUpdateGuardStore = create<UpdateGuardState>((set, get) => ({
  activeGuards: new Set(),
  guard: (key) =>
    set((s) => {
      const next = new Set(s.activeGuards)
      next.add(key)
      return { activeGuards: next }
    }),
  unguard: (key) =>
    set((s) => {
      const next = new Set(s.activeGuards)
      next.delete(key)
      return { activeGuards: next }
    }),
  isGuarded: () => get().activeGuards.size > 0,
}))