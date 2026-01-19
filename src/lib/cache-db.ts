/**
 * Shared IndexedDB utilities for cache metadata management
 * Used by both the main app and service worker
 */

const DB_NAME = 'totp-cache-db';
const DB_VERSION = 1;
const STORE_NAME = 'metadata';
const TIMESTAMP_KEY = 'cache_last_update';

function wrapRequest<T>(request: IDBRequest<T>, errorMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => {
      reject(new Error(request.error?.message ?? errorMessage));
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

async function openDB(): Promise<IDBDatabase> {
  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onupgradeneeded = (event) => {
    const db = (event.target as IDBOpenDBRequest).result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME);
    }
  };

  return wrapRequest(request, 'Failed to open IndexedDB');
}

export async function getCacheTimestamp(): Promise<string | undefined> {
  try {
    const db = await openDB();
    try {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      return (await wrapRequest(
        store.get(TIMESTAMP_KEY),
        'Failed to get timestamp from IndexedDB',
      )) as string | undefined;
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

    await wrapRequest(request, 'Failed to set timestamp in IndexedDB');
  } finally {
    db.close();
  }
}
