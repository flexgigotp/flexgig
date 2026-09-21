import { create } from 'zustand'

interface BiometricPromptState {
  visible: boolean
  prompt: () => void
  dismiss: () => void
}

export const useBiometricPromptStore = create<BiometricPromptState>((set) => ({
  visible: false,
  prompt: () => set({ visible: true }),
  dismiss: () => set({ visible: false }),
}))