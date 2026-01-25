import type { TOTPRecord, EncryptedData, TOTPExport } from './types';
import { uint8ArrayToBase64, base64ToUint8Array, encodeToURL } from './crypto';
import { DbRepository } from './db-repository';

export {
  DB_NAME,
  DB_VERSION,
  STORE_NAME,
  ACCOUNTS_STORE,
  type TOTPDBSchema,
  openTotpDatabase,
} from './database';

class TOTPStorage extends DbRepository<'secrets'> {
  protected storeName = 'secrets' as const;

  async addTotp(
    label: string,
    encrypted: EncryptedData,
    passphraseHint?: string,
    savedWithAccount?: number,
  ): Promise<number> {
    const now = Date.now();

    const record: Omit<TOTPRecord, 'id'> = {
      label,
      created: now,
      lastUsed: now,
      encrypted,
      passphraseHint,
      savedWithAccount,
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

  async clearSavedWithAccount(accountId: number): Promise<void> {
    const records = await this.getAll();
    for (const record of records) {
      if (record.savedWithAccount === accountId) {
        await this.update(record.id, { savedWithAccount: undefined });
      }
    }
  }
}

export const totpStorage = new TOTPStorage();
