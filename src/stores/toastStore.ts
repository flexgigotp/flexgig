// src\stores\toastStore.ts
import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastStore {
  toasts: Toast[]
  addToast: (message: string, type?: ToastType, duration?: number) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type = 'info', duration = 3000) => {
    const id = Math.random().toString(36).slice(2, 10)
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    window.setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, duration)
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

/** Imperative helper — call anywhere, no hook needed. */
export const toast = {
  success: (msg: string, duration?: number) =>
    useToastStore.getState().addToast(msg, 'success', duration),
  error: (msg: string, duration?: number) =>
    useToastStore.getState().addToast(msg, 'error', duration),
  info: (msg: string, duration?: number) =>
    useToastStore.getState().addToast(msg, 'info', duration),
}