import { test, expect } from '@playwright/test';
import { saveTotpToBrowser, clearStorage } from './helpers';
import type { TOTPExport } from '../src/lib/types';

test.describe('Phase 2 - TOTP Operations', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test('should delete TOTP with confirmation dialog', async ({ page }) => {
    await saveTotpToBrowser(page, {
      label: 'To Be Deleted',
      passphrase: 'deletepass123',
    });

    await page.getByRole('button', { name: 'More actions' }).first().click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();

    await expect(page.getByRole('heading', { name: 'Delete TOTP?' })).toBeVisible();
    await expect(page.getByText('Are you sure you want to delete')).toBeVisible();

    await page.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Saved TOTPs' })).toBeVisible();
    const listItem = page.locator('.p-4.rounded-lg.border');
    await expect(listItem).not.toBeVisible();
  });

  test('should export single TOTP as URL', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    await saveTotpToBrowser(page, {
      label: 'Export Test',
      passphrase: 'exportpass123',
    });

    await page.getByRole('button', { name: 'More actions' }).first().click();
    await page.getByRole('menuitem', { name: 'Export URL' }).click();

    await expect(page.getByText('URL copied to clipboard')).toBeVisible();

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain(new URL(page.url()).origin);
    expect(clipboardText).toContain('#');
  });

  test('should view saved TOTP and return to list', async ({ page }) => {
    await saveTotpToBrowser(page, {
      label: 'View Test',
      passphrase: 'viewpassword123',
    });

    await page.getByRole('button', { name: 'View' }).click();
    await page.getByPlaceholder('Enter your passphrase').fill('viewpassword123');
    await page.getByRole('button', { name: 'Unlock' }).click();

    await expect(page.getByRole('button', { name: 'Copy Code' })).toBeVisible();
    await expect(page.getByText('View Test')).toBeVisible();
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
