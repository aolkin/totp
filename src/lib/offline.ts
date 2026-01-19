/**
 * Offline-related utilities for PWA functionality
 */

export interface CacheInfo {
  totalSize: number;
  lastUpdate: string | undefined;
  itemCount: number;
}

/**
 * Request persistent storage to prevent cache eviction
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    const isPersisted = await navigator.storage.persist();

    if (isPersisted) {
      localStorage.setItem('storage_persisted', 'true');
    }

    return isPersisted;
  } catch (error) {
    console.error('Error requesting persistent storage:', error);
    return false;
  }
}

/**
 * Check if persistent storage is already granted
 */
export async function isPersistentStorageGranted(): Promise<boolean> {
  try {
    return await navigator.storage.persisted();
  } catch (error) {
    console.error('Error checking persistent storage:', error);
    return false;
  }
}

/**
 * Get information about the current cache
 */
export async function getCacheInfo(): Promise<CacheInfo> {
  try {
    const cacheNames = await caches.keys();

    if (cacheNames.length === 0) {
      return { totalSize: 0, lastUpdate: undefined, itemCount: 0 };
    }

    const cacheName = cacheNames[0];
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    const sizes = await Promise.all(
      keys.map(async (req) => {
        const response = await cache.match(req);
        if (!response) return 0;
        const blob = await response.blob();
        return blob.size;
      }),
    );

    const totalSize = sizes.reduce((a, b) => a + b, 0);
    const lastUpdate = await getCacheTimestamp();

    return { totalSize, lastUpdate, itemCount: keys.length };
  } catch (error) {
    console.error('Error getting cache info:', error);
    return { totalSize: 0, lastUpdate: undefined, itemCount: 0 };
  }
}

async function getCacheTimestamp(): Promise<string | undefined> {
  try {
    const db = await openCacheDB();
    const timestamp = await getTimestampFromDB(db);
    db.close();
    return timestamp ?? undefined;
  } catch (error) {
    console.error('Error getting cache timestamp:', error);
    return undefined;
  }
}

function openCacheDB(): Promise<IDBDatabase> {
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

function getTimestampFromDB(db: IDBDatabase): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('metadata', 'readonly');
    const store = transaction.objectStore('metadata');
    const request = store.get('cache_last_update');

    request.onerror = () => {
      reject(new Error(request.error?.message ?? 'Failed to get timestamp from IndexedDB'));
    };
    request.onsuccess = () => {
      resolve(request.result as string | null);
    };
  });
}

/**
 * Refresh the cache by checking for service worker updates and activating them
 */
export async function refreshCache(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;

    await registration.update();

    const workerToActivate = registration.waiting ?? registration.installing;

    if (workerToActivate) {
      const activated = await activateServiceWorker(workerToActivate);
      if (activated) {
        window.location.reload();
      }
    } else {
      const db = await openCacheDB();
      await setCacheTimestampInDB(db, new Date().toISOString());
      db.close();
    }
  } catch (error) {
    console.error('Error refreshing cache:', error);
  }
}

function activateServiceWorker(worker: ServiceWorker): Promise<boolean> {
  const controller = new AbortController();

  const activationPromise = new Promise<boolean>((resolve) => {
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        controller.abort();
        resolve(true);
      },
      {
        once: true,
        signal: controller.signal,
      },
    );

    if (worker.state === 'installed') {
      worker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      worker.addEventListener(
        'statechange',
        () => {
          if (worker.state === 'installed') {
            worker.postMessage({ type: 'SKIP_WAITING' });
          } else if (worker.state === 'activated' || worker.state === 'redundant') {
            controller.abort();
            resolve(true);
          }
        },
        { signal: controller.signal },
      );
    }
  });

  const timeoutPromise = new Promise<boolean>((resolve) => {
    setTimeout(() => {
      controller.abort();
      resolve(false);
    }, 5000);
  });

  return Promise.race([activationPromise, timeoutPromise]);
}

function setCacheTimestampInDB(db: IDBDatabase, timestamp: string): Promise<void> {
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

/**
 * Clear all caches
 */
export async function clearCache(): Promise<void> {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));

  try {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase('totp-cache-db');
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        reject(new Error(request.error?.message ?? 'Failed to delete IndexedDB'));
      };
    });
  } catch (error) {
    console.error('Error clearing IndexedDB:', error);
  }
}

/**
 * Check if the app has been cached (service worker is active)
 */
export async function isAppCached(): Promise<boolean> {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration?.active !== undefined;
  }
  return false;
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round(bytes / Math.pow(k, i)).toString()} ${sizes[i]}`;
}

/**
 * Format a date string to relative time
 */
export function formatRelativeTime(dateString: string | undefined): string {
  if (!dateString) return 'Unknown';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays.toString()} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7).toString()} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30).toString()} months ago`;
  return `${Math.floor(diffDays / 365).toString()} years ago`;
}
