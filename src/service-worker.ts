// These placeholders are replaced at build time by vite.config.ts
declare const __STATIC_ASSETS__: string[];

const CACHE_VERSION = '__CACHE_VERSION__';
const CACHE_NAME = `totp-cache-${CACHE_VERSION}`;

const STATIC_ASSETS: string[] = __STATIC_ASSETS__;

declare const self: ServiceWorkerGlobalScope;

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(STATIC_ASSETS);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith('totp-cache-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') {
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(event.request);

      const fetchPromise = (async () => {
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          if (event.request.destination === 'document') {
            return (await caches.match('/index.html')) as Response;
          }
          throw new Error('Network request failed and no cache available');
        }
      })();

      return cachedResponse || (await fetchPromise);
    })()
  );
});
