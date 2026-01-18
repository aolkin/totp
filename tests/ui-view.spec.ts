import { test, expect } from '@playwright/test';

test.describe('UI - View Mode', () => {
  test.describe('Passphrase prompt', () => {
    test('should show passphrase prompt for encrypted URL', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSWY3DPEHPK3PXP');
      await page.getByRole('textbox', { name: 'Passphrase' }).fill('testpassphrase12');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      const url = await page.getByRole('textbox', { name: 'Generated TOTP URL' }).inputValue();
      const fragment = url.split('#')[1];

      await page.goto(`/#${fragment}`);

      await expect(page.getByRole('heading', { name: 'Enter Passphrase' })).toBeVisible();
      await expect(page.getByText('protected with a passphrase')).toBeVisible();
    });

    test('should show error for wrong passphrase', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSWY3DPEHPK3PXP');
      await page.getByRole('textbox', { name: 'Passphrase' }).fill('testpassphrase12');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      const url = await page.getByRole('textbox', { name: 'Generated TOTP URL' }).inputValue();
      const fragment = url.split('#')[1];

      await page.goto(`/#${fragment}`);
      await page.getByRole('textbox', { name: 'Enter your passphrase' }).fill('wrongpassphrase');
      await page.getByRole('button', { name: 'Unlock' }).click();

      await expect(page.getByText('Incorrect passphrase')).toBeVisible();
    });

    test('should unlock with correct passphrase', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSWY3DPEHPK3PXP');
      await page.getByRole('textbox', { name: 'Passphrase' }).fill('testpassphrase12');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      const url = await page.getByRole('textbox', { name: 'Generated TOTP URL' }).inputValue();
      const fragment = url.split('#')[1];

      await page.goto(`/#${fragment}`);
      await page.getByRole('textbox', { name: 'Enter your passphrase' }).fill('testpassphrase12');
      await page.getByRole('button', { name: 'Unlock' }).click();

      await expect(page.getByRole('button', { name: 'Copy Code' })).toBeVisible();
    });
  });

  test.describe('Empty passphrase (no prompt)', () => {
    test('should display TOTP immediately without passphrase', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSWY3DPEHPK3PXP');
      await page.getByRole('textbox', { name: 'Passphrase' }).fill('');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      const url = await page.getByRole('textbox', { name: 'Generated TOTP URL' }).inputValue();
      const fragment = url.split('#')[1];

      await page.goto(`/#${fragment}`);

      await expect(page.getByRole('button', { name: 'Copy Code' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Enter Passphrase' })).not.toBeVisible();
    });
  });

  test.describe('TOTP display', () => {
    test('should display TOTP code', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSWY3DPEHPK3PXP');
      await page.getByRole('textbox', { name: 'Passphrase' }).fill('');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      const url = await page.getByRole('textbox', { name: 'Generated TOTP URL' }).inputValue();
      const fragment = url.split('#')[1];

      await page.goto(`/#${fragment}`);

      const codeElement = page.locator('.font-mono.text-5xl');
      await expect(codeElement).toBeVisible();
      const code = await codeElement.textContent();
      expect(code?.replace(/\s/g, '')).toMatch(/^\d{6}$/);
    });

    test('should display label if provided', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSWY3DPEHPK3PXP');
      await page.getByRole('textbox', { name: 'Label' }).fill('GitHub - test@example.com');
      await page.getByRole('textbox', { name: 'Passphrase' }).fill('');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      const url = await page.getByRole('textbox', { name: 'Generated TOTP URL' }).inputValue();
      const fragment = url.split('#')[1];

      await page.goto(`/#${fragment}`);

      await expect(page.getByText('GitHub - test@example.com')).toBeVisible();
    });

    test('should show countdown timer', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSWY3DPEHPK3PXP');
      await page.getByRole('textbox', { name: 'Passphrase' }).fill('');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      const url = await page.getByRole('textbox', { name: 'Generated TOTP URL' }).inputValue();
      const fragment = url.split('#')[1];

      await page.goto(`/#${fragment}`);

      const timer = page.locator('text=/\\d+s/');
      await expect(timer).toBeVisible();
    });

    test('should have Copy Code button', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSWY3DPEHPK3PXP');
      await page.getByRole('textbox', { name: 'Passphrase' }).fill('');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      const url = await page.getByRole('textbox', { name: 'Generated TOTP URL' }).inputValue();
      const fragment = url.split('#')[1];

      await page.goto(`/#${fragment}`);

      await expect(page.getByRole('button', { name: 'Copy Code' })).toBeVisible();
    });

    test('should have Create New TOTP button', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSWY3DPEHPK3PXP');
      await page.getByRole('textbox', { name: 'Passphrase' }).fill('');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      const url = await page.getByRole('textbox', { name: 'Generated TOTP URL' }).inputValue();
      const fragment = url.split('#')[1];

      await page.goto(`/#${fragment}`);

      await expect(page.getByRole('button', { name: 'Create New TOTP' })).toBeVisible();
    });

    test('should navigate to create mode when clicking Create New TOTP', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSWY3DPEHPK3PXP');
      await page.getByRole('textbox', { name: 'Passphrase' }).fill('');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      const url = await page.getByRole('textbox', { name: 'Generated TOTP URL' }).inputValue();
      const fragment = url.split('#')[1];

      await page.goto(`/#${fragment}`);
      await page.getByRole('button', { name: 'Create New TOTP' }).click();

      await expect(page.getByRole('heading', { name: 'Create TOTP URL' })).toBeVisible();
      expect(page.url()).not.toContain('#');
    });
  });

  test.describe('Countdown timer updates', () => {
    test('should update countdown timer over time', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSWY3DPEHPK3PXP');
      await page.getByRole('textbox', { name: 'Passphrase' }).fill('');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      const url = await page.getByRole('textbox', { name: 'Generated TOTP URL' }).inputValue();
      const fragment = url.split('#')[1];

      await page.goto(`/#${fragment}`);

      const timer = page.locator('text=/\\d+s/');
      const initialTime = await timer.textContent();

      await page.waitForTimeout(1500);

      const updatedTime = await timer.textContent();

      const initialSeconds = parseInt(initialTime?.replace('s', '') ?? '0');
      const updatedSeconds = parseInt(updatedTime?.replace('s', '') ?? '0');

      expect(updatedSeconds).toBeLessThanOrEqual(initialSeconds);
    });
  });

  test.describe('Error handling', () => {
    test('should show error for invalid URL fragment', async ({ page }) => {
      await page.goto('/#invalidfragment');

      await expect(page.getByText('Invalid URL')).toBeVisible();
    });

    test('should have Go Back button on error', async ({ page }) => {
      await page.goto('/#invalidfragment');

      await expect(page.getByRole('button', { name: 'Go Back' })).toBeVisible();
    });

    test('should navigate to create mode when clicking Go Back', async ({ page }) => {
      await page.goto('/#invalidfragment');
      await page.getByRole('button', { name: 'Go Back' }).click();

      await expect(page.getByRole('heading', { name: 'Create TOTP URL' })).toBeVisible();
    });
  });
});
