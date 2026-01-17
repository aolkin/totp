/// <reference lib="webworker" />
import { CACHE_VERSION, STATIC_ASSETS } from 'virtual:sw-manifest';

const CACHE_NAME = `totp-cache-${CACHE_VERSION}`;

const sw = self as unknown as ServiceWorkerGlobalScope;

sw.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(STATIC_ASSETS);
      await sw.skipWaiting();
    })()
  );
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith('totp-cache-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      await sw.clients.claim();
    })()
  );
});

sw.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') {
    return;
  }

  if (url.origin !== sw.location.origin) {
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
            return (await caches.match('/')) as Response;
          }
          throw new Error('Network request failed and no cache available');
        }
      })();

      return cachedResponse || (await fetchPromise);
    })()
  );
});
