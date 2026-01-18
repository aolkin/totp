import { test, expect } from '@playwright/test';
import { createTotpUrl } from './helpers';

test.describe('E2E - Cross-Tab Flows', () => {
  test('should complete full flow with passphrase in new tab', async ({ page, context }) => {
    const { url, passphrase } = await createTotpUrl(page, {
      label: 'GitHub - test@example.com',
    });

    const newPage = await context.newPage();
    await newPage.goto(url);

    await expect(newPage.getByRole('heading', { name: 'Enter Passphrase' })).toBeVisible();

    await newPage.getByRole('textbox', { name: 'Enter your passphrase' }).fill(passphrase);
    await newPage.getByRole('button', { name: 'Unlock' }).click();

    await expect(newPage.getByRole('button', { name: 'Copy Code' })).toBeVisible();
    await expect(newPage.getByText('GitHub - test@example.com')).toBeVisible();

    const code = await newPage.locator('.font-mono.text-4xl').textContent();
    expect(code?.replace(/\s/g, '')).toMatch(/^\d{6}$/);

    await newPage.close();
  });

  test('should display code immediately without passphrase in new tab', async ({
    page,
    context,
  }) => {
    const { url } = await createTotpUrl(page, { passphrase: '' });

    await expect(page.getByText('Anyone with this URL can access')).toBeVisible();

    const newPage = await context.newPage();
    await newPage.goto(url);

    await expect(newPage.getByRole('heading', { name: 'Enter Passphrase' })).not.toBeVisible();
    await expect(newPage.getByRole('button', { name: 'Copy Code' })).toBeVisible();

    await newPage.close();
  });
});

test.describe('E2E - Navigation Flows', () => {
  test('should reset form when clicking Create Another', async ({ page }) => {
    await createTotpUrl(page);

    await page.getByRole('button', { name: 'Create Another' }).click();

    await expect(page.getByRole('heading', { name: 'Create TOTP URL' })).toBeVisible();
    expect(await page.getByRole('textbox', { name: 'TOTP Secret' }).inputValue()).toBe('');
  });
});
