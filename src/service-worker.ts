/// <reference lib="webworker" />
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { setCacheTimestamp } from './lib/cache-db';

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

const handler = createHandlerBoundToURL('/index.html');
registerRoute(new NavigationRoute(handler));

self.addEventListener('install', () => {
  void self.skipWaiting();
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();

      await setCacheTimestamp(new Date().toISOString());

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
