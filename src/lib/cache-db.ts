/**
 * Shared IndexedDB utilities for cache metadata management
 * Used by both the main app and service worker
 */

const DB_NAME = 'totp-cache-db';
const DB_VERSION = 1;
const STORE_NAME = 'metadata';
const TIMESTAMP_KEY = 'cache_last_update';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(request.error?.message ?? 'Failed to open IndexedDB'));
    };
    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function getCacheTimestamp(): Promise<string | undefined> {
  try {
    const db = await openDB();
    try {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(TIMESTAMP_KEY);

      const result = await new Promise<string | null>((resolve, reject) => {
        request.onerror = () => {
          reject(new Error(request.error?.message ?? 'Failed to get timestamp from IndexedDB'));
        };
        request.onsuccess = () => {
          resolve(request.result as string | null);
        };
      });

      return result ?? undefined;
    } finally {
      db.close();
    }
  } catch (error) {
    console.error('Error getting cache timestamp:', error);
    return undefined;
  }
}

export async function setCacheTimestamp(timestamp: string): Promise<void> {
  const db = await openDB();
  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(timestamp, TIMESTAMP_KEY);

    await new Promise<void>((resolve, reject) => {
      request.onerror = () => {
        reject(new Error(request.error?.message ?? 'Failed to set timestamp in IndexedDB'));
      };
      request.onsuccess = () => {
        resolve();
      };
    });
  } finally {
    db.close();
  }
}

export async function deleteCacheDB(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      reject(new Error(request.error?.message ?? 'Failed to delete IndexedDB'));
    };
  });
}
