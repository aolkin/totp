import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { TOTPRecord, Account, EncryptedPassphrase } from './types';

export const DB_NAME = 'totp-storage';
export const DB_VERSION = 4;
export const STORE_NAME = 'secrets';
export const ACCOUNTS_STORE = 'accounts';
export const ENCRYPTED_PASSPHRASES_STORE = 'encrypted_passphrases';

export type TOTPStoreName = 'secrets' | 'accounts' | 'encrypted_passphrases';

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
  encrypted_passphrases: {
    key: number;
    value: EncryptedPassphrase;
    indexes: { accountId: number; totpId: number; accountId_totpId: [number, number] };
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
      if (oldVersion < 4 && !db.objectStoreNames.contains(ENCRYPTED_PASSPHRASES_STORE)) {
        const passphraseStore = db.createObjectStore(ENCRYPTED_PASSPHRASES_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        passphraseStore.createIndex('accountId', 'accountId', { unique: false });
        passphraseStore.createIndex('totpId', 'totpId', { unique: false });
        passphraseStore.createIndex('accountId_totpId', ['accountId', 'totpId'], {
          unique: true,
        });
      }
    },
  });
}
