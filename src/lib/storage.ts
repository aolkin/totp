import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { TOTPRecord, EncryptedData, TOTPExport } from './types';
import { uint8ArrayToBase64, base64ToUint8Array } from './crypto';

const DB_NAME = 'totp-storage';
const DB_VERSION = 1;
const STORE_NAME = 'secrets';

interface TOTPDBSchema extends DBSchema {
  secrets: {
    key: number;
    value: TOTPRecord;
    // For autoIncrement stores, the key is optional when adding
  };
}

class TOTPStorage {
  private dbPromise: Promise<IDBPDatabase<TOTPDBSchema>>;

  constructor() {
    this.dbPromise = openDB<TOTPDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          });
        }
      },
    });
  }

  async add(label: string, encrypted: EncryptedData, passphraseHint?: string): Promise<number> {
    const db = await this.dbPromise;
    const now = Date.now();

    const record: Omit<TOTPRecord, 'id'> = {
      label,
      created: now,
      lastUsed: now,
      encrypted,
      passphraseHint,
    };

    // autoIncrement will generate the id, so we cast to the full type
    return db.add(STORE_NAME, record as TOTPRecord);
  }

  async getAll(): Promise<TOTPRecord[]> {
    const db = await this.dbPromise;
    return db.getAll(STORE_NAME);
  }

  async getById(id: number): Promise<TOTPRecord | undefined> {
    const db = await this.dbPromise;
    return db.get(STORE_NAME, id);
  }

  async update(id: number, data: Partial<TOTPRecord>): Promise<void> {
    const db = await this.dbPromise;
    const existing = await db.get(STORE_NAME, id);
    if (!existing) {
      throw new Error('Record not found');
    }
    const updated = { ...existing, ...data };
    await db.put(STORE_NAME, updated);
  }

  async updateLastUsed(id: number): Promise<void> {
    return this.update(id, { lastUsed: Date.now() });
  }

  async delete(id: number): Promise<void> {
    const db = await this.dbPromise;
    await db.delete(STORE_NAME, id);
  }

  async count(): Promise<number> {
    const db = await this.dbPromise;
    return db.count(STORE_NAME);
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

      await this.add(totp.label, encrypted, totp.passphraseHint);
      imported++;
    }

    return imported;
  }
}

export const totpStorage = new TOTPStorage();
