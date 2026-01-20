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
    await expect(page.getByText('"To Be Deleted"')).toBeVisible();

    await page.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(page.getByText('To Be Deleted')).not.toBeVisible();
  });

  test('should cancel delete operation', async ({ page }) => {
    await saveTotpToBrowser(page, {
      label: 'Keep This',
      passphrase: 'keeppass123',
    });

    await page.getByRole('button', { name: 'More actions' }).first().click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByText('Keep This')).toBeVisible();
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

  test('should update lastUsed timestamp when viewing', async ({ page }) => {
    await saveTotpToBrowser(page, {
      label: 'Timestamp Test',
      passphrase: 'timestamppass123',
    });

    await page.getByRole('button', { name: 'View' }).click();
    await page.locator('#your-passphrase').fill('timestamppass123');
    await page.getByRole('button', { name: 'Unlock' }).click();

    await expect(page.getByRole('button', { name: 'Copy Code' })).toBeVisible();
    await page.getByRole('button', { name: 'Back to List' }).click();

    const sortSelect = page.locator('.w-\\[140px\\]').first();
    await sortSelect.click();
    await page.getByRole('option', { name: 'Recently used' }).click();

    const firstItem = page.locator('.p-4.rounded-lg.border').first();
    await expect(firstItem.getByText('Timestamp Test')).toBeVisible();
  });

  test('should delete multiple TOTPs independently', async ({ page }) => {
    await saveTotpToBrowser(page, {
      label: 'First TOTP',
      passphrase: 'pass123',
    });

    await page.getByRole('button', { name: 'Add New' }).click();
    await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('BBBBCCCCDDDDEEEE');
    await page.getByRole('textbox', { name: 'Label' }).fill('Second TOTP');
    await page.getByRole('textbox', { name: 'Passphrase' }).fill('pass123');
    await page.getByRole('checkbox', { name: 'Save to this browser' }).click();
    await page.getByRole('button', { name: 'Generate TOTP URL' }).click();
    await page.getByRole('button', { name: 'Back to List' }).click();

    const secondItem = page.locator('.p-4.rounded-lg.border').filter({ hasText: 'Second TOTP' });
    await secondItem.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(page.getByText('First TOTP')).toBeVisible();
    await expect(page.getByText('Second TOTP')).not.toBeVisible();
  });
});
