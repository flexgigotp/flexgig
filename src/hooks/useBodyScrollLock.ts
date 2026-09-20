// src/hooks/useBodyScrollLock.ts
import { useEffect } from 'react'
import {
  acquireBodyScrollLock,
  releaseBodyScrollLock,
} from '@/lib/bodyScrollLock'

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    acquireBodyScrollLock()
    return () => releaseBodyScrollLock()
  }, [active])
}