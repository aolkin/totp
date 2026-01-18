import { test, expect } from '@playwright/test';
import { createTotpUrl } from './helpers';

test.describe('UI - View Mode', () => {
  test.describe('Passphrase handling', () => {
    test('should prompt for passphrase when protected', async ({ page }) => {
      const { url } = await createTotpUrl(page, { passphrase: 'testpassphrase12' });

      await page.goto(url);

      await expect(page.getByRole('heading', { name: 'Enter Passphrase' })).toBeVisible();
      await expect(page.getByText('protected with a passphrase')).toBeVisible();
    });

    test('should show error for wrong passphrase and allow retry', async ({ page }) => {
      const { url } = await createTotpUrl(page, { passphrase: 'testpassphrase12' });

      await page.goto(url);
      await page.getByRole('textbox', { name: 'Enter your passphrase' }).fill('wrongpassphrase');
      await page.getByRole('button', { name: 'Unlock' }).click();

      await expect(page.getByText('Incorrect passphrase')).toBeVisible();

      // Retry with correct passphrase
      await page.getByRole('textbox', { name: 'Enter your passphrase' }).fill('testpassphrase12');
      await page.getByRole('button', { name: 'Unlock' }).click();

      await expect(page.getByRole('button', { name: 'Copy Code' })).toBeVisible();
    });

    test('should display code immediately without passphrase', async ({ page }) => {
      const { url } = await createTotpUrl(page, { passphrase: '' });

      await page.goto(url);

      await expect(page.getByRole('heading', { name: 'Enter Passphrase' })).not.toBeVisible();
      await expect(page.getByRole('button', { name: 'Copy Code' })).toBeVisible();
    });
  });

  test.describe('TOTP display', () => {
    test('should display code, timer, and controls', async ({ page }) => {
      const { url } = await createTotpUrl(page, { passphrase: '' });

      await page.goto(url);

      // Check code format
      const codeElement = page.locator('.font-mono.text-5xl');
      await expect(codeElement).toBeVisible();
      const code = await codeElement.textContent();
      expect(code?.replace(/\s/g, '')).toMatch(/^\d{6}$/);

      // Check timer
      await expect(page.locator('text=/\\d+s/')).toBeVisible();

      // Check buttons
      await expect(page.getByRole('button', { name: 'Copy Code' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Create New TOTP' })).toBeVisible();
    });

    test('should display label when provided', async ({ page }) => {
      const { url } = await createTotpUrl(page, {
        passphrase: '',
        label: 'GitHub - test@example.com',
      });

      await page.goto(url);

      await expect(page.getByText('GitHub - test@example.com')).toBeVisible();
    });

    test('should navigate back to create mode', async ({ page }) => {
      const { url } = await createTotpUrl(page, { passphrase: '' });

      await page.goto(url);
      await page.getByRole('button', { name: 'Create New TOTP' }).click();

      await expect(page.getByRole('heading', { name: 'Create TOTP URL' })).toBeVisible();
    });
  });

  test.describe('Error handling', () => {
    test('should show passphrase prompt for unrecognized encrypted data', async ({ page }) => {
      // An invalid fragment that can be decoded as base64 will show passphrase prompt
      await page.goto('/#SGVsbG9Xb3JsZA');

      await expect(page.getByRole('heading', { name: 'Enter Passphrase' })).toBeVisible();
    });
  });
});
