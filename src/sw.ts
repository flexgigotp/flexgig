/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

const APP_VERSION = '1.0.6'
const CACHE_NAME = `flexgig-${APP_VERSION}`

// Vite injects the hashed build assets here automatically
precacheAndRoute(self.__WB_MANIFEST)

// --- Install: DO NOT skip waiting. The new SW stays in the "waiting"
// state until the page explicitly tells it to activate (via
// updateSW(true) in main.tsx), so a live session is never interrupted
// without the user's say-so. ---
self.addEventListener('install', () => {})

// --- Activate: clean old caches, claim clients (only runs once the
// waiting SW has been told to skip waiting) ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names.filter((n) => n !== CACHE_NAME && !n.startsWith('workbox-')).map((n) => caches.delete(n))
      )
      await self.clients.claim()
    })()
  )
})

// --- Fetch: network-first, fall back to cache ---
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Bypass cache for auth routes and dev-only injected scripts
  if (
    url.pathname.startsWith('/auth/') ||
    url.pathname.includes('___vscode_livepreview_injected_script') ||
    url.pathname.startsWith('/api/') // never cache API calls
  ) {
    return
  }

  // Only handle GET requests
  if (event.request.method !== 'GET') return

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Only cache same-origin basic responses
        if (
          !networkResponse ||
          networkResponse.status !== 200 ||
          networkResponse.type !== 'basic'
        ) {
          return networkResponse
        }
        const responseToCache = networkResponse.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache))
        return networkResponse
      })
      .catch(async () => {
        const cached = await caches.match(event.request)
        if (cached) return cached
        // SPA fallback
        const fallback = await caches.match('/index.html')
        return fallback || new Response('Offline', { status: 503 })
      })
  )
})

// --- Broadcast notification from page ---
self.addEventListener('message', (ev: ExtendableMessageEvent) => {
  const data = (ev.data || {}) as { type?: string; payload?: { message?: string; url?: string } }
  if (data.type !== 'BROADCAST_NOTIFICATION') return
  const payload = data.payload || {}
  self.registration.showNotification('Announcement', {
    body: payload.message || '',
    data: { url: payload.url || '/' },
    tag: 'broadcast',
  })
})

interface PushPayload {
  title?: string
  body?: string
  url?: string
  tag?: string
  kind?: 'credit' | 'broadcast'
}

// Safari/iOS require every push to show a notification, so never skip there.
function isWebKitPush(): boolean {
  const ua = self.navigator.userAgent
  return (
    /iPhone|iPad|iPod/.test(ua) ||
    (/Safari/.test(ua) && !/Chrome|Chromium|Edg|Firefox|OPR/.test(ua))
  )
}

self.addEventListener('push', (event: PushEvent) => {
  event.waitUntil(
    (async () => {
      let data: PushPayload = {}
      try {
        data = event.data ? (event.data.json() as PushPayload) : {}
      } catch {
        data = { body: event.data?.text() }
      }

      // Credit alerts already show as an in-app toast while the app is open
      if (data.kind === 'credit' && !isWebKitPush()) {
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        if (windows.some((w) => w.visibilityState === 'visible')) return
      }

      const options: NotificationOptions & { renotify?: boolean } = {
        body: data.body || '',
        icon: '/pwa/logo-192x192.png',
        badge: '/pwa/logo-192x192.png',
        tag: data.tag,
        data: { url: data.url || '/dashboard' },
      }
      if (data.tag) options.renotify = true // renotify without a tag throws

      await self.registration.showNotification(data.title || 'FlexGig', options)
    })()
  )
})

self.addEventListener('notificationclick', (ev: NotificationEvent) => {
  ev.notification.close()
  const target = new URL(ev.notification.data?.url || '/dashboard', self.location.origin)
  const url = target.origin === self.location.origin ? target.href : self.location.origin + '/dashboard'

  ev.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const w of windows) {
        await w.focus()
        try {
          await w.navigate(url)
        } catch {
          /* uncontrolled client — focusing is enough */
        }
        return
      }
      await self.clients.openWindow(url)
    })()
  )
})