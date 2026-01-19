/**
 * Offline-related utilities for PWA functionality
 */

import { getCacheTimestamp } from './cache-db';

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

/**
 * Refresh the cache by checking for service worker updates
 */
export async function refreshCache(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;

    const hasUpdate = await new Promise<boolean>((resolve) => {
      const handleControllerChange = () => {
        cleanup();
        resolve(true);
      };

      const cleanup = () => {
        clearTimeout(timeoutId);
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      };

      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

      const timeoutId = setTimeout(() => {
        cleanup();
        resolve(false);
      }, 5000);

      void registration.update();
    });

    if (hasUpdate) {
      window.location.reload();
    }
  } catch (error) {
    console.error('Error refreshing cache:', error);
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
