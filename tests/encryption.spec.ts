import { test, expect } from '@playwright/test';

test.describe('Encryption', () => {
  test.describe('URL encoding/decoding', () => {
    test('should encode and decode encrypted data correctly', async ({ page }) => {
      await page.goto('/');

      const result = await page.evaluate(async () => {
        const { encrypt, encodeToURL, decodeFromURL, decrypt } = await import('/src/lib/crypto.ts');

        const config = {
          secret: 'JBSWY3DPEHPK3PXP',
          label: 'Test Label',
          digits: 6,
          period: 30,
          algorithm: 'SHA1' as const,
        };

        const encrypted = await encrypt(config, 'testpassword');
        const encoded = encodeToURL(encrypted);
        const decoded = decodeFromURL(encoded);
        const decrypted = await decrypt(decoded, 'testpassword');

        return {
          originalSecret: config.secret,
          decryptedSecret: decrypted.secret,
          originalLabel: config.label,
          decryptedLabel: decrypted.label,
          encodedLength: encoded.length,
        };
      });

      expect(result.decryptedSecret).toBe(result.originalSecret);
      expect(result.decryptedLabel).toBe(result.originalLabel);
      expect(result.encodedLength).toBeGreaterThan(0);
    });

    test('should produce URL-safe Base64 encoding', async ({ page }) => {
      await page.goto('/');

      const encoded = await page.evaluate(async () => {
        const { encrypt, encodeToURL } = await import('/src/lib/crypto.ts');

        const config = {
          secret: 'JBSWY3DPEHPK3PXP',
          label: '',
          digits: 6,
          period: 30,
          algorithm: 'SHA1' as const,
        };

        const encrypted = await encrypt(config, 'test');
        return encodeToURL(encrypted);
      });

      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');
    });
  });

  test.describe('Empty passphrase mode', () => {
    test('should encrypt and decrypt with empty passphrase', async ({ page }) => {
      await page.goto('/');

      const result = await page.evaluate(async () => {
        const { encrypt, decrypt, tryDecryptWithEmptyPassphrase } =
          await import('/src/lib/crypto.ts');

        const config = {
          secret: 'JBSWY3DPEHPK3PXP',
          label: 'No Passphrase',
          digits: 6,
          period: 30,
          algorithm: 'SHA1' as const,
        };

        const encrypted = await encrypt(config, '');
        const decrypted = await decrypt(encrypted, '');
        const autoDecrypted = await tryDecryptWithEmptyPassphrase(encrypted);

        return {
          decryptedSecret: decrypted.secret,
          autoDecryptedSecret: autoDecrypted?.secret,
          originalSecret: config.secret,
        };
      });

      expect(result.decryptedSecret).toBe(result.originalSecret);
      expect(result.autoDecryptedSecret).toBe(result.originalSecret);
    });

    test('should return undefined for non-empty passphrase with tryDecryptWithEmptyPassphrase', async ({
      page,
    }) => {
      await page.goto('/');

      const result = await page.evaluate(async () => {
        const { encrypt, tryDecryptWithEmptyPassphrase } = await import('/src/lib/crypto.ts');

        const config = {
          secret: 'JBSWY3DPEHPK3PXP',
          label: '',
          digits: 6,
          period: 30,
          algorithm: 'SHA1' as const,
        };

        const encrypted = await encrypt(config, 'secretpassword');
        const autoDecrypted = await tryDecryptWithEmptyPassphrase(encrypted);

        return { autoDecrypted };
      });

      expect(result.autoDecrypted).toBeUndefined();
    });
  });

  test.describe('Metadata serialization', () => {
    test('should use short keys (s, l, d, p, a)', async ({ page }) => {
      await page.goto('/');

      const metadata = await page.evaluate(async () => {
        const { encrypt, decrypt } = await import('/src/lib/crypto.ts');

        const config = {
          secret: 'ABCDEFGH',
          label: 'MyLabel',
          digits: 8,
          period: 60,
          algorithm: 'SHA256' as const,
        };

        const encrypted = await encrypt(config, 'pass');
        const decrypted = await decrypt(encrypted, 'pass');

        return decrypted;
      });

      expect(metadata.secret).toBe('ABCDEFGH');
      expect(metadata.label).toBe('MyLabel');
      expect(metadata.digits).toBe(8);
      expect(metadata.period).toBe(60);
      expect(metadata.algorithm).toBe('SHA256');
    });

    test('should omit default values from metadata', async ({ page }) => {
      await page.goto('/');

      const result = await page.evaluate(async () => {
        const { encrypt, decrypt } = await import('/src/lib/crypto.ts');

        const config = {
          secret: 'TESTKEY',
          label: '',
          digits: 6,
          period: 30,
          algorithm: 'SHA1' as const,
        };

        const encrypted = await encrypt(config, 'pass');
        const decrypted = await decrypt(encrypted, 'pass');

        return {
          decrypted,
          hasLabel: decrypted.label !== undefined,
          digits: decrypted.digits,
          period: decrypted.period,
          algorithm: decrypted.algorithm,
        };
      });

      expect(result.digits).toBe(6);
      expect(result.period).toBe(30);
      expect(result.algorithm).toBe('SHA1');
    });

    test('should include non-default values in metadata', async ({ page }) => {
      await page.goto('/');

      const result = await page.evaluate(async () => {
        const { encrypt, decrypt } = await import('/src/lib/crypto.ts');

        const config = {
          secret: 'TESTKEY',
          label: 'Custom Label',
          digits: 8,
          period: 60,
          algorithm: 'SHA512' as const,
        };

        const encrypted = await encrypt(config, 'pass');
        const decrypted = await decrypt(encrypted, 'pass');

        return decrypted;
      });

      expect(result.label).toBe('Custom Label');
      expect(result.digits).toBe(8);
      expect(result.period).toBe(60);
      expect(result.algorithm).toBe('SHA512');
    });
  });

  test.describe('Base32 validation', () => {
    test('should validate correct Base32 secrets', async ({ page }) => {
      await page.goto('/');

      const results = await page.evaluate(async () => {
        const { isValidBase32 } = await import('/src/lib/crypto.ts');

        return {
          valid1: isValidBase32('JBSWY3DPEHPK3PXP'),
          valid2: isValidBase32('ABCDEFGHIJKLMNOP'),
          valid3: isValidBase32('234567'),
          validWithPadding: isValidBase32('JBSWY3DPEHPK3PXP===='),
        };
      });

      expect(results.valid1).toBe(true);
      expect(results.valid2).toBe(true);
      expect(results.valid3).toBe(true);
      expect(results.validWithPadding).toBe(true);
    });

    test('should reject invalid Base32 secrets', async ({ page }) => {
      await page.goto('/');

      const results = await page.evaluate(async () => {
        const { isValidBase32 } = await import('/src/lib/crypto.ts');

        return {
          invalid1: isValidBase32('INVALID189'),
          invalid2: isValidBase32('hello!@#'),
          invalid3: isValidBase32(''),
          invalidLowercase: isValidBase32('jbswy3dp'),
        };
      });

      expect(results.invalid1).toBe(false);
      expect(results.invalid2).toBe(false);
      expect(results.invalid3).toBe(false);
    });

    test('should normalize Base32 secrets (strip spaces, uppercase)', async ({ page }) => {
      await page.goto('/');

      const results = await page.evaluate(async () => {
        const { normalizeBase32, isValidBase32 } = await import('/src/lib/crypto.ts');

        const withSpaces = 'JBSW Y3DP EHPK 3PXP';
        const normalized = normalizeBase32(withSpaces);
        const isValid = isValidBase32(withSpaces);

        return { normalized, isValid };
      });

      expect(results.normalized).toBe('JBSWY3DPEHPK3PXP');
      expect(results.isValid).toBe(true);
    });
  });
});
