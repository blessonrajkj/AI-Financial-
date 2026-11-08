import { test, expect } from '@playwright/test';

const API_BASE = process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';
const FRONTEND_URL = process.env.E2E_BASE_URL || 'http://localhost:3001';

test.describe('PariView Phase 2 — Browser Login & Session Lifecycle Verification', () => {
  const timestamp = Date.now();
  const testUser = {
    email: `browser_login_test_${timestamp}@example.com`,
    password: 'SecureTestPassword123!',
    full_name: 'Login Verification User'
  };

  test.beforeAll(async ({ request }) => {
    // Register temporary generated test user via API
    const regRes = await request.post(`${API_BASE}/api/v1/auth/register`, {
      data: testUser
    });
    expect([200, 201]).toContain(regRes.status());
  });

  test('Complete Browser Login Flow, Error Clearing, Dashboard Navigation and Logout', async ({ page }) => {
    // 1. Visit Login page
    await page.goto(`${FRONTEND_URL}/login`);
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('h2')).toContainText('Welcome Back');

    // 2. Submit deliberately incorrect password
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[placeholder="••••••••"]');
    const submitButton = page.locator('button[type="submit"]');

    await emailInput.fill(testUser.email);
    await passwordInput.fill('WrongPassword999!');
    await submitButton.click();

    // 3. Verify error message appears
    const errorBanner = page.locator('div.bg-red-50');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('Incorrect email or password');

    // 4. Verify typing in password input immediately clears error banner
    await passwordInput.fill('AnotherTypo');
    await expect(errorBanner).not.toBeVisible();

    // 5. Submit valid credentials
    await passwordInput.fill(testUser.password);
    await submitButton.click();

    // 6. Verify navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page).toHaveURL(/.*dashboard/);

    // 7. Verify dashboard elements are loaded
    await expect(page.getByRole('heading', { name: 'Cash Flow Overview' })).toBeVisible({ timeout: 10000 });

    // 8. Test Logout via Profile Dropdown
    const profileBtn = page.locator('[data-dropdown="profile"] button').first();
    await profileBtn.click();
    const logoutBtn = page.locator('button:has-text("Log out")');
    await expect(logoutBtn).toBeVisible({ timeout: 5000 });
    await logoutBtn.click();
    await page.waitForURL('**/login', { timeout: 10000 });
    await expect(page).toHaveURL(/.*login/);

    // 9. Verify accessing protected route while logged out redirects to /login
    await page.goto(`${FRONTEND_URL}/dashboard`);
    await page.waitForURL('**/login', { timeout: 10000 });
    await expect(page).toHaveURL(/.*login/);
  });
});
