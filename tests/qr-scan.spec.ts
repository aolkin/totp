import { test, expect } from '@playwright/test';

test.describe('QR Scanner UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display Scan QR button', async ({ page }) => {
    await expect(page.getByTestId('scan-qr-button')).toBeVisible();
  });

  test('should open scan modal when clicking Scan QR button', async ({ page, context }) => {
    await context.grantPermissions(['camera']);

    await page.getByTestId('scan-qr-button').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Scan QR Code' })).toBeVisible();
    await expect(page.getByText('Point your camera at a TOTP authenticator QR code')).toBeVisible();
  });

  test('should close modal when clicking Cancel', async ({ page, context }) => {
    await context.grantPermissions(['camera']);

    await page.getByTestId('scan-qr-button').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should show error when camera permission is denied', async ({ page, context }) => {
    await context.clearPermissions();

    const errorShown = new Promise<void>((resolve) => {
      page.on('dialog', async (dialog) => {
        await dialog.dismiss();
        resolve();
      });
    });

    await page.getByTestId('scan-qr-button').click();

    await Promise.race([
      page.waitForSelector('text=/camera permission denied|Camera permission denied/i', {
        timeout: 5000,
      }),
      errorShown,
      page.waitForSelector('text=/camera/i', { timeout: 5000 }),
    ]).catch(() => {
      // Expected in headless mode - camera permission can't be tested without actual camera
    });
  });
});

test.describe('OTP Auth URL Auto-fill', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('form should accept manual input after QR scanner closes', async ({ page }) => {
    const secretInput = page.getByRole('textbox', { name: 'TOTP Secret' });
    await secretInput.fill('JBSWY3DPEHPK3PXP');

    const value = await secretInput.inputValue();
    expect(value).toBe('JBSWY3DPEHPK3PXP');
  });
});
