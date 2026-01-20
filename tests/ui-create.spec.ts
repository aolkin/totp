import { test, expect } from '@playwright/test';

test.describe('UI - Create Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/');
    // Dismiss the offline banner if visible (it can block clicks)
    await page.evaluate(() => {
      localStorage.setItem('offline_banner_dismissed', 'true');
    });
    await page.reload();
    // App now starts in list mode, click Add New to get to create form
    await page.getByRole('button', { name: 'Add New' }).click();
  });

  test.describe('Form validation', () => {
    test('should validate secret input', async ({ page }) => {
      // Empty secret
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();
      await expect(page.getByText('Please enter a TOTP secret')).toBeVisible();

      // Invalid Base32
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('INVALID189!@#');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();
      await expect(page.getByText('Invalid format')).toBeVisible();

      // Valid Base32 (with spaces - should be normalized)
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('AAAA BBBB CCCC DDDD');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();
      await expect(page.getByRole('heading', { name: 'URL Generated' })).toBeVisible();
    });

    test('should validate passphrase length', async ({ page }) => {
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('AAAABBBBCCCCDDDD');
      await page.getByRole('textbox', { name: 'Passphrase' }).fill('short');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      await expect(page.getByText('at least 12 characters')).toBeVisible();
    });
  });

  test.describe('Passphrase', () => {
    test('should auto-generate 5-word passphrase and allow regeneration', async ({ page }) => {
      const initial = await page.getByRole('textbox', { name: 'Passphrase' }).inputValue();
      expect(initial.split('-').length).toBe(5);

      await expect(page.getByText('Auto-generated passphrase')).toBeVisible();

      await page.getByRole('button', { name: 'Regenerate' }).click();
      const regenerated = await page.getByRole('textbox', { name: 'Passphrase' }).inputValue();

      expect(regenerated).not.toBe(initial);
      expect(regenerated.split('-').length).toBe(5);
    });

    test('should show strength meter for custom passphrase', async ({ page }) => {
      await page.getByRole('textbox', { name: 'Passphrase' }).fill('mycustompassphrase123');

      await expect(page.getByText('Strength:')).toBeVisible();
    });
  });

  test.describe('Advanced options', () => {
    test('should toggle and allow changing advanced settings', async ({ page }) => {
      await page.getByRole('button', { name: 'Show Advanced Options' }).click();

      await expect(page.getByRole('combobox', { name: 'Digits' })).toBeVisible();
      await expect(page.getByRole('spinbutton', { name: 'Period' })).toBeVisible();
      await expect(page.getByRole('combobox', { name: 'Algorithm' })).toBeVisible();

      await page.getByRole('combobox', { name: 'Digits' }).selectOption('8');
      await page.getByRole('combobox', { name: 'Algorithm' }).selectOption('SHA256');
      await page.getByRole('spinbutton', { name: 'Period' }).fill('60');

      expect(await page.getByRole('combobox', { name: 'Digits' }).inputValue()).toBe('8');
      expect(await page.getByRole('combobox', { name: 'Algorithm' }).inputValue()).toBe('SHA256');
      expect(await page.getByRole('spinbutton', { name: 'Period' }).inputValue()).toBe('60');

      await page.getByRole('button', { name: 'Hide Advanced Options' }).click();

      await expect(page.getByRole('combobox', { name: 'Digits' })).not.toBeVisible();
    });
  });

  test.describe('URL generation result', () => {
    test('should show generated URL with passphrase', async ({ page }) => {
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('AAAABBBBCCCCDDDD');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      await expect(page.getByRole('heading', { name: 'URL Generated' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Generated TOTP URL' })).toBeVisible();
      await expect(page.getByText('Passphrase:')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible();
    });

    test('should show warning when no passphrase', async ({ page }) => {
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('AAAABBBBCCCCDDDD');
      await page.getByRole('textbox', { name: 'Passphrase' }).fill('');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      await expect(page.getByText('Anyone with this URL can access')).toBeVisible();
    });

    test('should allow creating another TOTP', async ({ page }) => {
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('AAAABBBBCCCCDDDD');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();
      await page.getByRole('button', { name: 'View Saved TOTPs' }).click();
      await page.getByRole('button', { name: 'Add New' }).click();

      await expect(page.getByRole('heading', { name: 'Create TOTP URL' })).toBeVisible();
    });
  });

  test.describe('URL length optimization', () => {
    test('should generate shorter URL with default options', async ({ page }) => {
      // Default options
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('AAAABBBBCCCCDDDD');
      await page.getByRole('textbox', { name: 'Passphrase' }).fill('testpassphrase12');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      const defaultUrl = await page
        .getByRole('textbox', { name: 'Generated TOTP URL' })
        .inputValue();

      // Custom options
      await page.getByRole('button', { name: 'View Saved TOTPs' }).click();
      await page.getByRole('button', { name: 'Add New' }).click();
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('AAAABBBBCCCCDDDD');
      await page.getByRole('textbox', { name: 'Passphrase' }).fill('testpassphrase12');
      await page.getByRole('textbox', { name: 'Label' }).fill('Long Label With Many Characters');
      await page.getByRole('button', { name: 'Show Advanced Options' }).click();
      await page.getByRole('combobox', { name: 'Digits' }).selectOption('8');
      await page.getByRole('spinbutton', { name: 'Period' }).fill('60');
      await page.getByRole('combobox', { name: 'Algorithm' }).selectOption('SHA512');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      const customUrl = await page
        .getByRole('textbox', { name: 'Generated TOTP URL' })
        .inputValue();

      expect(customUrl.length).toBeGreaterThan(defaultUrl.length);
    });
  });
});
