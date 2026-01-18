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

export const DEFAULT_DIGITS = 6;
export const DEFAULT_PERIOD = 30;
export const DEFAULT_ALGORITHM: Algorithm = 'SHA1';
