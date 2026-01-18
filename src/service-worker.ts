/// <reference lib="webworker" />
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';

declare let self: ServiceWorkerGlobalScope;

// Precache all assets (vite-plugin-pwa will inject the manifest here)
precacheAndRoute(self.__WB_MANIFEST);

// Clean up old caches from previous versions
cleanupOutdatedCaches();

// For navigation requests, serve index.html from cache (SPA fallback)
const handler = createHandlerBoundToURL('/index.html');
registerRoute(new NavigationRoute(handler));

// Notify clients when service worker is activated
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      // Claim clients to take control immediately
      await self.clients.claim();

      // Notify all clients that the service worker is ready
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => {
        client.postMessage({
          type: 'SW_ACTIVATED',
          timestamp: Date.now(),
        });
      });
    })(),
  );
});

// Listen for messages from clients
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const data = event.data as { type?: string } | undefined;
  if (data?.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});
