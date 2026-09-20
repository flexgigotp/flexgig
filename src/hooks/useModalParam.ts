// src/hooks/useModalParam.ts
import { useCallback, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { safeCloseModal } from '@/lib/safeCloseModal'

/**
 * URL-driven modal state via a query param on the current path.
 *
 * - open()  → pushes a new history entry
 * - close() → pops it (or replaces when there's no history to pop)
 *
 * Deep-link protection: if we ever land on the FIRST history entry
 * (idx 0) with our param present — e.g. user pasted the URL into a
 * fresh tab — we strip the param and never open the modal. This
 * prevents the "stuck modal" trap where back and close have nothing
 * to pop. Normal in-app opens (which always push a new entry, idx > 0)
 * are unaffected.
 */
export function useModalParam(name: string) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const strippedRef = useRef(false)

  const paramPresent = searchParams.get(name) === '1'

  // ── Strip on first-entry deep link (runs once per mount) ────────
  useEffect(() => {
    if (strippedRef.current) return
    if (!paramPresent) return

    const state = window.history.state as { idx?: number } | null
    const idx = typeof state?.idx === 'number' ? state.idx : 0

    // Real history behind us — leave it alone, back will work.
    if (idx !== 0) {
      strippedRef.current = true
      return
    }

    // First entry + param present → deep link. Strip and never open.
    strippedRef.current = true

    const params = new URLSearchParams(window.location.search)
    params.delete(name)
    const qs = params.toString()
    const clean = `${window.location.pathname}${qs ? `?${qs}` : ''}`
    navigate(clean, { replace: true })
  }, [paramPresent, name, navigate])

  // ── Open — pushes a fresh history entry ─────────────────────────
  const open = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    params.set(name, '1')
    navigate(`${window.location.pathname}?${params.toString()}`)
  }, [name, navigate])

  // ── Close — pops history, or replaces if nothing to pop ─────────
  const close = useCallback(() => {
    safeCloseModal(navigate, [name])
  }, [name, navigate])

  return { isOpen: paramPresent, open, close }
}