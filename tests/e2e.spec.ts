import { test, expect } from '@playwright/test';

test.describe('E2E - Full User Flows', () => {
  test.describe('Create → View with passphrase', () => {
    test('should complete full flow: create TOTP → copy URL → view in new tab → enter passphrase → see code', async ({
      page,
      context,
    }) => {
      await page.goto('/');

      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSWY3DPEHPK3PXP');
      await page.getByRole('textbox', { name: 'Label' }).fill('GitHub - test@example.com');

      const passphrase = await page.getByRole('textbox', { name: 'Passphrase' }).inputValue();

      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      await expect(page.getByRole('heading', { name: 'URL Generated' })).toBeVisible();
      const generatedUrl = await page
        .getByRole('textbox', { name: 'Generated TOTP URL' })
        .inputValue();

      const newPage = await context.newPage();
      await newPage.goto(generatedUrl);

      await expect(newPage.getByRole('heading', { name: 'Enter Passphrase' })).toBeVisible();

      await newPage.getByRole('textbox', { name: 'Enter your passphrase' }).fill(passphrase);
      await newPage.getByRole('button', { name: 'Unlock' }).click();

      await expect(newPage.getByRole('button', { name: 'Copy Code' })).toBeVisible();
      await expect(newPage.getByText('GitHub - test@example.com')).toBeVisible();

      const codeElement = newPage.locator('.font-mono.text-5xl');
      const code = await codeElement.textContent();
      expect(code?.replace(/\s/g, '')).toMatch(/^\d{6}$/);

      await newPage.close();
    });
  });

  test.describe('Create → View without passphrase', () => {
    test('should display code immediately without passphrase prompt', async ({ page, context }) => {
      await page.goto('/');

      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSWY3DPEHPK3PXP');
      await page.getByRole('textbox', { name: 'Passphrase' }).fill('');

      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      await expect(page.getByRole('heading', { name: 'URL Generated' })).toBeVisible();
      await expect(page.getByText('Anyone with this URL can access')).toBeVisible();

      const generatedUrl = await page
        .getByRole('textbox', { name: 'Generated TOTP URL' })
        .inputValue();

      const newPage = await context.newPage();
      await newPage.goto(generatedUrl);

      await expect(newPage.getByRole('heading', { name: 'Enter Passphrase' })).not.toBeVisible();
      await expect(newPage.getByRole('button', { name: 'Copy Code' })).toBeVisible();

      const codeElement = newPage.locator('.font-mono.text-5xl');
      const code = await codeElement.textContent();
      expect(code?.replace(/\s/g, '')).toMatch(/^\d{6}$/);

      await newPage.close();
    });
  });

  test.describe('Create → View with label', () => {
    test('should display label in view mode', async ({ page, context }) => {
      await page.goto('/');

      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSWY3DPEHPK3PXP');
      await page.getByRole('textbox', { name: 'Label' }).fill('AWS Console - Production');
      await page.getByRole('textbox', { name: 'Passphrase' }).fill('');

      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      const generatedUrl = await page
        .getByRole('textbox', { name: 'Generated TOTP URL' })
        .inputValue();

      const newPage = await context.newPage();
      await newPage.goto(generatedUrl);

      await expect(newPage.getByText('AWS Console - Production')).toBeVisible();

      await newPage.close();
    });
  });

  test.describe('Create → View with custom settings', () => {
    test('should preserve 8-digit setting through create/view cycle', async ({ page, context }) => {
      await page.goto('/');

      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSWY3DPEHPK3PXP');
      await page.getByRole('textbox', { name: 'Passphrase' }).fill('');
      await page.getByRole('button', { name: 'Show Advanced Options' }).click();
      await page.getByRole('combobox', { name: 'Digits' }).selectOption('8');

      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      const generatedUrl = await page
        .getByRole('textbox', { name: 'Generated TOTP URL' })
        .inputValue();

      const newPage = await context.newPage();
      await newPage.goto(generatedUrl);

      const codeElement = newPage.locator('.font-mono.text-5xl');
      const code = await codeElement.textContent();
      expect(code?.replace(/\s/g, '')).toMatch(/^\d{8}$/);

      await newPage.close();
    });

    test('should preserve SHA256 algorithm through create/view cycle', async ({
      page,
      context,
    }) => {
      await page.goto('/');

      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSWY3DPEHPK3PXP');
      await page.getByRole('textbox', { name: 'Passphrase' }).fill('');
      await page.getByRole('button', { name: 'Show Advanced Options' }).click();
      await page.getByRole('combobox', { name: 'Algorithm' }).selectOption('SHA256');

      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      const generatedUrl = await page
        .getByRole('textbox', { name: 'Generated TOTP URL' })
        .inputValue();

      const newPage = await context.newPage();
      await newPage.goto(generatedUrl);

      await expect(newPage.getByRole('button', { name: 'Copy Code' })).toBeVisible();

      await newPage.close();
    });
  });

  test.describe('Navigation flows', () => {
    test('should navigate from view mode back to create mode', async ({ page }) => {
      await page.goto('/');

      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSWY3DPEHPK3PXP');
      await page.getByRole('textbox', { name: 'Passphrase' }).fill('');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      const generatedUrl = await page
        .getByRole('textbox', { name: 'Generated TOTP URL' })
        .inputValue();
      const fragment = generatedUrl.split('#')[1];

      await page.goto(`/#${fragment}`);
      await expect(page.getByRole('button', { name: 'Copy Code' })).toBeVisible();

      await page.getByRole('button', { name: 'Create New TOTP' }).click();

      await expect(page.getByRole('heading', { name: 'Create TOTP URL' })).toBeVisible();
      // URL will be http://localhost:5173/# (empty hash), which is expected browser behavior
    });

    test('should handle Create Another button correctly', async ({ page }) => {
      await page.goto('/');

      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSWY3DPEHPK3PXP');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      await expect(page.getByRole('heading', { name: 'URL Generated' })).toBeVisible();

      await page.getByRole('button', { name: 'Create Another' }).click();

      await expect(page.getByRole('heading', { name: 'Create TOTP URL' })).toBeVisible();

      const secretValue = await page.getByRole('textbox', { name: 'TOTP Secret' }).inputValue();
      expect(secretValue).toBe('');
    });
  });

  test.describe('Error recovery', () => {
    test('should show passphrase prompt for unrecognized encrypted data', async ({ page }) => {
      // An invalid fragment that can be decoded as base64 will show passphrase prompt
      // because decryption with empty passphrase fails
      await page.goto('/#SGVsbG9Xb3JsZA');

      // Should show passphrase prompt (not error) since base64 decodes but decryption fails
      await expect(page.getByRole('heading', { name: 'Enter Passphrase' })).toBeVisible();
    });

    test('should allow retry after wrong passphrase', async ({ page, context }) => {
      await page.goto('/');

      await page.getByRole('textbox', { name: 'TOTP Secret' }).fill('JBSWY3DPEHPK3PXP');
      await page.getByRole('textbox', { name: 'Passphrase' }).fill('correctpassword1');
      await page.getByRole('button', { name: 'Generate TOTP URL' }).click();

      const generatedUrl = await page
        .getByRole('textbox', { name: 'Generated TOTP URL' })
        .inputValue();

      const newPage = await context.newPage();
      await newPage.goto(generatedUrl);

      await newPage.getByRole('textbox', { name: 'Enter your passphrase' }).fill('wrongpassword');
      await newPage.getByRole('button', { name: 'Unlock' }).click();

      await expect(newPage.getByText('Incorrect passphrase')).toBeVisible();

      await newPage
        .getByRole('textbox', { name: 'Enter your passphrase' })
        .fill('correctpassword1');
      await newPage.getByRole('button', { name: 'Unlock' }).click();

      await expect(newPage.getByRole('button', { name: 'Copy Code' })).toBeVisible();

      await newPage.close();
    });
  });
});
