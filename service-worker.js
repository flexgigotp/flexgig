['log', 'debug', 'warn', 'error', 'info'].forEach(m => console[m] = () => {});
console.log('service-worker.js: Loaded');

const APP_VERSION = '1.0.5'; // only bump this on each deploy
const CACHE_NAME = `flexgig-${APP_VERSION}`;

const urlsToCache = [
  '/',
  '/index.html',
  `frontend/js/main.js?v=${APP_VERSION}`, // Versioned for busting
  `frontend/styles/main.css?v=${APP_VERSION}`,
  `frontend/pwa/manifest.json?v=${APP_VERSION}`,
  'frontend/pwa/apple-touch-icon-180x180.png',
  'frontend/pwa/logo-192x192.png',
  'frontend/pwa/logo-512x512.png',
  'frontend/pwa/favicon.ico',
  'frontend/pwa/logo.svg',
  `dashboard/?v=${APP_VERSION}`,
  // Add dashboard.js/CSS if needed: `dashboard.js?v=${APP_VERSION}`
];

self.addEventListener('install', (event) => {
  console.log('service-worker.js: Install event (robust caching)');
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const failures = [];

    // Try to fetch & cache each URL; don't let a single failure abort install
    await Promise.all(urlsToCache.map(async (url) => {
      try {
        // Try a normal fetch first
        let response;
        try {
          response = await fetch(url, { cache: 'reload' });
        } catch (e) {
          // fallback: try fetch with no-cors for cross-origin assets (opaque response)
          // This may be needed for some CDNs that don't return CORS headers.
          try {
            response = await fetch(url, { cache: 'reload', mode: 'no-cors' });
          } catch (e2) {
            throw e2;
          }
        }

        // Accept successful responses OR opaque ones (cross-origin no-cors)
        if (response && (response.ok || response.type === 'opaque')) {
          try {
            // Save a clone to cache
            await cache.put(url, response.clone());
            console.log('service-worker.js: Cached:', url);
          } catch (putErr) {
            console.warn('service-worker.js: Cache.put failed for', url, putErr);
            failures.push({ url, reason: 'cache-put-failed', error: String(putErr) });
          }
        } else {
          // Non-ok (404/500) and not opaque
          const status = response ? response.status : 'no-response';
          console.warn('service-worker.js: Skipping (non-ok) resource:', url, 'status:', status);
          failures.push({ url, reason: `non-ok status ${status}` });
        }
      } catch (err) {
        console.warn('service-worker.js: Failed to fetch/cache', url, err);
        failures.push({ url, reason: 'fetch-failed', error: String(err) });
      }
    }));

    if (failures.length) {
      console.warn('service-worker.js: Some resources failed to cache on install:', failures);
      // You may want to report these to your monitoring endpoint here
    }

    // Force the SW to activate as soon as installation finishes
    await self.skipWaiting();
  })());
});


self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim()) // claim immediately
      .then(() => {
        // Tell all open tabs to reload so they pick up the new SW right away
        return self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => client.navigate(client.url));
        });
      })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Skip caching for auth routes and external scripts
  if (url.pathname.startsWith('/auth/') || url.pathname.includes('___vscode_livepreview_injected_script')) {
    console.log(`service-worker.js: Bypassing cache for: ${url}`);
    event.respondWith(fetch(event.request));
    return;
  }
  console.log('service-worker.js: Fetch event:', url);
  event.respondWith(
  fetch(event.request)
    .then((networkResponse) => {
      if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
        return networkResponse;
      }
      // Update the cache with the fresh response
      const responseToCache = networkResponse.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
      return networkResponse;
    })
    .catch(() => {
      // Only fall back to cache when truly offline
      return caches.match(event.request).then((cached) => cached || caches.match('/index.html'));
    })
);
});

self.addEventListener('message', (ev) => {
  const data = ev.data || {};
  if (data.type !== 'BROADCAST_NOTIFICATION') return;
  const payload = data.payload || {};
  self.registration.showNotification('Announcement', {
    body: payload.message || '',
    data: { url: payload.url || '/' },
    tag: 'broadcast',
    renotify: true
  });
});

self.addEventListener('notificationclick', (ev) => {
  ev.notification.close();
  const url = ev.notification.data?.url || '/';
  ev.waitUntil(clients.openWindow(url));
});


// Optional: Push notifications for urgent updates (e.g., downtime alerts)
// self.addEventListener('push', (event) => {
//   const options = { body: event.data ? event.data.text() : 'FlexGig Update Available', icon: '/frontend/pwa/logo-192x192.png' };
//   event.waitUntil(self.registration.showNotification('FlexGig Update', options));
// });