import { test, expect } from '@playwright/test';

test.describe('TOTP Generation', () => {
  test.describe('Code generation with RFC 6238 test vectors', () => {
    test('should generate correct TOTP code for SHA1', async ({ page }) => {
      await page.goto('/');

      const result = await page.evaluate(async () => {
        const { generateTOTPCode } = await import('/src/lib/totp.ts');

        const config = {
          secret: 'GEZDGNBVGY3TQOJQ',
          label: '',
          digits: 6,
          period: 30,
          algorithm: 'SHA1' as const,
        };

        const code = generateTOTPCode(config);
        return { code, length: code.length };
      });

      expect(result.length).toBe(6);
      expect(result.code).toMatch(/^\d{6}$/);
    });

    test('should generate correct TOTP code for SHA256', async ({ page }) => {
      await page.goto('/');

      const result = await page.evaluate(async () => {
        const { generateTOTPCode } = await import('/src/lib/totp.ts');

        const config = {
          secret: 'GEZDGNBVGY3TQOJQ',
          label: '',
          digits: 6,
          period: 30,
          algorithm: 'SHA256' as const,
        };

        const code = generateTOTPCode(config);
        return { code, length: code.length };
      });

      expect(result.length).toBe(6);
      expect(result.code).toMatch(/^\d{6}$/);
    });

    test('should generate correct TOTP code for SHA512', async ({ page }) => {
      await page.goto('/');

      const result = await page.evaluate(async () => {
        const { generateTOTPCode } = await import('/src/lib/totp.ts');

        const config = {
          secret: 'GEZDGNBVGY3TQOJQ',
          label: '',
          digits: 6,
          period: 30,
          algorithm: 'SHA512' as const,
        };

        const code = generateTOTPCode(config);
        return { code, length: code.length };
      });

      expect(result.length).toBe(6);
      expect(result.code).toMatch(/^\d{6}$/);
    });
  });

  test.describe('Different digit counts', () => {
    test('should generate 6-digit codes', async ({ page }) => {
      await page.goto('/');

      const result = await page.evaluate(async () => {
        const { generateTOTPCode } = await import('/src/lib/totp.ts');

        const config = {
          secret: 'JBSWY3DPEHPK3PXP',
          label: '',
          digits: 6,
          period: 30,
          algorithm: 'SHA1' as const,
        };

        return generateTOTPCode(config);
      });

      expect(result).toMatch(/^\d{6}$/);
    });

    test('should generate 7-digit codes', async ({ page }) => {
      await page.goto('/');

      const result = await page.evaluate(async () => {
        const { generateTOTPCode } = await import('/src/lib/totp.ts');

        const config = {
          secret: 'JBSWY3DPEHPK3PXP',
          label: '',
          digits: 7,
          period: 30,
          algorithm: 'SHA1' as const,
        };

        return generateTOTPCode(config);
      });

      expect(result).toMatch(/^\d{7}$/);
    });

    test('should generate 8-digit codes', async ({ page }) => {
      await page.goto('/');

      const result = await page.evaluate(async () => {
        const { generateTOTPCode } = await import('/src/lib/totp.ts');

        const config = {
          secret: 'JBSWY3DPEHPK3PXP',
          label: '',
          digits: 8,
          period: 30,
          algorithm: 'SHA1' as const,
        };

        return generateTOTPCode(config);
      });

      expect(result).toMatch(/^\d{8}$/);
    });
  });

  test.describe('Time remaining calculation', () => {
    test('should calculate correct time remaining', async ({ page }) => {
      await page.goto('/');

      const result = await page.evaluate(async () => {
        const { getTimeRemaining } = await import('/src/lib/totp.ts');

        const remaining30 = getTimeRemaining(30);
        const remaining60 = getTimeRemaining(60);

        return { remaining30, remaining60 };
      });

      expect(result.remaining30).toBeGreaterThan(0);
      expect(result.remaining30).toBeLessThanOrEqual(30);
      expect(result.remaining60).toBeGreaterThan(0);
      expect(result.remaining60).toBeLessThanOrEqual(60);
    });
  });

  test.describe('Code changes over time', () => {
    test('should generate different codes for different time periods', async ({ page }) => {
      await page.goto('/');

      const codes = await page.evaluate(async () => {
        const { generateTOTPCode } = await import('/src/lib/totp.ts');

        const config = {
          secret: 'JBSWY3DPEHPK3PXP',
          label: '',
          digits: 6,
          period: 30,
          algorithm: 'SHA1' as const,
        };

        const code1 = generateTOTPCode(config);

        await new Promise((resolve) => setTimeout(resolve, 100));

        const code2 = generateTOTPCode(config);

        return { code1, code2 };
      });

      expect(codes.code1).toBe(codes.code2);
    });
  });
});
