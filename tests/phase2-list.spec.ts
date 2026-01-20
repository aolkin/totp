import { test, expect } from '@playwright/test';
import { saveTotpToBrowser, clearStorage } from './helpers';

test.describe('Phase 2 - List View and Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test('should display list with multiple saved TOTPs', async ({ page }) => {
    await saveTotpToBrowser(page, {
      label: 'GitHub',
      passphrase: 'githubpass123',
    });

    await page.getByRole('button', { name: 'Add New' }).click();
    await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('BBBBCCCCDDDDEEEE');
    await page.getByRole('textbox', { name: 'Label' }).fill('AWS Console');
    await page.getByRole('textbox', { name: 'Passphrase' }).fill('awspass123');
    await page.getByRole('checkbox', { name: 'Save to this browser' }).click();
    await page.getByRole('button', { name: 'Generate TOTP URL' }).click();
    await page.getByRole('button', { name: 'Back to List' }).click();

    await expect(page.getByText('GitHub')).toBeVisible();
    await expect(page.getByText('AWS Console')).toBeVisible();
  });

  test('should view saved TOTP with passphrase unlock', async ({ page }) => {
    await saveTotpToBrowser(page, {
      label: 'Test Account',
      passphrase: 'testpass123',
    });

    await page.getByRole('button', { name: 'View' }).click();
    await expect(page.getByRole('heading', { name: 'Enter Passphrase' })).toBeVisible();

    await page.getByRole('textbox', { name: 'Enter your passphrase' }).fill('testpass123');
    await page.getByRole('button', { name: 'Unlock' }).click();

    await expect(page.getByRole('button', { name: 'Copy Code' })).toBeVisible();
    await expect(page.getByText('Test Account')).toBeVisible();
  });

  test('should view saved TOTP without passphrase', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('offline_banner_dismissed', 'true');
    });
    await page.reload();
    await page.getByRole('button', { name: 'Add New' }).click();

    await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('AAAABBBBCCCCDDDD');
    await page.getByRole('textbox', { name: 'Label' }).fill('No Pass Account');
    await page.getByRole('textbox', { name: 'Passphrase' }).fill('');
    await page.getByRole('checkbox', { name: 'Save to this browser' }).click();
    await page.getByRole('button', { name: 'Generate TOTP URL' }).click();
    await page.getByRole('button', { name: 'Back to List' }).click();

    await page.getByRole('button', { name: 'View' }).click();
    await expect(page.getByRole('button', { name: 'Copy Code' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Enter Passphrase' })).not.toBeVisible();
  });

  test('should filter TOTPs by search query', async ({ page }) => {
    await saveTotpToBrowser(page, {
      label: 'GitHub Account',
      passphrase: 'pass123',
    });

    await page.getByRole('button', { name: 'Add New' }).click();
    await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('BBBBCCCCDDDDEEEE');
    await page.getByRole('textbox', { name: 'Label' }).fill('AWS Console');
    await page.getByRole('textbox', { name: 'Passphrase' }).fill('pass123');
    await page.getByRole('checkbox', { name: 'Save to this browser' }).click();
    await page.getByRole('button', { name: 'Generate TOTP URL' }).click();
    await page.getByRole('button', { name: 'Back to List' }).click();

    await page.getByRole('textbox', { name: 'Search TOTPs' }).fill('github');
    await expect(page.getByText('GitHub Account')).toBeVisible();
    await expect(page.getByText('AWS Console')).not.toBeVisible();

    await page.getByRole('textbox', { name: 'Search TOTPs' }).fill('');
    await expect(page.getByText('GitHub Account')).toBeVisible();
    await expect(page.getByText('AWS Console')).toBeVisible();
  });

  test('should sort TOTPs by different options', async ({ page }) => {
    await saveTotpToBrowser(page, {
      label: 'Zebra Account',
      passphrase: 'pass123',
    });

    await page.getByRole('button', { name: 'Add New' }).click();
    await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('BBBBCCCCDDDDEEEE');
    await page.getByRole('textbox', { name: 'Label' }).fill('Alpha Account');
    await page.getByRole('textbox', { name: 'Passphrase' }).fill('pass123');
    await page.getByRole('checkbox', { name: 'Save to this browser' }).click();
    await page.getByRole('button', { name: 'Generate TOTP URL' }).click();
    await page.getByRole('button', { name: 'Back to List' }).click();

    const sortSelect = page.locator('.w-\\[140px\\]').first();
    await sortSelect.click();
    await page.getByRole('option', { name: 'Alphabetical' }).click();

    const firstItem = page.locator('.p-4.rounded-lg.border').first();
    await expect(firstItem.getByText('Alpha Account')).toBeVisible();
  });

  test('should navigate between list and create form', async ({ page }) => {
    await saveTotpToBrowser(page, {
      label: 'Test Account',
      passphrase: 'pass123',
    });

    await page.getByRole('button', { name: 'Add New' }).click();
    await expect(page.getByRole('heading', { name: 'Create TOTP URL' })).toBeVisible();

    await page.getByRole('button', { name: 'Back to List' }).click();
    await expect(page.getByRole('heading', { name: 'Saved TOTPs' })).toBeVisible();
  });

  test('should show passphrase hint when viewing TOTP', async ({ page }) => {
    await saveTotpToBrowser(page, {
      label: 'Hinted Account',
      passphrase: 'secretpass123',
      passphraseHint: 'my favorite color',
    });

    await page.getByRole('button', { name: 'View' }).click();
    await expect(page.getByText('my favorite color')).toBeVisible();
  });

  test('should display empty state message when no search results', async ({ page }) => {
    await saveTotpToBrowser(page, {
      label: 'GitHub Account',
      passphrase: 'pass123',
    });

    await page.getByRole('textbox', { name: 'Search TOTPs' }).fill('nonexistent');
    await expect(page.getByText('No TOTPs match your search')).toBeVisible();
  });
});
