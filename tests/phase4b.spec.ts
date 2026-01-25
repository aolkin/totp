import { test, expect } from './fixtures';

test.describe('Account-Based Passphrase Storage', () => {
  test('should save TOTP with passphrase to account', async ({ page }) => {
    await page.goto('/#/');
    await page.getByRole('link', { name: 'Add New' }).click();

    await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('AAAABBBBCCCCDDDD');
    await page.getByRole('textbox', { name: 'Label' }).fill('GitHub Account');
    await page.locator('#passphrase').fill('test-passphrase');

    await page.getByRole('radio', { name: 'Save TOTP and passphrase to account' }).click();

    await page.locator('#account-select').click();

    await page.getByText('+ Create new account...').click();

    await page.getByRole('textbox', { name: 'Username' }).fill('work-account');
    await page
      .getByRole('textbox', { name: /^Password$/ })
      .first()
      .fill('password123');
    await page.getByRole('textbox', { name: 'Confirm Password' }).fill('password123');

    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText('Account created')).toBeVisible();

    await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

    await expect(page.getByRole('heading', { name: 'URL Generated' })).toBeVisible();
    await expect(page.getByText('TOTP and passphrase saved to account')).toBeVisible();

    await page.getByRole('link', { name: 'View Saved TOTPs' }).click();
    await expect(page.getByText('GitHub Account')).toBeVisible();
    await expect(page.getByText('work-account')).toBeVisible();
  });

  test('should auto-decrypt TOTP when account is unlocked', async ({ page }) => {
    await page.goto('/#/');
    await page.getByRole('link', { name: 'Add New' }).click();

    await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('AAAABBBBCCCCDDDD');
    await page.getByRole('textbox', { name: 'Label' }).fill('Auto-Decrypt Test');
    await page.locator('#passphrase').fill('auto-decrypt-pass');

    await page.getByRole('radio', { name: 'Save TOTP and passphrase to account' }).click();

    await page.locator('#account-select').click();
    await page.getByText('+ Create new account...').click();

    await page.getByRole('textbox', { name: 'Username' }).fill('auto-account');
    await page
      .getByRole('textbox', { name: /^Password$/ })
      .first()
      .fill('accountpass123');
    await page.getByRole('textbox', { name: 'Confirm Password' }).fill('accountpass123');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await page.getByRole('button', { name: 'Generate TOTP URL' }).click();
    await page.getByRole('link', { name: 'View Saved TOTPs' }).click();

    await page.getByRole('link', { name: 'View' }).click();

    await expect(page.locator('text=/\\d{3} \\d{3}/')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Copy Code' })).toBeVisible();
  });

  test('should show account lock status in list', async ({ page }) => {
    await page.goto('/#/');
    await page.getByRole('link', { name: 'Add New' }).click();

    await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('AAAABBBBCCCCDDDD');
    await page.getByRole('textbox', { name: 'Label' }).fill('Lock Status Test');
    await page.locator('#passphrase').fill('lock-status-pass');

    await page.getByRole('radio', { name: 'Save TOTP and passphrase to account' }).click();

    await page.locator('#account-select').click();
    await page.getByText('+ Create new account...').click();

    await page.getByRole('textbox', { name: 'Username' }).fill('lock-test-account');
    await page
      .getByRole('textbox', { name: /^Password$/ })
      .first()
      .fill('lockpass123');
    await page.getByRole('textbox', { name: 'Confirm Password' }).fill('lockpass123');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await page.getByRole('button', { name: 'Generate TOTP URL' }).click();
    await page.getByRole('link', { name: 'View Saved TOTPs' }).click();

    await expect(page.getByText('lock-test-account')).toBeVisible();
    await expect(page.getByText('(unlocked)')).toBeVisible();

    await page.reload();
    await page.waitForTimeout(500);

    await expect(page.getByText('lock-test-account')).toBeVisible();
  });
});
