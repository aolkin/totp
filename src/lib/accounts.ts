import { get, writable } from 'svelte/store';
import type { Account, EncryptedKey, UnlockedAccount } from './types';
import { ACCOUNTS_STORE, openTotpDatabase } from './storage';
import {
  uint8ArrayToBase64,
  PBKDF2_ITERATIONS,
  SALT_LENGTH,
  IV_LENGTH,
  importPbkdf2KeyMaterial,
  toArrayBuffer,
} from './crypto';

const TAG_LENGTH = 16;
const PASSWORD_HASH_BYTES = 32;
const AUTO_LOCK_CHECK_INTERVAL = 30000;

const unlockedAccountsStore = writable<Map<number, UnlockedAccount>>(new Map());

export const unlockedAccounts = {
  subscribe: unlockedAccountsStore.subscribe,
};

let autoLockInterval: ReturnType<typeof setInterval> | undefined;
let autoLockCallback: ((account: UnlockedAccount) => void) | undefined;

async function derivePasswordHash(password: string, salt: Uint8Array): Promise<string> {
  const keyMaterial = await importPbkdf2KeyMaterial(password);
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    PASSWORD_HASH_BYTES * 8,
  );
  return uint8ArrayToBase64(new Uint8Array(bits));
}

async function deriveKEK(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await importPbkdf2KeyMaterial(password);
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey'],
  );
}

async function wrapDEK(dek: CryptoKey, kek: CryptoKey): Promise<EncryptedKey> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const wrapped = await crypto.subtle.wrapKey('raw', dek, kek, { name: 'AES-GCM', iv });
  const wrappedBytes = new Uint8Array(wrapped);
  return {
    iv,
    ciphertext: wrappedBytes.slice(0, -TAG_LENGTH),
    tag: wrappedBytes.slice(-TAG_LENGTH),
  };
}

async function unwrapDEK(
  encrypted: EncryptedKey,
  kek: CryptoKey,
  extractable: boolean,
): Promise<CryptoKey> {
  const wrapped = new Uint8Array([...encrypted.ciphertext, ...encrypted.tag]);
  return crypto.subtle.unwrapKey(
    'raw',
    wrapped,
    kek,
    { name: 'AES-GCM', iv: toArrayBuffer(encrypted.iv) },
    { name: 'AES-GCM', length: 256 },
    extractable,
    ['encrypt', 'decrypt'],
  );
}

function assertPasswordLength(password: string) {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
}

function updateUnlockedAccount(accountId: number, updates: Partial<UnlockedAccount>) {
  unlockedAccountsStore.update((current) => {
    const existing = current.get(accountId);
    if (!existing) {
      return current;
    }
    const next = new Map(current);
    next.set(accountId, { ...existing, ...updates });
    return next;
  });
}

function setUnlockedAccount(account: UnlockedAccount) {
  unlockedAccountsStore.update((current) => {
    const next = new Map(current);
    next.set(account.accountId, account);
    return next;
  });
}

function removeUnlockedAccount(accountId: number) {
  unlockedAccountsStore.update((current) => {
    if (!current.has(accountId)) {
      return current;
    }
    const next = new Map(current);
    next.delete(accountId);
    return next;
  });
}

export function getUnlockedAccount(accountId: number): UnlockedAccount | undefined {
  return get(unlockedAccountsStore).get(accountId);
}

export function isAccountUnlocked(accountId: number): boolean {
  return getUnlockedAccount(accountId) !== undefined;
}

export function recordAccountActivity(accountId?: number): void {
  const now = Date.now();
  if (accountId !== undefined) {
    updateUnlockedAccount(accountId, { lastActivity: now });
    return;
  }
  unlockedAccountsStore.update((current) => {
    if (current.size === 0) {
      return current;
    }
    const next = new Map(current);
    for (const [id, account] of next) {
      next.set(id, { ...account, lastActivity: now });
    }
    return next;
  });
}

export function checkAndLockInactiveAccounts(now = Date.now()): UnlockedAccount[] {
  const current = get(unlockedAccountsStore);
  if (current.size === 0) {
    return [];
  }
  const expired: UnlockedAccount[] = [];
  for (const account of current.values()) {
    if (account.autoLockMinutes === 0) {
      continue;
    }
    const timeoutMs = account.autoLockMinutes * 60 * 1000;
    if (now - account.lastActivity > timeoutMs) {
      expired.push(account);
    }
  }
  if (expired.length > 0) {
    unlockedAccountsStore.update((state) => {
      const next = new Map(state);
      for (const account of expired) {
        next.delete(account.accountId);
      }
      return next;
    });
  }
  return expired;
}

export function startAutoLockMonitor(onAutoLock?: (account: UnlockedAccount) => void): void {
  autoLockCallback = onAutoLock;
  if (autoLockInterval) {
    return;
  }
  autoLockInterval = setInterval(() => {
    const locked = checkAndLockInactiveAccounts();
    if (autoLockCallback) {
      locked.forEach((account) => {
        autoLockCallback?.(account);
      });
    }
  }, AUTO_LOCK_CHECK_INTERVAL);
}

export function stopAutoLockMonitor(): void {
  if (autoLockInterval) {
    clearInterval(autoLockInterval);
    autoLockInterval = undefined;
  }
  autoLockCallback = undefined;
}

export async function listAccounts(): Promise<Account[]> {
  const db = await openTotpDatabase();
  return db.getAll(ACCOUNTS_STORE);
}

export async function getAccountById(accountId: number): Promise<Account | undefined> {
  const db = await openTotpDatabase();
  return db.get(ACCOUNTS_STORE, accountId);
}

export async function getAccountByUsername(username: string): Promise<Account | undefined> {
  const db = await openTotpDatabase();
  return db.getFromIndex(ACCOUNTS_STORE, 'username', username);
}

async function updateAccountRecord(accountId: number, updates: Partial<Account>): Promise<Account> {
  const db = await openTotpDatabase();
  const existing = await db.get(ACCOUNTS_STORE, accountId);
  if (!existing) {
    throw new Error('Account not found');
  }
  const updated = { ...existing, ...updates };
  await db.put(ACCOUNTS_STORE, updated);
  return updated;
}

export async function createAccount(
  username: string,
  password: string,
  autoLockMinutes: number,
): Promise<Account> {
  if (!username.trim()) {
    throw new Error('Username is required');
  }
  assertPasswordLength(password);

  const db = await openTotpDatabase();
  const existing = await db.getFromIndex(ACCOUNTS_STORE, 'username', username);
  if (existing) {
    throw new Error('Username already exists');
  }

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const keySalt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const passwordHash = await derivePasswordHash(password, salt);

  const dek = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
  const kek = await deriveKEK(password, keySalt);
  const encryptedDEK = await wrapDEK(dek, kek);
  const now = Date.now();
  const accountData: Omit<Account, 'id'> = {
    username,
    created: now,
    lastUsed: now,
    passwordHash,
    salt,
    keySalt,
    encryptedDEK,
    autoLockMinutes,
  };
  const accountId = await db.add(ACCOUNTS_STORE, accountData as Account);
  const account: Account = { ...accountData, id: accountId };
  setUnlockedAccount({
    accountId,
    username,
    dataEncryptionKey: dek,
    autoLockMinutes,
    unlockedAt: now,
    lastActivity: now,
  });
  return account;
}

export async function unlockAccount(accountId: number, password: string): Promise<UnlockedAccount> {
  const account = await getAccountById(accountId);
  if (!account) {
    throw new Error('Account not found');
  }

  const passwordHash = await derivePasswordHash(password, account.salt);
  if (passwordHash !== account.passwordHash) {
    throw new Error('Incorrect password');
  }

  const kek = await deriveKEK(password, account.keySalt);
  const dek = await unwrapDEK(account.encryptedDEK, kek, false);
  const now = Date.now();
  const unlocked: UnlockedAccount = {
    accountId: account.id,
    username: account.username,
    dataEncryptionKey: dek,
    autoLockMinutes: account.autoLockMinutes,
    unlockedAt: now,
    lastActivity: now,
  };
  setUnlockedAccount(unlocked);
  await updateAccountRecord(account.id, { lastUsed: now });
  return unlocked;
}

export function lockAccount(accountId: number): void {
  removeUnlockedAccount(accountId);
}

export function lockAllAccounts(): void {
  unlockedAccountsStore.set(new Map());
}

export async function updateAutoLockMinutes(
  accountId: number,
  autoLockMinutes: number,
): Promise<Account> {
  const account = await updateAccountRecord(accountId, { autoLockMinutes });
  updateUnlockedAccount(accountId, { autoLockMinutes });
  return account;
}

export async function changeAccountPassword(
  accountId: number,
  currentPassword: string,
  newPassword: string,
): Promise<Account> {
  assertPasswordLength(newPassword);
  const account = await getAccountById(accountId);
  if (!account) {
    throw new Error('Account not found');
  }

  const currentHash = await derivePasswordHash(currentPassword, account.salt);
  if (currentHash !== account.passwordHash) {
    throw new Error('Incorrect password');
  }

  const currentKek = await deriveKEK(currentPassword, account.keySalt);
  const dek = await unwrapDEK(account.encryptedDEK, currentKek, true);
  const newSalt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const newKeySalt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const newPasswordHash = await derivePasswordHash(newPassword, newSalt);
  const newKek = await deriveKEK(newPassword, newKeySalt);
  const encryptedDEK = await wrapDEK(dek, newKek);
  const updated = await updateAccountRecord(accountId, {
    passwordHash: newPasswordHash,
    salt: newSalt,
    keySalt: newKeySalt,
    encryptedDEK,
    lastUsed: Date.now(),
  });
  recordAccountActivity(accountId);
  return updated;
}

export async function deleteAccount(accountId: number): Promise<void> {
  const db = await openTotpDatabase();
  await db.delete(ACCOUNTS_STORE, accountId);
  lockAccount(accountId);
}
