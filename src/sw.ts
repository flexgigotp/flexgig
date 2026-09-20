/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

const APP_VERSION = '1.0.5'
const CACHE_NAME = `flexgig-${APP_VERSION}`

// Vite injects the hashed build assets here automatically
precacheAndRoute(self.__WB_MANIFEST)

// --- Install: activate immediately ---
self.addEventListener('install', () => {
  self.skipWaiting()
})

// --- Activate: clean old caches, don't reload tabs (avoids dev reload loops) ---
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

self.addEventListener('notificationclick', (ev: NotificationEvent) => {
  ev.notification.close()
  const url = (ev.notification.data && ev.notification.data.url) || '/'
  ev.waitUntil(self.clients.openWindow(url))
})