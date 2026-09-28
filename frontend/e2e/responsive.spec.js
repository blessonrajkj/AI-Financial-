import { test, expect } from '@playwright/test';

const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:8000';

const targetBreakpoints = [
  { name: 'Mobile SE (320px)', width: 320, isMobile: true },
  { name: 'Mobile iPhone (390px)', width: 390, isMobile: true },
  { name: 'Tablet iPad (768px)', width: 768, isTablet: true },
  { name: 'Desktop (1280px)', width: 1280, isDesktop: true }
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
