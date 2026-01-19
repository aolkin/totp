import type { TOTPRecord, EncryptedData, TOTPExport, SortOption } from './types';

const DB_NAME = 'totp-storage';
const DB_VERSION = 1;
const STORE_NAME = 'secrets';

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
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('label', 'label', { unique: false });
          store.createIndex('lastUsed', 'lastUsed', { unique: false });
          store.createIndex('created', 'created', { unique: false });
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

    return new Promise((resolve, reject) => {
      const store = this.getStore('readwrite');
      const now = Date.now();

      const record: Omit<TOTPRecord, 'id'> = {
        label,
        created: now,
        lastUsed: now,
        encrypted,
        passphraseHint,
      };

      const request = store.add(record);

      request.onsuccess = () => {
        resolve(request.result as number);
      };

      request.onerror = () => {
        reject(new Error('Failed to add record'));
      };
    });
  }

  async getAll(): Promise<TOTPRecord[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      const store = this.getStore('readonly');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as TOTPRecord[]);
      };

      request.onerror = () => {
        reject(new Error('Failed to get records'));
      };
    });
  }

  async getById(id: number): Promise<TOTPRecord | undefined> {
    await this.init();

    return new Promise((resolve, reject) => {
      const store = this.getStore('readonly');
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result as TOTPRecord | undefined);
      };

      request.onerror = () => {
        reject(new Error('Failed to get record'));
      };
    });
  }

  async update(id: number, data: Partial<TOTPRecord>): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const store = this.getStore('readwrite');
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const existing = getRequest.result as TOTPRecord | undefined;
        if (!existing) {
          reject(new Error('Record not found'));
          return;
        }

        const updated = { ...existing, ...data };
        const putRequest = store.put(updated);

        putRequest.onsuccess = () => {
          resolve();
        };
        putRequest.onerror = () => {
          reject(new Error('Failed to update record'));
        };
      };

      getRequest.onerror = () => {
        reject(new Error('Failed to get record for update'));
      };
    });
  }

  async updateLastUsed(id: number): Promise<void> {
    return this.update(id, { lastUsed: Date.now() });
  }

  async delete(id: number): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const store = this.getStore('readwrite');
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        reject(new Error('Failed to delete record'));
      };
    });
  }

  async search(query: string): Promise<TOTPRecord[]> {
    const all = await this.getAll();
    const lowerQuery = query.toLowerCase();
    return all.filter((record) => record.label.toLowerCase().includes(lowerQuery));
  }

  async getSorted(sort: SortOption): Promise<TOTPRecord[]> {
    const all = await this.getAll();

    switch (sort) {
      case 'recent':
        return all.sort((a, b) => b.lastUsed - a.lastUsed);
      case 'alphabetical':
        return all.sort((a, b) => a.label.localeCompare(b.label));
      case 'created':
        return all.sort((a, b) => b.created - a.created);
      default:
        return all;
    }
  }

  async count(): Promise<number> {
    await this.init();

    return new Promise((resolve, reject) => {
      const store = this.getStore('readonly');
      const request = store.count();

      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(new Error('Failed to count records'));
      };
    });
  }

  async clear(): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const store = this.getStore('readwrite');
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        reject(new Error('Failed to clear records'));
      };
    });
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

  async importAll(data: TOTPExport, overwrite = false): Promise<number> {
    if (data.version !== 1) {
      throw new Error('Unsupported export version');
    }

    if (overwrite) {
      await this.clear();
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
