import { test, expect } from '@playwright/test';

test.describe('UI - Create Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Form validation', () => {
    test('should show error for empty secret', async ({ page }) => {
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      await expect(page.getByText('Please enter a TOTP secret')).toBeVisible();
    });

    test('should show error for invalid Base32 secret', async ({ page }) => {
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('INVALID189!@#');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      await expect(page.getByText('Invalid format')).toBeVisible();
    });

    test('should accept valid Base32 secret', async ({ page }) => {
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSWY3DPEHPK3PXP');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      await expect(page.getByRole('heading', { name: 'URL Generated' })).toBeVisible();
    });

    test('should strip spaces from secret input', async ({ page }) => {
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSW Y3DP EHPK 3PXP');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      await expect(page.getByRole('heading', { name: 'URL Generated' })).toBeVisible();
    });

    test('should show error for short custom passphrase', async ({ page }) => {
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSWY3DPEHPK3PXP');
      await page.getByRole('textbox', { name: 'Passphrase' }).fill('short');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      await expect(page.getByText('at least 12 characters')).toBeVisible();
    });
  });

  test.describe('Passphrase generation', () => {
    test('should have auto-generated passphrase on load', async ({ page }) => {
      const passphrase = await page.getByRole('textbox', { name: 'Passphrase' }).inputValue();

      expect(passphrase).toBeTruthy();
      expect(passphrase.split('-').length).toBe(5);
    });

    test('should regenerate passphrase when clicking Regenerate', async ({ page }) => {
      const initialPassphrase = await page
        .getByRole('textbox', { name: 'Passphrase' })
        .inputValue();

      await page.getByRole('button', { name: 'Regenerate' }).click();

      const newPassphrase = await page.getByRole('textbox', { name: 'Passphrase' }).inputValue();

      expect(newPassphrase).not.toBe(initialPassphrase);
      expect(newPassphrase.split('-').length).toBe(5);
    });

    test('should show strength meter for custom passphrase', async ({ page }) => {
      await page.getByRole('textbox', { name: 'Passphrase' }).fill('mycustompassphrase123');

      await expect(page.getByText('Strength:')).toBeVisible();
    });

    test('should show auto-generated message for generated passphrase', async ({ page }) => {
      await expect(page.getByText('Auto-generated passphrase')).toBeVisible();
    });
  });

  test.describe('Advanced options', () => {
    test('should show advanced options when clicking toggle', async ({ page }) => {
      await page.getByRole('button', { name: 'Show Advanced Options' }).click();

      await expect(page.getByRole('combobox', { name: 'Digits' })).toBeVisible();
      await expect(page.getByRole('spinbutton', { name: 'Period' })).toBeVisible();
      await expect(page.getByRole('combobox', { name: 'Algorithm' })).toBeVisible();
    });

    test('should hide advanced options when clicking toggle again', async ({ page }) => {
      await page.getByRole('button', { name: 'Show Advanced Options' }).click();
      await page.getByRole('button', { name: 'Hide Advanced Options' }).click();

      await expect(page.getByRole('combobox', { name: 'Digits' })).not.toBeVisible();
    });

    test('should allow selecting different digit counts', async ({ page }) => {
      await page.getByRole('button', { name: 'Show Advanced Options' }).click();
      await page.getByRole('combobox', { name: 'Digits' }).selectOption('8');

      const value = await page.getByRole('combobox', { name: 'Digits' }).inputValue();
      expect(value).toBe('8');
    });

    test('should allow selecting different algorithms', async ({ page }) => {
      await page.getByRole('button', { name: 'Show Advanced Options' }).click();
      await page.getByRole('combobox', { name: 'Algorithm' }).selectOption('SHA256');

      const value = await page.getByRole('combobox', { name: 'Algorithm' }).inputValue();
      expect(value).toBe('SHA256');
    });

    test('should allow changing period', async ({ page }) => {
      await page.getByRole('button', { name: 'Show Advanced Options' }).click();
      await page.getByRole('spinbutton', { name: 'Period' }).fill('60');

      const value = await page.getByRole('spinbutton', { name: 'Period' }).inputValue();
      expect(value).toBe('60');
    });
  });

  test.describe('URL generation', () => {
    test('should generate URL with valid secret', async ({ page }) => {
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSWY3DPEHPK3PXP');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      await expect(page.getByRole('heading', { name: 'URL Generated' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Generated TOTP URL' })).toBeVisible();
    });

    test('should show passphrase in result', async ({ page }) => {
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSWY3DPEHPK3PXP');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      await expect(page.getByText('Passphrase:')).toBeVisible();
    });

    test('should show warning when no passphrase', async ({ page }) => {
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSWY3DPEHPK3PXP');
      await page.getByRole('textbox', { name: 'Passphrase' }).fill('');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      await expect(page.getByText('Anyone with this URL can access')).toBeVisible();
    });

    test('should allow copying URL', async ({ page }) => {
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSWY3DPEHPK3PXP');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible();
    });

    test('should allow creating another TOTP', async ({ page }) => {
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSWY3DPEHPK3PXP');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();
      await page.getByRole('button', { name: 'Create Another' }).click();

      await expect(page.getByRole('heading', { name: 'Create TOTP URL' })).toBeVisible();
    });

    test('should include label in result if provided', async ({ page }) => {
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSWY3DPEHPK3PXP');
      await page.getByRole('textbox', { name: 'Label' }).fill('Test Service');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      await expect(page.getByRole('heading', { name: 'URL Generated' })).toBeVisible();
    });
  });

  test.describe('URL contains minimal metadata', () => {
    test('should generate shorter URL with default options', async ({ page }) => {
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSWY3DPEHPK3PXP');
      await page.getByRole('textbox', { name: 'Passphrase' }).fill('testpassphrase12');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      const defaultUrl = await page
        .getByRole('textbox', { name: 'Generated TOTP URL' })
        .inputValue();

      await page.getByRole('button', { name: 'Create Another' }).click();

      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSWY3DPEHPK3PXP');
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
