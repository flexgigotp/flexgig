import { create } from 'zustand'
import { UserProfile } from '@/types/user'

interface UserStore {
  profile: UserProfile | null
  isLoading: boolean
  error: string | null
  setProfile: (profile: UserProfile | null) => void
  setIsLoading: (value: boolean) => void
  setError: (error: string | null) => void
  clearProfile: () => void
}

export const useUserStore = create<UserStore>((set) => ({
  profile: null,
  isLoading: false,
  error: null,
  setProfile: (profile) => set({ profile }),
  setIsLoading: (value) => set({ isLoading: value }),
  setError: (error) => set({ error }),
  clearProfile: () => set({ profile: null, error: null }),
}))
