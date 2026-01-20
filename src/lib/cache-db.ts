/**
 * Shared IndexedDB utilities for cache metadata management
 * Used by both the main app and service worker
 */

import { get, set, createStore } from 'idb-keyval';

const TIMESTAMP_KEY = 'cache_last_update';

// Create a custom store for cache metadata
const cacheStore = createStore('totp-cache-db', 'metadata');

export async function getCacheTimestamp(): Promise<string | undefined> {
  try {
    return await get<string>(TIMESTAMP_KEY, cacheStore);
  } catch (error) {
    console.error('Error getting cache timestamp:', error);
    return undefined;
  }
}

export async function setCacheTimestamp(timestamp: string): Promise<void> {
  await set(TIMESTAMP_KEY, timestamp, cacheStore);
}
