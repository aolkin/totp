import { test, expect } from './fixtures';
import { saveTotpToBrowser } from './helpers';

test.describe('Browser Storage', () => {
  test('should save TOTP with passphrase and display in list', async ({ page }) => {
    await saveTotpToBrowser(page, {
      label: 'GitHub Account',
      passphrase: 'mysecurepass123',
    });

    await expect(page.getByText('GitHub Account')).toBeVisible();
    await expect(page.getByText('Created')).toBeVisible();
  });

  test('should require passphrase and label when saving to browser', async ({ page }) => {
    await page.goto('/#/');
    await page.getByRole('link', { name: 'Add New' }).click();

    await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('AAAABBBBCCCCDDDD');
    await page.getByRole('textbox', { name: 'Label' }).fill('Test Account');
    await page.locator('#passphrase').fill('');
    await page
      .getByRole('radio', { name: 'Save TOTP to browser (passphrase required each time)' })
      .click();
    await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

    await expect(page.getByText('A passphrase is required when saving')).toBeVisible();

    await page.locator('#passphrase').fill('testpassword123');
    await page.getByRole('textbox', { name: 'Label' }).fill('');
    await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

    await expect(page.getByText('A label is required when saving')).toBeVisible();
  });

  test('should save with passphrase hint and display badge', async ({ page }) => {
    await saveTotpToBrowser(page, {
      label: 'AWS Console',
      passphrase: 'awspassphrase123',
      passphraseHint: 'office door code',
    });

    await expect(page.getByText('AWS Console')).toBeVisible();
    await expect(page.getByText('Has hint')).toBeVisible();
  });

  test('should allow creating without saving', async ({ page }) => {
    await page.goto('/#/');
    await page.getByRole('link', { name: 'Add New' }).click();

    await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('AAAABBBBCCCCDDDD');
    await page.getByRole('textbox', { name: 'Label' }).fill('Not Saved Account');
    await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

    await expect(page.getByRole('heading', { name: 'URL Generated' })).toBeVisible();
    await page.getByRole('link', { name: 'View Saved TOTPs' }).click();

    await expect(page.getByText('Not Saved Account')).not.toBeVisible();
  });
});
