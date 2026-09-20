// src/lib/safeCloseModal.ts
import type { NavigateFunction } from 'react-router-dom'

/**
 * Safely closes a URL-driven modal.
 *
 * - If there is app history behind us, pop it (matches browser back).
 * - If we landed here directly (deep link / fresh reload on the first
 *   history entry), replace the URL to strip the modal params instead.
 *   This prevents the "stuck modal" trap where navigate(-1) does nothing.
 *
 * React Router v6 tracks history position via `window.history.state.idx`.
 * A value of 0 (or missing) means we are on the first entry of this tab.
 */
export function safeCloseModal(
  navigate: NavigateFunction,
  paramsToRemove: string[]
) {
  const state = window.history.state as { idx?: number } | null
  const idx = typeof state?.idx === 'number' ? state.idx : 0

  if (idx > 0) {
    navigate(-1)
    return
  }

  const params = new URLSearchParams(window.location.search)
  for (const p of paramsToRemove) params.delete(p)
  const qs = params.toString()
  navigate(
    `${window.location.pathname}${qs ? `?${qs}` : ''}`,
    { replace: true }
  )
}