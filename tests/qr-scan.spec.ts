import { test, expect } from '@playwright/test';

test.describe('QR Scanner', () => {
  test('should open scan modal and show cancel button', async ({ page, context }) => {
    await page.goto('/');
    await context.grantPermissions(['camera']);

    // Verify button is visible and opens modal
    await expect(page.getByTestId('scan-qr-button')).toBeVisible();
    await page.getByTestId('scan-qr-button').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Scan QR Code' })).toBeVisible();

    // Verify cancel button exists and is clickable
    const cancelButton = page.getByRole('button', { name: 'Cancel' });
    await expect(cancelButton).toBeVisible();
    await expect(cancelButton).toBeEnabled();
  });
});
