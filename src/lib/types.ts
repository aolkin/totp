export type Algorithm = 'SHA1' | 'SHA256' | 'SHA512';

export interface TOTPMetadata {
  s: string; // secret (Base32)
  l?: string; // label (optional)
  d?: number; // digits (optional, default 6)
  p?: number; // period (optional, default 30)
  a?: Algorithm; // algorithm (optional, default SHA1)
}

export interface TOTPConfig {
  secret: string;
  label: string;
  digits: number;
  period: number;
  algorithm: Algorithm;
}

export interface EncryptedData {
  salt: Uint8Array;
  iv: Uint8Array;
  ciphertext: Uint8Array;
}

export interface TOTPRecord {
  id: number;
  label: string;
  created: number;
  lastUsed: number;
  encrypted: EncryptedData;
  passphraseHint?: string;
}

export interface TOTPExport {
  version: number;
  exported: number;
  totps: {
    label: string;
    created: number;
    encrypted: {
      salt: string;
      iv: string;
      ciphertext: string;
    };
    passphraseHint?: string;
  }[];
}

export const DEFAULT_DIGITS = 6;
export const DEFAULT_PERIOD = 30;
export const DEFAULT_ALGORITHM: Algorithm = 'SHA1';
