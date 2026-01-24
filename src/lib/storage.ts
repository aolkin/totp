import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { TOTPRecord, EncryptedData, TOTPExport, Account } from './types';
import { uint8ArrayToBase64, base64ToUint8Array, encodeToURL } from './crypto';
import { DbRepository } from './db-repository';

export const DB_NAME = 'totp-storage';
export const DB_VERSION = 3;
export const STORE_NAME = 'secrets';
export const ACCOUNTS_STORE = 'accounts';

export interface TOTPDBSchema extends DBSchema {
  secrets: {
    key: number;
    value: TOTPRecord;
    // For autoIncrement stores, the key is optional when adding
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

class TOTPStorage extends DbRepository<TOTPRecord> {
  protected storeName = 'secrets' as const;

  async addTotp(label: string, encrypted: EncryptedData, passphraseHint?: string): Promise<number> {
    const now = Date.now();

    const record: Omit<TOTPRecord, 'id'> = {
      label,
      created: now,
      lastUsed: now,
      encrypted,
      passphraseHint,
    };

    return super.add(record);
  }

  async findByEncodedData(encodedData: string): Promise<TOTPRecord | undefined> {
    const records = await this.getAll();
    return records.find((record) => encodeToURL(record.encrypted) === encodedData);
  }

  async updateLastUsed(id: number): Promise<void> {
    await this.update(id, { lastUsed: Date.now() });
  }

  async exportAll(): Promise<TOTPExport> {
    const records = await this.getAll();

    return {
      version: 1,
      exported: Date.now(),
      totps: records.map((record) => ({
        label: record.label,
        created: record.created,
        encrypted: {
          salt: uint8ArrayToBase64(record.encrypted.salt),
          iv: uint8ArrayToBase64(record.encrypted.iv),
          ciphertext: uint8ArrayToBase64(record.encrypted.ciphertext),
        },
        passphraseHint: record.passphraseHint,
      })),
    };
  }

  async importAll(data: TOTPExport): Promise<number> {
    if (data.version !== 1) {
      throw new Error('Unsupported export version');
    }

    let imported = 0;
    for (const totp of data.totps) {
      const encrypted: EncryptedData = {
        salt: base64ToUint8Array(totp.encrypted.salt),
        iv: base64ToUint8Array(totp.encrypted.iv),
        ciphertext: base64ToUint8Array(totp.encrypted.ciphertext),
      };

      await this.addTotp(totp.label, encrypted, totp.passphraseHint);
      imported++;
    }

    return imported;
  }
}

export const totpStorage = new TOTPStorage();
