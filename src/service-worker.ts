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

const handler = createHandlerBoundToURL('/');
registerRoute(new NavigationRoute(handler));

self.addEventListener('install', () => {
  void self.skipWaiting();
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();

      try {
        await setCacheTimestamp(new Date().toISOString());
      } catch (error) {
        console.error('Failed to set cache timestamp:', error);
      }
    })(),
  );
});
