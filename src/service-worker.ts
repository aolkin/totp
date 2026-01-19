/// <reference lib="webworker" />
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// SPA fallback: serve index.html for navigation requests
const handler = createHandlerBoundToURL('/index.html');
registerRoute(new NavigationRoute(handler));

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();

      const db = await openDB();
      await setCacheTimestamp(db, new Date().toISOString());
      db.close();

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

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('totp-cache-db', 1);

    request.onerror = () => {
      reject(new Error(request.error?.message ?? 'Failed to open IndexedDB'));
    };
    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata');
      }
    };
  });
}

function setCacheTimestamp(db: IDBDatabase, timestamp: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('metadata', 'readwrite');
    const store = transaction.objectStore('metadata');
    const request = store.put(timestamp, 'cache_last_update');

    request.onerror = () => {
      reject(new Error(request.error?.message ?? 'Failed to set timestamp in IndexedDB'));
    };
    request.onsuccess = () => {
      resolve();
    };
  });
}

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const data = event.data as { type?: string } | undefined;
  if (data?.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});
