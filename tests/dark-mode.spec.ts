import { test, expect } from './fixtures';

test.describe('Dark Mode', () => {
  test('should toggle between light and dark mode based on system preference', async ({ page }) => {
    // Start in light mode
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/#/');

    // Wait for the page to fully load and stabilize
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('h1', { timeout: 30000 });

    // Check light mode background color (white HSL)
    const lightBg = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
    });
    expect(lightBg).toBe('hsl(0 0% 100%)');

    // Switch to dark mode
    await page.emulateMedia({ colorScheme: 'dark' });

    // Wait a moment for CSS to apply
    await page.waitForTimeout(100);

    // Check dark mode background color (dark blue-gray HSL)
    const darkBg = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
    });
    expect(darkBg).toBe('hsl(222.2 84% 4.9%)');

    // Switch back to light mode
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForTimeout(100);

    // Verify it switches back
    const lightBgAgain = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
    });
    expect(lightBgAgain).toBe('hsl(0 0% 100%)');
  });
});
