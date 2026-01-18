import { describe, it, expect } from 'vitest';
import {
  encrypt,
  decrypt,
  encodeToURL,
  decodeFromURL,
  tryDecryptWithEmptyPassphrase,
  isValidBase32,
  normalizeBase32,
} from '../crypto';
import type { TOTPConfig } from '../types';

describe('Encryption', () => {
  describe('URL encoding/decoding', () => {
    it('should encode and decode encrypted data correctly', async () => {
      const config: TOTPConfig = {
        secret: 'JBSWY3DPEHPK3PXP',
        label: 'Test Label',
        digits: 6,
        period: 30,
        algorithm: 'SHA1',
      };

      const encrypted = await encrypt(config, 'testpassword');
      const encoded = encodeToURL(encrypted);
      const decoded = decodeFromURL(encoded);
      const decrypted = await decrypt(decoded, 'testpassword');

      expect(decrypted.secret).toBe(config.secret);
      expect(decrypted.label).toBe(config.label);
      expect(encoded.length).toBeGreaterThan(0);
    });

    it('should produce URL-safe Base64 encoding', async () => {
      const config: TOTPConfig = {
        secret: 'JBSWY3DPEHPK3PXP',
        label: '',
        digits: 6,
        period: 30,
        algorithm: 'SHA1',
      };

      const encrypted = await encrypt(config, 'test');
      const encoded = encodeToURL(encrypted);

      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');
    });
  });

  describe('Empty passphrase mode', () => {
    it('should encrypt and decrypt with empty passphrase', async () => {
      const config: TOTPConfig = {
        secret: 'JBSWY3DPEHPK3PXP',
        label: 'No Passphrase',
        digits: 6,
        period: 30,
        algorithm: 'SHA1',
      };

      const encrypted = await encrypt(config, '');
      const decrypted = await decrypt(encrypted, '');
      const autoDecrypted = await tryDecryptWithEmptyPassphrase(encrypted);

      expect(decrypted.secret).toBe(config.secret);
      expect(autoDecrypted?.secret).toBe(config.secret);
    });

    it('should return undefined for non-empty passphrase with tryDecryptWithEmptyPassphrase', async () => {
      const config: TOTPConfig = {
        secret: 'JBSWY3DPEHPK3PXP',
        label: '',
        digits: 6,
        period: 30,
        algorithm: 'SHA1',
      };

      const encrypted = await encrypt(config, 'secretpassword');
      const autoDecrypted = await tryDecryptWithEmptyPassphrase(encrypted);

      expect(autoDecrypted).toBeUndefined();
    });
  });

  describe('Metadata serialization', () => {
    it('should preserve all config values through encryption roundtrip', async () => {
      const config: TOTPConfig = {
        secret: 'ABCDEFGH',
        label: 'MyLabel',
        digits: 8,
        period: 60,
        algorithm: 'SHA256',
      };

      const encrypted = await encrypt(config, 'pass');
      const decrypted = await decrypt(encrypted, 'pass');

      expect(decrypted.secret).toBe('ABCDEFGH');
      expect(decrypted.label).toBe('MyLabel');
      expect(decrypted.digits).toBe(8);
      expect(decrypted.period).toBe(60);
      expect(decrypted.algorithm).toBe('SHA256');
    });

    it('should use default values when not specified', async () => {
      const config: TOTPConfig = {
        secret: 'TESTKEY',
        label: '',
        digits: 6,
        period: 30,
        algorithm: 'SHA1',
      };

      const encrypted = await encrypt(config, 'pass');
      const decrypted = await decrypt(encrypted, 'pass');

      expect(decrypted.digits).toBe(6);
      expect(decrypted.period).toBe(30);
      expect(decrypted.algorithm).toBe('SHA1');
    });

    it('should preserve non-default values', async () => {
      const config: TOTPConfig = {
        secret: 'TESTKEY',
        label: 'Custom Label',
        digits: 8,
        period: 60,
        algorithm: 'SHA512',
      };

      const encrypted = await encrypt(config, 'pass');
      const decrypted = await decrypt(encrypted, 'pass');

      expect(decrypted.label).toBe('Custom Label');
      expect(decrypted.digits).toBe(8);
      expect(decrypted.period).toBe(60);
      expect(decrypted.algorithm).toBe('SHA512');
    });
  });

  describe('Base32 validation', () => {
    it('should validate correct Base32 secrets', () => {
      expect(isValidBase32('JBSWY3DPEHPK3PXP')).toBe(true);
      expect(isValidBase32('ABCDEFGHIJKLMNOP')).toBe(true);
      expect(isValidBase32('234567')).toBe(true);
      expect(isValidBase32('JBSWY3DPEHPK3PXP====')).toBe(true);
    });

    it('should reject invalid Base32 secrets', () => {
      expect(isValidBase32('INVALID189')).toBe(false);
      expect(isValidBase32('hello!@#')).toBe(false);
      expect(isValidBase32('')).toBe(false);
    });

    it('should accept lowercase and convert to uppercase', () => {
      expect(isValidBase32('jbswy3dp')).toBe(true);
    });

    it('should normalize Base32 secrets (strip spaces, uppercase)', () => {
      const withSpaces = 'JBSW Y3DP EHPK 3PXP';
      const normalized = normalizeBase32(withSpaces);

      expect(normalized).toBe('JBSWY3DPEHPK3PXP');
      expect(isValidBase32(withSpaces)).toBe(true);
    });
  });

  describe('Decryption failures', () => {
    it('should throw error for wrong passphrase', async () => {
      const config: TOTPConfig = {
        secret: 'TESTKEY',
        label: '',
        digits: 6,
        period: 30,
        algorithm: 'SHA1',
      };

      const encrypted = await encrypt(config, 'correctpassword');

      await expect(decrypt(encrypted, 'wrongpassword')).rejects.toThrow();
    });
  });
});
