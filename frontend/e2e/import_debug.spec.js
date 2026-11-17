import { test as base, expect } from '@playwright/test';

const test = base.extend({
  browser: async ({ playwright }, use) => {
    const browser = await playwright.chromium.launch({
      channel: 'msedge',
      headless: true
    });
    await use(browser);
    await browser.close();
  },
});

const API_BASE = process.env.API_BASE_URL || process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8001';
const FRONTEND_BASE = process.env.E2E_BASE_URL || 'http://localhost:3001';

test('Diagnose Import Transactions page loading and network requests', async ({ page, request }) => {
  const testUser = {
    email: `import_diag_${Date.now()}@example.com`,
    password: 'TestPassword123!',
    full_name: 'Import Diagnostic User'
  };

  // 1. Register test user
  const regRes = await request.post(`${API_BASE}/api/v1/auth/register`, { data: testUser });
  expect([200, 201]).toContain(regRes.status());

  // 2. Login user
  const loginRes = await request.post(`${API_BASE}/api/v1/auth/login`, {
    form: { username: testUser.email, password: testUser.password }
  });
  expect(loginRes.status()).toBe(200);
  const { access_token } = await loginRes.json();

  // Monitor network requests & responses
  const networkLogs = [];
  page.on('request', req => {
    networkLogs.push(`[REQ] ${req.method()} ${req.url()}`);
  });
  page.on('response', res => {
    networkLogs.push(`[RES] ${res.status()} ${res.request().method()} ${res.url()}`);
  });
  page.on('console', msg => {
    networkLogs.push(`[CONSOLE] ${msg.type()}: ${msg.text()}`);
  });

  // Set auth token in localStorage before navigating
  await page.addInitScript((token) => {
    localStorage.setItem('token', token);
  }, access_token);

  // Navigate to http://localhost:3001/import
  console.log('Navigating to http://localhost:3001/import...');
  await page.goto('http://localhost:3001/import');
  await page.waitForLoadState('networkidle');

  // Check page content
  const pageText = await page.innerText('body');
  console.log('--- NETWORK LOGS ---');
  networkLogs.forEach(l => console.log(l));
  console.log('--- PAGE TEXT PREVIEW ---');
  console.log(pageText.slice(0, 500));

  // Check if error box with "Not Found" exists
  const redAlert = await page.$('.bg-danger\\/10');
  if (redAlert) {
    const alertText = await redAlert.innerText();
    console.log('RED ALERT FOUND:', alertText);
  } else {
    console.log('No red alert found on initial load.');
  }
});
