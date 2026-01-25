import type { EncryptedPassphrase, EncryptedKey } from './types';
import { DbRepository } from './db-repository';
import { generateIV, toArrayBuffer } from './crypto';
import { get } from 'svelte/store';
import { unlockedAccounts } from './accounts';

const TAG_LENGTH = 16;

class PassphraseRepository extends DbRepository<'encrypted_passphrases'> {
  protected storeName = 'encrypted_passphrases' as const;

  async getByAccountAndTotp(
    accountId: number,
    totpId: number,
  ): Promise<EncryptedPassphrase | undefined> {
    const db = await this.dbPromise;
    return db.getFromIndex(this.storeName, 'accountId_totpId', [accountId, totpId]);
  }

  async getAllByAccount(accountId: number): Promise<EncryptedPassphrase[]> {
    const db = await this.dbPromise;
    return db.getAllFromIndex(this.storeName, 'accountId', accountId);
  }

  async getAllByTotp(totpId: number): Promise<EncryptedPassphrase[]> {
    const db = await this.dbPromise;
    return db.getAllFromIndex(this.storeName, 'totpId', totpId);
  }

  async deleteByAccount(accountId: number): Promise<void> {
    const passphrases = await this.getAllByAccount(accountId);
    for (const passphrase of passphrases) {
      await this.delete(passphrase.id);
    }
  }

  async deleteByTotp(totpId: number): Promise<void> {
    const passphrases = await this.getAllByTotp(totpId);
    for (const passphrase of passphrases) {
      await this.delete(passphrase.id);
    }
  }

  async deleteByAccountAndTotp(accountId: number, totpId: number): Promise<void> {
    const passphrase = await this.getByAccountAndTotp(accountId, totpId);
    if (passphrase) {
      await this.delete(passphrase.id);
    }
  }
}

export const passphraseRepository = new PassphraseRepository();

async function encryptPassphraseWithDEK(passphrase: string, dek: CryptoKey): Promise<EncryptedKey> {
  const iv = generateIV();
  const encoded = new TextEncoder().encode(passphrase);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv), tagLength: 128 },
    dek,
    encoded,
  );

  const ciphertextBytes = new Uint8Array(ciphertext);
  return {
    iv,
    ciphertext: ciphertextBytes.slice(0, -TAG_LENGTH),
    tag: ciphertextBytes.slice(-TAG_LENGTH),
  };
}

async function decryptPassphraseWithDEK(encrypted: EncryptedKey, dek: CryptoKey): Promise<string> {
  const combined = new Uint8Array([...encrypted.ciphertext, ...encrypted.tag]);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(encrypted.iv), tagLength: 128 },
    dek,
    combined,
  );

  return new TextDecoder().decode(decrypted);
}

export async function savePassphraseToAccount(
  accountId: number,
  totpId: number,
  passphrase: string,
): Promise<void> {
  const accounts = get(unlockedAccounts);
  const account = accounts.get(accountId);

  if (!account) {
    throw new Error('Account must be unlocked first');
  }

  const encrypted = await encryptPassphraseWithDEK(passphrase, account.dataEncryptionKey);

  const existing = await passphraseRepository.getByAccountAndTotp(accountId, totpId);
  if (existing) {
    await passphraseRepository.update(existing.id, {
      encrypted,
      created: Date.now(),
    });
  } else {
    await passphraseRepository.add({
      accountId,
      totpId,
      encrypted,
      created: Date.now(),
    });
  }
}

export async function getPassphraseFromAccount(
  accountId: number,
  totpId: number,
): Promise<string | undefined> {
  const accounts = get(unlockedAccounts);
  const account = accounts.get(accountId);

  if (!account) {
    return undefined;
  }

  const record = await passphraseRepository.getByAccountAndTotp(accountId, totpId);

  if (!record) {
    return undefined;
  }

  try {
    return await decryptPassphraseWithDEK(record.encrypted, account.dataEncryptionKey);
  } catch {
    return undefined;
  }
}

export async function getTOTPCountForAccount(accountId: number): Promise<number> {
  const passphrases = await passphraseRepository.getAllByAccount(accountId);
  return passphrases.length;
}

export async function deletePassphrasesForAccount(accountId: number): Promise<void> {
  await passphraseRepository.deleteByAccount(accountId);
}

export async function deletePassphrasesForTotp(totpId: number): Promise<void> {
  await passphraseRepository.deleteByTotp(totpId);
}
