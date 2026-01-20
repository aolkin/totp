import { test, expect } from '@playwright/test';
import { saveTotpToBrowser, clearStorage } from './helpers';

test.describe('Phase 2 - TOTP Management', () => {
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
});
