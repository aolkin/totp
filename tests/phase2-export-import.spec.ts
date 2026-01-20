import { test, expect } from '@playwright/test';
import { saveTotpToBrowser, clearStorage } from './helpers';
import type { TOTPExport } from '../src/lib/types';

test.describe('Phase 2 - Import', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test('should import JSON backup and verify additive merge', async ({ page }) => {
    await saveTotpToBrowser(page, {
      label: 'Existing TOTP',
      passphrase: 'existingpass123',
    });

    const exportData: TOTPExport = {
      version: 1,
      exported: Date.now(),
      totps: [
        {
          label: 'Imported TOTP 1',
          created: Date.now() - 86400000,
          encrypted: {
            salt: 'dGVzdHNhbHQxMjM0NTY3OA==',
            iv: 'dGVzdGl2MTIzNDU2',
            ciphertext:
              'dGVzdGNpcGhlcnRleHQxMjM0NTY3ODkwYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY3ODkw',
          },
          passphraseHint: 'test hint',
        },
        {
          label: 'Imported TOTP 2',
          created: Date.now(),
          encrypted: {
            salt: 'dGVzdHNhbHQyMjM0NTY3OA==',
            iv: 'dGVzdGl2MjIzNDU2',
            ciphertext:
              'dGVzdGNpcGhlcnRleHQyMjM0NTY3ODkwYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY3ODkw',
          },
        },
      ],
    };

    const jsonString = JSON.stringify(exportData);
    // @ts-expect-error - Buffer is available in Node.js runtime
    const buffer = Buffer.from(jsonString);

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import' }).click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles({
      name: 'test-backup.json',
      mimeType: 'application/json',
      buffer,
    });

    await expect(page.getByText('Imported 2 TOTPs')).toBeVisible();
    await expect(page.getByText('Existing TOTP')).toBeVisible();
    await expect(page.getByText('Imported TOTP 1')).toBeVisible();
    await expect(page.getByText('Imported TOTP 2')).toBeVisible();
    await expect(page.getByText('Has hint')).toBeVisible();
  });
});
