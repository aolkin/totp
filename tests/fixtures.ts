import { test as base } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    // Add init script to dismiss banners before any navigation
    await page.addInitScript(() => {
      localStorage.setItem('offline_banner_dismissed', 'true');
      localStorage.setItem('update_banner_dismissed', 'true');
    });
    await use(page);
  },
});

export { expect } from '@playwright/test';
