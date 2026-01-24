import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { TOTPRecord, Account } from './types';

export const DB_NAME = 'totp-storage';
export const DB_VERSION = 3;
export const STORE_NAME = 'secrets';
export const ACCOUNTS_STORE = 'accounts';

export interface TOTPDBSchema extends DBSchema {
  secrets: {
    key: number;
    value: TOTPRecord;
  };
  accounts: {
    key: number;
    value: Account;
    indexes: { username: string };
  };
}

export function openTotpDatabase(): Promise<IDBPDatabase<TOTPDBSchema>> {
  return openDB<TOTPDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
      if (oldVersion < 3 && !db.objectStoreNames.contains(ACCOUNTS_STORE)) {
        const store = db.createObjectStore(ACCOUNTS_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('username', 'username', { unique: true });
      }
    },
  });
}
