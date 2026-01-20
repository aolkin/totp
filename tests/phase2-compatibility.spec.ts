import { test, expect } from '@playwright/test';
import { createTotpUrl, saveTotpToBrowser, clearStorage } from './helpers';

test.describe('Phase 2 - Cross-Mode Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test('should handle Phase 1 URLs with saved TOTPs present', async ({ page, context }) => {
    await saveTotpToBrowser(page, {
      label: 'Saved TOTP',
      passphrase: 'savedpass123',
    });

    const { url, passphrase } = await createTotpUrl(page, {
      label: 'Phase 1 TOTP',
      passphrase: 'phase1pass123',
    });

    const newPage = await context.newPage();
    await newPage.goto(url);

    await expect(newPage.getByRole('heading', { name: 'Enter Passphrase' })).toBeVisible();
    await newPage.getByRole('textbox', { name: 'Enter your passphrase' }).fill(passphrase);
    await newPage.getByRole('button', { name: 'Unlock' }).click();

    await expect(newPage.getByRole('button', { name: 'Copy Code' })).toBeVisible();
    await expect(newPage.getByText('Phase 1 TOTP')).toBeVisible();

    await newPage.close();
  });

  test('should allow saving existing Phase 1 URL to browser', async ({ page }) => {
    const { url } = await createTotpUrl(page, {
      label: 'Convert to Saved',
      passphrase: '',
    });

    await page.goto(url);
    await expect(page.getByRole('button', { name: 'Copy Code' })).toBeVisible();

    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('offline_banner_dismissed', 'true');
    });
    await page.reload();

    await page.getByRole('button', { name: 'Add New' }).click();
    await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('CCCCDDDDEEEEFFFFF');
    await page.getByRole('textbox', { name: 'Label' }).fill('Manual Save Test');
    await page.locator('#passphrase').fill('newsavepass123');
    await page.getByRole('checkbox', { name: 'Save to this browser' }).click();
    await page.getByRole('button', { name: 'Generate TOTP URL' }).click();
    await page.getByRole('button', { name: 'Back to List' }).click();

    await expect(page.getByText('Manual Save Test')).toBeVisible();
  });

  test('should navigate from Phase 1 URL back to saved list', async ({ page }) => {
    await saveTotpToBrowser(page, {
      label: 'List Item',
      passphrase: 'listpass123',
    });

    const { url } = await createTotpUrl(page, {
      passphrase: '',
    });

    await page.goto(url);
    await expect(page.getByRole('button', { name: 'Copy Code' })).toBeVisible();

    await page.getByRole('button', { name: 'Back to List' }).click();
    await expect(page.getByRole('heading', { name: 'Saved TOTPs' })).toBeVisible();
    await expect(page.getByText('List Item')).toBeVisible();
  });

  test('should display list when no fragment and TOTPs exist', async ({ page }) => {
    await saveTotpToBrowser(page, {
      label: 'Auto List Display',
      passphrase: 'autopass123',
    });

    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('offline_banner_dismissed', 'true');
    });
    await page.reload();

    await expect(page.getByRole('heading', { name: 'Saved TOTPs' })).toBeVisible();
    await expect(page.getByText('Auto List Display')).toBeVisible();
  });

  test('should allow mixing saved and URL-based TOTPs in same session', async ({ page }) => {
    await saveTotpToBrowser(page, {
      label: 'Saved in Browser',
      passphrase: 'savedpass123',
    });

    const { url } = await createTotpUrl(page, {
      label: 'URL Only',
      passphrase: 'urlpass123',
    });

    await page.goto(url);
    await page.getByRole('textbox', { name: 'Enter your passphrase' }).fill('urlpass123');
    await page.getByRole('button', { name: 'Unlock' }).click();
    await expect(page.getByText('URL Only')).toBeVisible();

    await page.getByRole('button', { name: 'Back to List' }).click();
    await expect(page.getByText('Saved in Browser')).toBeVisible();

    await page.getByRole('button', { name: 'View' }).click();
    await page.getByRole('textbox', { name: 'Enter your passphrase' }).fill('savedpass123');
    await page.getByRole('button', { name: 'Unlock' }).click();
    await expect(page.getByText('Saved in Browser')).toBeVisible();
  });

  test('should preserve Phase 1 URL format when exporting saved TOTP', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    await saveTotpToBrowser(page, {
      label: 'Export Format Test',
      passphrase: 'exportpass123',
    });

    await page.getByRole('button', { name: 'More actions' }).first().click();
    await page.getByRole('menuitem', { name: 'Export URL' }).click();

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toMatch(/^https?:\/\/.+#[A-Za-z0-9_-]+$/);
  });
});
