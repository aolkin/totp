import { test, expect, type Page } from '@playwright/test';

async function openAccountManager(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(100);
  await page.getByRole('button', { name: 'Settings' }).click({ force: true });
  await page.getByRole('button', { name: 'Manage Accounts' }).click({ force: true });
}

test.describe('Account Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => indexedDB.deleteDatabase('totp-storage'));
    await page.reload();
  });

  test('can create account with username and password', async ({ page }) => {
    await openAccountManager(page);

    await expect(page.getByText('No accounts yet')).toBeVisible();

    await page.getByRole('button', { name: '+ New' }).click();
    await page.getByLabel('Username').fill('testuser@example.com');
    await page.getByLabel('Password', { exact: true }).fill('testpassword123');
    await page.getByLabel('Confirm Password').fill('testpassword123');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText('Account created')).toBeVisible();
    await expect(page.getByText('testuser@example.com')).toBeVisible();
    await expect(page.getByText('✅ Unlocked')).toBeVisible();
  });

  test('rejects password shorter than 8 characters', async ({ page }) => {
    await openAccountManager(page);
    await page.getByRole('button', { name: '+ New' }).click();

    await page.getByLabel('Username').fill('testuser');
    await page.getByLabel('Password', { exact: true }).fill('short');
    await page.getByLabel('Confirm Password').fill('short');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText('Password must be at least 8 characters.')).toBeVisible();
  });

  test('rejects mismatched password confirmation', async ({ page }) => {
    await openAccountManager(page);
    await page.getByRole('button', { name: '+ New' }).click();

    await page.getByLabel('Username').fill('testuser');
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByLabel('Confirm Password').fill('password456');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('can lock and unlock account', async ({ page }) => {
    await openAccountManager(page);
    await page.getByRole('button', { name: '+ New' }).click();

    await page.getByLabel('Username').fill('locktest');
    await page.getByLabel('Password', { exact: true }).fill('testpass123');
    await page.getByLabel('Confirm Password').fill('testpass123');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText('✅ Unlocked')).toBeVisible();

    await page.getByRole('button', { name: 'Lock' }).click();
    await expect(page.getByText('Account locked')).toBeVisible();
    await expect(page.getByText('🔒 Locked')).toBeVisible();

    await page.getByRole('button', { name: 'Unlock' }).click();
    await page.getByLabel('Password').fill('testpass123');
    await page.getByRole('button', { name: 'Unlock', exact: true }).click();

    await expect(page.getByText('Account unlocked')).toBeVisible();
    await expect(page.getByText('✅ Unlocked')).toBeVisible();
  });

  test('rejects incorrect password on unlock', async ({ page }) => {
    await openAccountManager(page);
    await page.getByRole('button', { name: '+ New' }).click();

    await page.getByLabel('Username').fill('unlocktest');
    await page.getByLabel('Password', { exact: true }).fill('correctpass');
    await page.getByLabel('Confirm Password').fill('correctpass');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await page.getByRole('button', { name: 'Lock' }).click();
    await page.getByRole('button', { name: 'Unlock' }).click();
    await page.getByLabel('Password').fill('wrongpass');
    await page.getByRole('button', { name: 'Unlock', exact: true }).click();

    await expect(page.getByText('Incorrect password')).toBeVisible();
  });

  test('can update auto-lock settings', async ({ page }) => {
    await openAccountManager(page);
    await page.getByRole('button', { name: '+ New' }).click();

    await page.getByLabel('Username').fill('autolocktest');
    await page.getByLabel('Password', { exact: true }).fill('testpass123');
    await page.getByLabel('Confirm Password').fill('testpass123');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText('Auto-lock: 15 minutes')).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: '5 minutes' }).click();
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByText('Account updated')).toBeVisible();
    await expect(page.getByText('Auto-lock: 5 minutes')).toBeVisible();
  });

  test('can change account password', async ({ page }) => {
    await openAccountManager(page);
    await page.getByRole('button', { name: '+ New' }).click();

    await page.getByLabel('Username').fill('passwordchange');
    await page.getByLabel('Password', { exact: true }).fill('oldpass123');
    await page.getByLabel('Confirm Password').fill('oldpass123');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Update password').check();
    await page.getByLabel('Current Password').fill('oldpass123');
    await page.getByLabel('New Password').fill('newpass123');
    await page.getByLabel('Confirm New Password').fill('newpass123');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByText('Account updated')).toBeVisible();

    await page.getByRole('button', { name: 'Lock' }).click();
    await page.getByRole('button', { name: 'Unlock' }).click();
    await page.getByLabel('Password').fill('newpass123');
    await page.getByRole('button', { name: 'Unlock', exact: true }).click();

    await expect(page.getByText('Account unlocked')).toBeVisible();
  });

  test('can delete account with confirmation', async ({ page }) => {
    await openAccountManager(page);
    await page.getByRole('button', { name: '+ New' }).click();

    await page.getByLabel('Username').fill('deletetest');
    await page.getByLabel('Password', { exact: true }).fill('testpass123');
    await page.getByLabel('Confirm Password').fill('testpass123');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await page.getByRole('button', { name: 'Delete Account' }).click();
    await expect(page.getByText('Are you sure')).toBeVisible();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(page.getByText('Account deleted')).toBeVisible();
    await expect(page.getByText('No accounts yet')).toBeVisible();
  });

  test('can lock all accounts at once', async ({ page }) => {
    await openAccountManager(page);

    await page.getByRole('button', { name: '+ New' }).click();
    await page.getByLabel('Username').fill('user1');
    await page.getByLabel('Password', { exact: true }).fill('password1');
    await page.getByLabel('Confirm Password').fill('password1');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await page.getByRole('button', { name: '+ New' }).click();
    await page.getByLabel('Username').fill('user2');
    await page.getByLabel('Password', { exact: true }).fill('password2');
    await page.getByLabel('Confirm Password').fill('password2');
    await page.getByRole('button', { name: 'Create Account' }).click();

    const unlockedCount = await page.getByText('✅ Unlocked').count();
    expect(unlockedCount).toBe(2);

    await page.getByRole('button', { name: 'Close' }).first().click();
    await page.getByRole('button', { name: 'Lock All Accounts Now' }).click();
    await page.getByRole('button', { name: 'Manage Accounts' }).click();

    const lockedCount = await page.getByText('🔒 Locked').count();
    expect(lockedCount).toBe(2);
  });

  test('multiple accounts can be unlocked simultaneously', async ({ page }) => {
    await openAccountManager(page);

    await page.getByRole('button', { name: '+ New' }).click();
    await page.getByLabel('Username').fill('multi1');
    await page.getByLabel('Password', { exact: true }).fill('pass1234');
    await page.getByLabel('Confirm Password').fill('pass1234');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await page.getByRole('button', { name: '+ New' }).click();
    await page.getByLabel('Username').fill('multi2');
    await page.getByLabel('Password', { exact: true }).fill('pass5678');
    await page.getByLabel('Confirm Password').fill('pass5678');
    await page.getByRole('button', { name: 'Create Account' }).click();

    const unlockedCount = await page.getByText('✅ Unlocked').count();
    expect(unlockedCount).toBe(2);
  });

  test('rejects duplicate usernames', async ({ page }) => {
    await openAccountManager(page);

    await page.getByRole('button', { name: '+ New' }).click();
    await page.getByLabel('Username').fill('duplicate');
    await page.getByLabel('Password', { exact: true }).fill('password1');
    await page.getByLabel('Confirm Password').fill('password1');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText('Account created')).toBeVisible();

    await page.getByRole('button', { name: '+ New' }).click();
    await page.getByLabel('Username').fill('duplicate');
    await page.getByLabel('Password', { exact: true }).fill('password2');
    await page.getByLabel('Confirm Password').fill('password2');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText('Username already exists')).toBeVisible();
  });
});
