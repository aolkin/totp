import { test, expect } from '@playwright/test';

// Note: PWA features (service worker, manifest) only work in production builds.
// These tests verify the basic PWA infrastructure exists.

test.describe('PWA', () => {
  test.describe('Manifest', () => {
    test('should have link to manifest in HTML', async ({ page }) => {
      await page.goto('/');

      const manifestLink = await page.locator('link[rel="manifest"]').getAttribute('href');
      expect(manifestLink).toContain('manifest');
    });
  });

  test.describe('PWA Meta Tags', () => {
    test('should have viewport meta tag', async ({ page }) => {
      await page.goto('/');

      const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
      expect(viewport).toContain('width=device-width');
    });

    test('should have theme-color meta tag', async ({ page }) => {
      await page.goto('/');

      const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
      expect(themeColor).toBeTruthy();
    });
  });

  test.describe('App Icons', () => {
    test('should serve 192x192 icon', async ({ page }) => {
      const response = await page.goto('/pwa-192x192.png');
      expect(response?.status()).toBe(200);
    });

    test('should serve 512x512 icon', async ({ page }) => {
      const response = await page.goto('/pwa-512x512.png');
      expect(response?.status()).toBe(200);
    });
  });
});
