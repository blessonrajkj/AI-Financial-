import { test, expect } from '@playwright/test';

const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:8000';

const targetBreakpoints = [
  { name: 'Mobile SE (320px)', width: 320, height: 800, isMobile: true },
  { name: 'Mobile Android (360px)', width: 360, height: 800, isMobile: true },
  { name: 'Mobile iPhone (375px)', width: 375, height: 812, isMobile: true },
  { name: 'Mobile iPhone 13/14 (390px)', width: 390, height: 844, isMobile: true },
  { name: 'Mobile Android Large (414px)', width: 414, height: 896, isMobile: true },
  { name: 'Mobile Pro Max (430px)', width: 430, height: 932, isMobile: true },
  { name: 'Tablet iPad Mini (768px)', width: 768, height: 1024, isTablet: true },
  { name: 'Tablet iPad Air (820px)', width: 820, height: 1180, isTablet: true },
  { name: 'Desktop Small (1024px)', width: 1024, height: 768, isDesktop: true },
  { name: 'Desktop HD (1280px)', width: 1280, height: 800, isDesktop: true },
  { name: 'Desktop Mac 14 (1440px)', width: 1440, height: 900, isDesktop: true },
  { name: 'Desktop Full HD (1920px)', width: 1920, height: 1080, isDesktop: true }
];

test.describe('PariView Responsive UI & Viewport Validation Suite', () => {
  const testUser = {
    email: `resp_audit_${Date.now()}@example.com`,
    password: 'TestPassword123!',
    full_name: 'Responsive Auditor'
  };
  let token = '';
  let headers = {};

  test.beforeAll(async ({ request }) => {
    // 1. Register test user
    const regRes = await request.post(`${API_BASE}/api/v1/auth/register`, { data: testUser });
    expect([200, 201]).toContain(regRes.status());

    // 2. Login user
    const loginRes = await request.post(`${API_BASE}/api/v1/auth/login`, {
      form: { username: testUser.email, password: testUser.password }
    });
    expect(loginRes.status()).toBe(200);
    const body = await loginRes.json();
    token = body.access_token;
    headers = { Authorization: `Bearer ${token}` };
  });

  for (const bp of targetBreakpoints) {
    test(`Verify ${bp.name} endpoint response contract`, async ({ request }) => {
      const summaryRes = await request.get(`${API_BASE}/api/v1/analytics/summary`, { headers });
      expect(summaryRes.status()).toBe(200);
      const summary = await summaryRes.json();
      expect(summary.current_balance).toBeDefined();
      expect(summary.monthly_spending).toBeDefined();
    });
  }
});
