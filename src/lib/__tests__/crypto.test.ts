/**
 * Crypto unit tests focus on our encryption/decryption logic,
 * not on testing underlying crypto libraries (Web Crypto API).
 */
import { describe, it, expect } from 'vitest';
import {
  encrypt,
  decrypt,
  encodeToURL,
  decodeFromURL,
  tryDecryptWithEmptyPassphrase,
} from '../crypto';
import type { TOTPConfig } from '../types';

describe('Encryption', () => {
  it('should preserve all config values through full encrypt/encode/decode/decrypt roundtrip', async () => {
    const config: TOTPConfig = {
      secret: 'ABCDEFGH',
      label: 'MyLabel',
      digits: 8,
      period: 60,
      algorithm: 'SHA256',
    };

    const encrypted = await encrypt(config, 'testpassword');
    const encoded = encodeToURL(encrypted);

    // URL-safe Base64 should not contain +, /, or =
    expect(encoded).not.toMatch(/[+/=]/);

    const decoded = decodeFromURL(encoded);
    const decrypted = await decrypt(decoded, 'testpassword');

    expect(decrypted).toEqual(config);
  });

  describe('Passphrase handling', () => {
    it('should work with empty passphrase and auto-decrypt', async () => {
      const config: TOTPConfig = {
        secret: 'JBSWY3DPEHPK3PXP',
        label: '',
        digits: 6,
        period: 30,
        algorithm: 'SHA1',
      };
      const encrypted = await encrypt(config, '');

      expect((await decrypt(encrypted, '')).secret).toBe(config.secret);
      expect((await tryDecryptWithEmptyPassphrase(encrypted))?.secret).toBe(config.secret);
    });

    it('should return undefined when trying empty passphrase on protected data', async () => {
      const config: TOTPConfig = {
        secret: 'JBSWY3DPEHPK3PXP',
        label: '',
        digits: 6,
        period: 30,
        algorithm: 'SHA1',
      };
      const encrypted = await encrypt(config, 'secretpassword');

      expect(await tryDecryptWithEmptyPassphrase(encrypted)).toBeUndefined();
    });

    it('should throw error for wrong passphrase', async () => {
      const config: TOTPConfig = {
        secret: 'JBSWY3DPEHPK3PXP',
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
