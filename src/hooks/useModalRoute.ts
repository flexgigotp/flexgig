// src/hooks/useModalRoute.ts
import { useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export function useModalRoute() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const currentModal = params.get('modal')

  const openModal = useCallback(
    (name: string) => {
      const next = new URLSearchParams(params)
      next.set('modal', name)
      navigate(`?${next.toString()}`)
    },
    [navigate, params]
  )

  /** Close via back — matches browser back button exactly. */
  const closeModal = useCallback(() => {
    navigate(-1)
  }, [navigate])

  /**
   * Close without adding/rewriting history — use after a successful submit
   * so the user doesn't accidentally reopen the modal by tapping back.
   */
  const closeModalReplace = useCallback(() => {
    const next = new URLSearchParams(params)
    next.delete('modal')
    navigate(`?${next.toString()}`, { replace: true })
  }, [navigate, params])

  return { currentModal, openModal, closeModal, closeModalReplace }
}