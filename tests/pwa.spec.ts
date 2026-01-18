import { test, expect } from '@playwright/test';

test.describe('PWA', () => {
  test.describe('Manifest', () => {
    test('should serve manifest.json correctly', async ({ page }) => {
      const response = await page.goto('/manifest.webmanifest');

      expect(response?.status()).toBe(200);
      expect(response?.headers()['content-type']).toContain('application/manifest+json');

      const manifest = await response?.json();

      expect(manifest.name).toBe('TOTP Authenticator');
      expect(manifest.short_name).toBe('TOTP');
      expect(manifest.display).toBe('standalone');
      expect(manifest.start_url).toBe('/');
      expect(manifest.icons).toBeDefined();
      expect(Array.isArray(manifest.icons)).toBe(true);
    });

    test('should have link to manifest in HTML', async ({ page }) => {
      await page.goto('/');

      const manifestLink = await page.locator('link[rel="manifest"]').getAttribute('href');
      expect(manifestLink).toContain('manifest');
    });
  });

  test.describe('Service Worker', () => {
    test('should register service worker', async ({ page }) => {
      await page.goto('/');

      const swRegistered = await page.evaluate(async () => {
        if (!('serviceWorker' in navigator)) {
          return false;
        }

        try {
          const registration = await navigator.serviceWorker.getRegistration();
          return registration !== undefined;
        } catch {
          return false;
        }
      });

      expect(swRegistered).toBe(true);
    });

    test('should have service worker in active state', async ({ page }) => {
      await page.goto('/');

      await page.waitForTimeout(2000);

      const swState = await page.evaluate(async () => {
        if (!('serviceWorker' in navigator)) {
          return 'unsupported';
        }

        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (!registration) {
            return 'not-registered';
          }

          if (registration.active) {
            return 'active';
          }
          if (registration.waiting) {
            return 'waiting';
          }
          if (registration.installing) {
            return 'installing';
          }

          return 'unknown';
        } catch {
          return 'error';
        }
      });

      expect(['active', 'installing', 'waiting']).toContain(swState);
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

    test('should have apple-touch-icon', async ({ page }) => {
      await page.goto('/');

      const appleIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
      expect(appleIcon).toBeTruthy();
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

    test('should serve apple touch icon', async ({ page }) => {
      const response = await page.goto('/apple-touch-icon-180x180.png');
      expect(response?.status()).toBe(200);
    });
  });

  test.describe('Offline Capability', () => {
    test('should cache resources for offline use', async ({ page }) => {
      await page.goto('/');

      await page.waitForTimeout(2000);

      const cacheNames = await page.evaluate(async () => {
        const names = await caches.keys();
        return names;
      });

      expect(cacheNames.length).toBeGreaterThan(0);
    });

    test('should work offline after caching', async ({ page, context }) => {
      await page.goto('/');

      await page.waitForTimeout(3000);

      await context.setOffline(true);

      await page.reload();

      await expect(page.getByRole('heading', { name: 'TOTP Authenticator' })).toBeVisible();

      await context.setOffline(false);
    });
  });
});
