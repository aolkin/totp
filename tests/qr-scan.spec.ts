import { test, expect } from '@playwright/test';

test.describe('QR Scanner', () => {
  test('should open scan modal and display scanner UI', async ({ page, context }) => {
    await page.goto('/');
    await context.grantPermissions(['camera']);

    // Verify Scan QR button is visible
    await expect(page.getByTestId('scan-qr-button')).toBeVisible();

    // Click to open modal
    await page.getByTestId('scan-qr-button').click();

    // Verify modal opens with expected content
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Scan QR Code' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();

    // Note: Dialog close verification is limited due to Svelte 5 + bits-ui binding issues
    // See tasks/svelte5-dialog-binding-limitation.md for details
  });
});
