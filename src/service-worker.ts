/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';

declare let self: ServiceWorkerGlobalScope;

// Precache all assets (vite-plugin-pwa will inject the manifest here)
precacheAndRoute(self.__WB_MANIFEST);

// Clean up old caches from previous versions
cleanupOutdatedCaches();

// For navigation requests, serve index.html from cache (SPA fallback)
const handler = createHandlerBoundToURL('/index.html');
registerRoute(new NavigationRoute(handler));
