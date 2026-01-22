import type { TOTPMetadata, TOTPConfig, EncryptedData } from './types';
import { DEFAULT_DIGITS, DEFAULT_PERIOD, DEFAULT_ALGORITHM } from './types';

export type { EncryptedData } from './types';

export const PBKDF2_ITERATIONS = 100000;
export const SALT_LENGTH = 16;
export const IV_LENGTH = 12;
const NO_PASSPHRASE_KEY = 'NO_PASSPHRASE';

/**
 * Creates an ArrayBuffer copy for Web Crypto APIs that require ArrayBuffer inputs.
 */
export function toArrayBuffer(value: Uint8Array): ArrayBuffer {
  const copy = value.slice();
  return copy.buffer;
}

export async function importPbkdf2KeyMaterial(passphrase: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(passphrase);
  const buffer = toArrayBuffer(bytes);
  return crypto.subtle.importKey('raw', buffer, 'PBKDF2', false, ['deriveKey', 'deriveBits']);
}

export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = passphrase || NO_PASSPHRASE_KEY;
  const passwordKey = await importPbkdf2KeyMaterial(keyMaterial);

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encrypt(config: TOTPConfig, passphrase: string): Promise<EncryptedData> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(passphrase, salt);

  const metadata: TOTPMetadata = { s: config.secret };

  if (config.label) {
    metadata.l = config.label;
  }
  if (config.digits !== DEFAULT_DIGITS) {
    metadata.d = config.digits;
  }
  if (config.period !== DEFAULT_PERIOD) {
    metadata.p = config.period;
  }
  if (config.algorithm !== DEFAULT_ALGORITHM) {
    metadata.a = config.algorithm;
  }

  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(metadata));

  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  return {
    salt,
    iv,
    ciphertext: new Uint8Array(ciphertext),
  };
}

export async function decrypt(data: EncryptedData, passphrase: string): Promise<TOTPConfig> {
  const key = await deriveKey(passphrase, data.salt);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: data.iv.buffer as ArrayBuffer },
    key,
    data.ciphertext.buffer as ArrayBuffer,
  );

  const decoder = new TextDecoder();
  const metadata = JSON.parse(decoder.decode(plaintext)) as TOTPMetadata;

  return {
    secret: metadata.s,
    label: metadata.l ?? '',
    digits: metadata.d ?? DEFAULT_DIGITS,
    period: metadata.p ?? DEFAULT_PERIOD,
    algorithm: metadata.a ?? DEFAULT_ALGORITHM,
  };
}

export function encodeToURL(data: EncryptedData): string {
  const combined = new Uint8Array(data.salt.length + data.iv.length + data.ciphertext.length);
  combined.set(data.salt, 0);
  combined.set(data.iv, data.salt.length);
  combined.set(data.ciphertext, data.salt.length + data.iv.length);

  return btoa(String.fromCharCode(...combined))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function decodeFromURL(fragment: string): EncryptedData {
  const base64 = fragment.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padding);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const salt = bytes.slice(0, SALT_LENGTH);
  const iv = bytes.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = bytes.slice(SALT_LENGTH + IV_LENGTH);

  return { salt, iv, ciphertext };
}

export async function tryDecryptWithEmptyPassphrase(
  data: EncryptedData,
): Promise<TOTPConfig | undefined> {
  try {
    return await decrypt(data, '');
  } catch {
    return undefined;
  }
}

export function isValidBase32(secret: string): boolean {
  const cleaned = secret.replace(/\s/g, '').toUpperCase();
  return /^[A-Z2-7]+=*$/.test(cleaned) && cleaned.length > 0;
}

export function normalizeBase32(secret: string): string {
  return secret.replace(/\s/g, '').toUpperCase();
}

export function generateShareableURL(encrypted: EncryptedData): string {
  const encoded = encodeToURL(encrypted);
  return `${window.location.origin}/#/view/${encodeURIComponent(encoded)}`;
}

export function uint8ArrayToBase64(arr: Uint8Array): string {
  let binary = '';
  for (const byte of arr) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
