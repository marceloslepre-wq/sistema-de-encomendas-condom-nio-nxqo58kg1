const CACHE_NAME = 'encomendas-pwa-v1'

const STATIC_ASSETS = ['/', '/index.html', '/manifest.json']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    }),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)),
      )
    }),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  // Do not intercept API requests to PocketBase to prevent caching stale dynamic data
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('/backend/v1/') ||
    event.request.url.includes('/backend/v1/enviar-codigo-whatsapp') ||
    event.request.url.includes('goskip.dev')
  ) {
    return
  }

  const url = new URL(event.request.url)
  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // Cache successful responses for subsequent offline use
          if (networkResponse.ok && event.request.url.startsWith('http')) {
            const clone = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone)
            })
          }
          return networkResponse
        })
        .catch((error) => {
          console.warn('Fetch failed; returning offline cache instead.', error)
          return cachedResponse
        })

      // Implement stale-while-revalidate: return cache instantly if exists, but update in background
      return cachedResponse || fetchPromise
    }),
  )
})
