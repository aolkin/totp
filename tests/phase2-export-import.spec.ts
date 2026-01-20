import { test, expect } from '@playwright/test';
import { saveTotpToBrowser, clearStorage } from './helpers';
import type { TOTPExport } from '../src/lib/types';

test.describe('Phase 2 - Export and Import', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test('should export all TOTPs as JSON backup', async ({ page }) => {
    await saveTotpToBrowser(page, {
      label: 'Export Test 1',
      passphrase: 'exportpassword123',
    });

    await page.getByRole('button', { name: 'Add New' }).click();
    await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('BBBBCCCCDDDDEEEE');
    await page.getByRole('textbox', { name: 'Label' }).fill('Export Test 2');
    await page.locator('#passphrase').fill('exportpassword456');
    await page.getByRole('checkbox', { name: 'Save to this browser' }).click();
    await page.getByRole('button', { name: 'Generate TOTP URL' }).click();
    await page.getByRole('button', { name: 'View Saved TOTPs' }).click();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export All' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^totp-backup-\d{4}-\d{2}-\d{2}\.json$/);

    const path = await download.path();
    expect(path).toBeTruthy();
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

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import' }).click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles({
      name: 'test-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(exportData)),
    });

    await expect(page.getByText('Imported 2 TOTPs')).toBeVisible();
    await expect(page.getByText('Existing TOTP')).toBeVisible();
    await expect(page.getByText('Imported TOTP 1')).toBeVisible();
    await expect(page.getByText('Imported TOTP 2')).toBeVisible();
    await expect(page.getByText('Has hint')).toBeVisible();
  });
});
