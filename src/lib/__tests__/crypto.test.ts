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

const defaultConfig: TOTPConfig = {
  secret: 'JBSWY3DPEHPK3PXP',
  label: '',
  digits: 6,
  period: 30,
  algorithm: 'SHA1',
};

describe('Encryption', () => {
  describe('URL encoding/decoding roundtrip', () => {
    it('should encode and decode encrypted data correctly', async () => {
      const config = { ...defaultConfig, label: 'Test Label' };

      const encrypted = await encrypt(config, 'testpassword');
      const encoded = encodeToURL(encrypted);
      const decoded = decodeFromURL(encoded);
      const decrypted = await decrypt(decoded, 'testpassword');

      expect(decrypted.secret).toBe(config.secret);
      expect(decrypted.label).toBe(config.label);
    });

    it('should produce URL-safe Base64 (no +, /, or =)', async () => {
      const encrypted = await encrypt(defaultConfig, 'test');
      const encoded = encodeToURL(encrypted);

      expect(encoded).not.toMatch(/[+/=]/);
    });
  });

  describe('Passphrase handling', () => {
    it('should work with empty passphrase and auto-decrypt', async () => {
      const encrypted = await encrypt(defaultConfig, '');

      expect((await decrypt(encrypted, '')).secret).toBe(defaultConfig.secret);
      expect((await tryDecryptWithEmptyPassphrase(encrypted))?.secret).toBe(defaultConfig.secret);
    });

    it('should return undefined when trying empty passphrase on protected data', async () => {
      const encrypted = await encrypt(defaultConfig, 'secretpassword');

      expect(await tryDecryptWithEmptyPassphrase(encrypted)).toBeUndefined();
    });

    it('should throw error for wrong passphrase', async () => {
      const encrypted = await encrypt(defaultConfig, 'correctpassword');

      await expect(decrypt(encrypted, 'wrongpassword')).rejects.toThrow();
    });
  });

  describe('Config preservation', () => {
    it('should preserve all config values through encryption roundtrip', async () => {
      const config: TOTPConfig = {
        secret: 'ABCDEFGH',
        label: 'MyLabel',
        digits: 8,
        period: 60,
        algorithm: 'SHA256',
      };

      const decrypted = await decrypt(await encrypt(config, 'pass'), 'pass');

      expect(decrypted).toEqual(config);
    });

    it('should apply defaults for standard values', async () => {
      const decrypted = await decrypt(await encrypt(defaultConfig, 'pass'), 'pass');

      expect(decrypted.digits).toBe(6);
      expect(decrypted.period).toBe(30);
      expect(decrypted.algorithm).toBe('SHA1');
    });
  });

  describe('Base32 validation', () => {
    it.each([
      ['JBSWY3DPEHPK3PXP', true],
      ['ABCDEFGHIJKLMNOP', true],
      ['234567', true],
      ['JBSWY3DPEHPK3PXP====', true],
      ['jbswy3dp', true],
      ['JBSW Y3DP EHPK 3PXP', true],
      ['INVALID189', false],
      ['hello!@#', false],
      ['', false],
    ])('isValidBase32("%s") should be %s', (input, expected) => {
      expect(isValidBase32(input)).toBe(expected);
    });

    it('should normalize Base32 by stripping spaces and uppercasing', () => {
      expect(normalizeBase32('JBSW Y3DP EHPK 3PXP')).toBe('JBSWY3DPEHPK3PXP');
    });
  });
});
