import { test, expect } from '@playwright/test';
import { saveTotpToBrowser, clearStorage } from './helpers';

test.describe('Phase 2 - Save to Browser', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test('should save TOTP with passphrase and display in list', async ({ page }) => {
    await saveTotpToBrowser(page, {
      label: 'GitHub Account',
      passphrase: 'mysecurepass123',
    });

    await expect(page.getByText('GitHub Account')).toBeVisible();
    await expect(page.getByText('Created')).toBeVisible();
  });

  test('should require passphrase when saving to browser', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('offline_banner_dismissed', 'true');
    });
    await page.reload();
    await page.getByRole('button', { name: 'Add New' }).click();

    await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('AAAABBBBCCCCDDDD');
    await page.getByRole('textbox', { name: 'Label' }).fill('Test Account');
    await page.getByRole('textbox', { name: 'Passphrase' }).fill('');
    await page.getByRole('checkbox', { name: 'Save to this browser' }).click();
    await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

    await expect(page.getByText('A passphrase is required when saving to browser')).toBeVisible();
  });

  test('should require label when saving to browser', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('offline_banner_dismissed', 'true');
    });
    await page.reload();
    await page.getByRole('button', { name: 'Add New' }).click();

    await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('AAAABBBBCCCCDDDD');
    await page.getByRole('textbox', { name: 'Passphrase' }).fill('testpassword123');
    await page.getByRole('checkbox', { name: 'Save to this browser' }).click();
    await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

    await expect(page.getByText('A label is required when saving to browser')).toBeVisible();
  });

  test('should save with passphrase hint and display badge', async ({ page }) => {
    await saveTotpToBrowser(page, {
      label: 'AWS Console',
      passphrase: 'awspassphrase123',
      passphraseHint: 'office door code',
    });

    await expect(page.getByText('AWS Console')).toBeVisible();
    await expect(page.getByText('Has hint')).toBeVisible();
  });

  test('should allow creating without saving (Phase 1 behavior)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('offline_banner_dismissed', 'true');
    });
    await page.reload();
    await page.getByRole('button', { name: 'Add New' }).click();

    await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('AAAABBBBCCCCDDDD');
    await page.getByRole('textbox', { name: 'Label' }).fill('Not Saved Account');
    await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

    await expect(page.getByRole('heading', { name: 'URL Generated' })).toBeVisible();
    await page.getByRole('button', { name: 'Back to List' }).click();

    await expect(page.getByText('Not Saved Account')).not.toBeVisible();
  });
});
