// src/lib/bodyScrollLock.ts

let lockCount = 0
let savedScrollY = 0
const saved = { overflow: '', position: '', top: '', width: '' }

export function acquireBodyScrollLock() {
  if (lockCount === 0) {
    savedScrollY = window.scrollY
    saved.overflow = document.body.style.overflow
    saved.position = document.body.style.position
    saved.top = document.body.style.top
    saved.width = document.body.style.width

    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${savedScrollY}px`
    document.body.style.width = '100%'
  }
  lockCount++
}

export function releaseBodyScrollLock() {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount > 0) return

  document.body.style.overflow = saved.overflow
  document.body.style.position = saved.position
  document.body.style.top = saved.top
  document.body.style.width = saved.width
  window.scrollTo(0, savedScrollY)
}