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
    const lastUpdate = localStorage.getItem('cache_last_update') ?? undefined;

    return { totalSize, lastUpdate, itemCount: keys.length };
  } catch (error) {
    console.error('Error getting cache info:', error);
    return { totalSize: 0, lastUpdate: undefined, itemCount: 0 };
  }
}

/**
 * Refresh the cache by checking for service worker updates and activating them
 */
export async function refreshCache(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;

    await registration.update();

    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });

      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener(
          'controllerchange',
          () => {
            resolve();
          },
          {
            once: true,
          },
        );
      });

      localStorage.setItem('cache_last_update', new Date().toISOString());
      window.location.reload();
    } else if (registration.installing) {
      await new Promise<void>((resolve) => {
        const installer = registration.installing;
        if (!installer) {
          resolve();
          return;
        }

        installer.addEventListener('statechange', () => {
          if (installer.state === 'installed' && registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });

            navigator.serviceWorker.addEventListener(
              'controllerchange',
              () => {
                resolve();
              },
              {
                once: true,
              },
            );
          } else if (installer.state === 'activated') {
            resolve();
          }
        });
      });

      localStorage.setItem('cache_last_update', new Date().toISOString());
      window.location.reload();
    } else {
      localStorage.setItem('cache_last_update', new Date().toISOString());
    }
  }
}

/**
 * Clear all caches
 */
export async function clearCache(): Promise<void> {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
  localStorage.removeItem('cache_last_update');
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
