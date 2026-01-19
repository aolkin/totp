import type { TOTPRecord, EncryptedData, TOTPExport } from './types';

const DB_NAME = 'totp-storage';
const DB_VERSION = 1;
const STORE_NAME = 'secrets';

function wrapRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(new Error('IndexedDB operation failed'));
    };
  });
}

class TOTPStorage {
  private db: IDBDatabase | undefined;
  private initPromise: Promise<void> | undefined;

  async init(): Promise<void> {
    if (this.db) return;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          });
        }
      };
    });

    return this.initPromise;
  }

  private getStore(mode: IDBTransactionMode): IDBObjectStore {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const transaction = this.db.transaction(STORE_NAME, mode);
    return transaction.objectStore(STORE_NAME);
  }

  async add(label: string, encrypted: EncryptedData, passphraseHint?: string): Promise<number> {
    await this.init();
    const store = this.getStore('readwrite');
    const now = Date.now();

    const record: Omit<TOTPRecord, 'id'> = {
      label,
      created: now,
      lastUsed: now,
      encrypted,
      passphraseHint,
    };

    return wrapRequest(store.add(record)) as Promise<number>;
  }

  async getAll(): Promise<TOTPRecord[]> {
    await this.init();
    const store = this.getStore('readonly');
    return wrapRequest(store.getAll()) as Promise<TOTPRecord[]>;
  }

  async getById(id: number): Promise<TOTPRecord | undefined> {
    await this.init();
    const store = this.getStore('readonly');
    return wrapRequest(store.get(id)) as Promise<TOTPRecord | undefined>;
  }

  async update(id: number, data: Partial<TOTPRecord>): Promise<void> {
    await this.init();
    const store = this.getStore('readwrite');
    const existing = (await wrapRequest(store.get(id))) as TOTPRecord | undefined;
    if (!existing) {
      throw new Error('Record not found');
    }
    const updated = { ...existing, ...data };
    await wrapRequest(store.put(updated));
  }

  async updateLastUsed(id: number): Promise<void> {
    return this.update(id, { lastUsed: Date.now() });
  }

  async delete(id: number): Promise<void> {
    await this.init();
    const store = this.getStore('readwrite');
    await wrapRequest(store.delete(id));
  }

  async count(): Promise<number> {
    await this.init();
    const store = this.getStore('readonly');
    return wrapRequest(store.count());
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

function uint8ArrayToBase64(arr: Uint8Array): string {
  let binary = '';
  for (const byte of arr) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export const totpStorage = new TOTPStorage();
