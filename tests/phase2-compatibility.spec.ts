import { test, expect } from '@playwright/test';
import { createTotpUrl, saveTotpToBrowser, clearStorage } from './helpers';

test.describe('Phase 2 - Cross-Mode Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test('should handle Phase 1 URLs with saved TOTPs present', async ({ page, context }) => {
    await saveTotpToBrowser(page, {
      label: 'Saved TOTP',
      passphrase: 'savedpassphrase123',
    });

    const { url, passphrase } = await createTotpUrl(page, {
      label: 'Phase 1 TOTP',
      passphrase: 'phase1password123',
    });

    const newPage = await context.newPage();
    await newPage.goto(url);

    await expect(newPage.getByRole('heading', { name: 'Enter Passphrase' })).toBeVisible();
    await newPage.getByPlaceholder('Enter your passphrase').fill(passphrase);
    await newPage.getByRole('button', { name: 'Unlock' }).click();

    await expect(newPage.getByRole('button', { name: 'Copy Code' })).toBeVisible();
    await expect(newPage.getByText('Phase 1 TOTP')).toBeVisible();

    await newPage.close();
  });

  test('should navigate from Phase 1 URL back to saved list', async ({ page }) => {
    await saveTotpToBrowser(page, {
      label: 'List Item',
      passphrase: 'listitempass123',
    });

    const { url } = await createTotpUrl(page, {
      passphrase: '',
    });

    await page.goto(url);
    await expect(page.getByRole('button', { name: 'Copy Code' })).toBeVisible();

    await page.getByRole('button', { name: 'Create New TOTP' }).click();
    await expect(page.getByRole('heading', { name: 'Saved TOTPs' })).toBeVisible();
    await expect(page.getByText('List Item')).toBeVisible();
  });

  test('should display list when no fragment and TOTPs exist', async ({ page }) => {
    await saveTotpToBrowser(page, {
      label: 'Auto List Display',
      passphrase: 'autopassword123',
    });

    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('offline_banner_dismissed', 'true');
    });
    await page.reload();

    await expect(page.getByRole('heading', { name: 'Saved TOTPs' })).toBeVisible();
    await expect(page.getByText('Auto List Display')).toBeVisible();
  });

  test('should preserve Phase 1 URL format when exporting saved TOTP', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    await saveTotpToBrowser(page, {
      label: 'Export Format Test',
      passphrase: 'exportpassword123',
    });

    await page.getByRole('button', { name: 'More actions' }).first().click();
    await page.getByRole('menuitem', { name: 'Export URL' }).click();

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toMatch(/^https?:\/\/.+#[A-Za-z0-9_-]+$/);
  });
});
