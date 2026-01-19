import { test, expect } from '@playwright/test';

test.describe('Dark Mode', () => {
  test('should toggle between light and dark mode based on system preference', async ({ page }) => {
    // Start in light mode
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    // Check light mode background color (white)
    const lightBg = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });
    expect(lightBg).toBe('rgb(255, 255, 255)');

    // Switch to dark mode
    await page.emulateMedia({ colorScheme: 'dark' });

    // Wait a moment for CSS to apply
    await page.waitForTimeout(100);

    // Check dark mode background color (dark blue-gray)
    const darkBg = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });
    expect(darkBg).toBe('rgb(3, 7, 18)');

    // Switch back to light mode
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForTimeout(100);

    // Verify it switches back
    const lightBgAgain = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });
    expect(lightBgAgain).toBe('rgb(255, 255, 255)');
  });
});
