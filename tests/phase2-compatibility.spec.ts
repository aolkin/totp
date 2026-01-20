import { test, expect } from '@playwright/test';
import { createTotpUrl, saveTotpToBrowser, clearStorage } from './helpers';

test.describe('Phase 2 - Cross-Mode Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
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

    await page.getByRole('button', { name: 'View Saved TOTPs' }).click();
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
});
