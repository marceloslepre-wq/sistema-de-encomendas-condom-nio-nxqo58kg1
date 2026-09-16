// CondPack Service Worker — Shell estático offline e atualização automática
// Versão do Cache: condpack-shell-v0.0.301
const CACHE_NAME = 'condpack-shell-v0.0.301'

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-512.svg',
  '/icon-maskable.svg',
]

// Instalação: ativa imediatamente sem aguardar abas antigas
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS)
    }),
  )
})

// Ativação: limpa versões antigas do cache e assume o controle imediatamente
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        }),
      )
    }),
  )
  self.clients.claim()
})

// Mensagens vindas do app (ex.: pular espera se solicitado)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Interceptação de requisições de rede
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const requestUrl = new URL(event.request.url)

  // NUNCA cachear dados dinâmicos, APIs do PocketBase, endpoints de autenticação ou serviços externos de terceiros
  if (
    requestUrl.pathname.startsWith('/api/') ||
    requestUrl.pathname.startsWith('/backend/') ||
    requestUrl.hostname.includes('pocketbase') ||
    requestUrl.hostname.includes('goskip.dev')
  ) {
    return
  }

  // Requisições para outras origens não são tratadas pelo nosso cache de shell
  if (requestUrl.origin !== self.location.origin) {
    return
  }

  // Para navegação SPA (documentos HTML): Network First com fallback para index.html em cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('/index.html', clone)
            })
          }
          return networkResponse
        })
        .catch(async () => {
          const cached = await caches.match('/index.html')
          if (cached) return cached
          return caches.match('/')
        }),
    )
    return
  }

  // Para assets estáticos locais (/assets/, imagens, ícones, fontes): Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone)
            })
          }
          return networkResponse
        })
        .catch((err) => {
          // Se offline e falhou fetch, retorna cache existente se houver
          return cachedResponse
        })

      return cachedResponse || fetchPromise
    }),
  )
})
