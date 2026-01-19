import { test, expect } from '@playwright/test';

test.describe('QR Scanner', () => {
  test('should open scan modal and display content', async ({ page, context }) => {
    await page.goto('/');
    await context.grantPermissions(['camera']);

    // Verify button is visible and opens modal
    await expect(page.getByTestId('scan-qr-button')).toBeVisible();
    await page.getByTestId('scan-qr-button').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Scan QR Code' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });
});
