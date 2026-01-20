import { test, expect } from '@playwright/test';
import { saveTotpToBrowser, clearStorage } from './helpers';

test.describe('Phase 2 - List View and Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test('should display and search saved TOTPs', async ({ page }) => {
    await saveTotpToBrowser(page, {
      label: 'GitHub Account',
      passphrase: 'githubpass123',
    });

    await page.getByRole('button', { name: 'Add New' }).click();
    await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('BBBBCCCCDDDDEEEE');
    await page.getByRole('textbox', { name: 'Label' }).fill('AWS Console');
    await page.locator('#passphrase').fill('awspassword123');
    await page.getByRole('checkbox', { name: 'Save to this browser' }).click();
    await page.getByRole('button', { name: 'Generate TOTP URL' }).click();
    await page.getByRole('button', { name: 'View Saved TOTPs' }).click();

    await expect(page.getByText('GitHub Account')).toBeVisible();
    await expect(page.getByText('AWS Console')).toBeVisible();

    await page.getByRole('textbox', { name: 'Search TOTPs' }).fill('github');
    await expect(page.getByText('GitHub Account')).toBeVisible();
    await expect(page.getByText('AWS Console')).not.toBeVisible();

    await page.getByRole('textbox', { name: 'Search TOTPs' }).fill('');
    await expect(page.getByText('GitHub Account')).toBeVisible();
    await expect(page.getByText('AWS Console')).toBeVisible();
  });

  test('should view saved TOTP with passphrase unlock', async ({ page }) => {
    await saveTotpToBrowser(page, {
      label: 'Test Account',
      passphrase: 'testpassphrase123',
    });

    await page.getByRole('button', { name: 'View' }).click();
    await expect(page.getByRole('heading', { name: 'Enter Passphrase' })).toBeVisible();

    await page.getByPlaceholder('Enter your passphrase').fill('testpassphrase123');
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
    await page.getByRole('checkbox', { name: 'Save to this browser' }).click();

    await page.locator('#passphrase-hint').fill('no passphrase needed');
    await page.locator('#passphrase').clear();

    await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

    await expect(page.getByText('A passphrase is required when saving to browser')).toBeVisible();
  });

  test('should sort TOTPs alphabetically', async ({ page }) => {
    await saveTotpToBrowser(page, {
      label: 'Zebra Account',
      passphrase: 'zebrapassword123',
    });

    await page.getByRole('button', { name: 'Add New' }).click();
    await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('BBBBCCCCDDDDEEEE');
    await page.getByRole('textbox', { name: 'Label' }).fill('Alpha Account');
    await page.locator('#passphrase').fill('alphapassword123');
    await page.getByRole('checkbox', { name: 'Save to this browser' }).click();
    await page.getByRole('button', { name: 'Generate TOTP URL' }).click();
    await page.getByRole('button', { name: 'View Saved TOTPs' }).click();

    const sortSelect = page.locator('.w-\\[140px\\]').first();
    await sortSelect.click();
    await page.getByRole('option', { name: 'Alphabetical' }).click();

    const firstItem = page.locator('.p-4.rounded-lg.border').first();
    await expect(firstItem.getByText('Alpha Account')).toBeVisible();
  });

  test('should display passphrase hint when viewing TOTP', async ({ page }) => {
    await saveTotpToBrowser(page, {
      label: 'Hinted Account',
      passphrase: 'secretpassword123',
      passphraseHint: 'my favorite color',
    });

    await page.getByRole('button', { name: 'View' }).click();
    await expect(page.getByText('my favorite color')).toBeVisible();
  });
});
