import { test, expect } from '@playwright/test';

const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:8000';

const viewports = [
  { name: 'Mobile SE (320px)', width: 320, height: 667 },
  { name: 'Mobile iPhone (390px)', width: 390, height: 844 },
  { name: 'Tablet iPad (768px)', width: 768, height: 1024 },
  { name: 'Desktop (1280px)', width: 1280, height: 800 }
];

test.describe('PariView Responsive UI & Viewport Validation', () => {
  const testUser = {
    email: `responsive_user_${Date.now()}@example.com`,
    password: 'TestPassword123!',
    full_name: 'Responsive QA Tester'
  };

  test.beforeAll(async ({ request }) => {
    // Register test user via API
    await request.post(`${API_BASE}/api/v1/auth/register`, { data: testUser });
  });

  for (const vp of viewports) {
    test(`Responsive layout check on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // 1. Visit Login page
      await page.goto('/login');
      await page.waitForSelector('input[type="email"]');

      // Check no horizontal body overflow on Login
      const loginOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
      expect(loginOverflow).toBe(false);

      // Perform Login
      await page.fill('input[type="email"]', testUser.email);
      await page.fill('input[type="password"]', testUser.password);
      await page.click('button[type="submit"]');

      // Wait for Dashboard navigation
      await page.waitForURL('**/dashboard');
      await page.waitForSelector('h1');

      // Check no horizontal body overflow on Dashboard
      const dashOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
      expect(dashOverflow).toBe(false);

      // On mobile (< 1024px), verify mobile hamburger drawer opens & closes cleanly
      if (vp.width < 1024) {
        const menuBtn = page.locator('button:has(svg)');
        expect(await menuBtn.first().isVisible()).toBe(true);

        // Open mobile drawer
        await menuBtn.first().click();
        await page.waitForTimeout(300);

        // Verify mobile overlay or drawer is visible
        const drawer = page.locator('aside');
        expect(await drawer.isVisible()).toBe(true);

        // Navigate to Transactions using drawer link
        const txLink = page.locator('a[href="/transactions"]').first();
        await txLink.click();
        await page.waitForURL('**/transactions');

        // Verify no horizontal overflow on Transactions
        const txOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
        expect(txOverflow).toBe(false);
      }
    });
  }
});
