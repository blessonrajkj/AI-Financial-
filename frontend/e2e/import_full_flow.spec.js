import { test as base, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function createFreshUser(request, prefix) {
  const email = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
  const password = 'TestPassword123!';
  const reg = await request.post(`${API_BASE}/api/v1/auth/register`, {
    data: { email, password, full_name: `User ${prefix}` }
  });
  expect([200, 201]).toContain(reg.status());

  const login = await request.post(`${API_BASE}/api/v1/auth/login`, {
    form: { username: email, password }
  });
  expect(login.status()).toBe(200);
  const data = await login.json();
  return { email, token: data.access_token };
}

test.describe('Universal Import System - Full Browser E2E Flow', () => {

  test('Upload CSV -> Preview -> Bulk Import into PostgreSQL -> Dashboard Refresh', async ({ page, request }) => {
    const { token } = await createFreshUser(request, 'csv_user');

    await page.addInitScript((t) => {
      localStorage.setItem('token', t);
    }, token);

    // 1. Visit /import
    await page.goto('http://localhost:3001/import');
    await page.waitForLoadState('networkidle');

    // Confirm no red alert
    const redAlert = await page.$('.bg-danger\\/10');
    expect(redAlert).toBeNull();

    // 2. Upload CSV
    const csvPath = path.resolve(__dirname, '../../backend/tests/fixtures/sample_transactions.csv');
    const fileInput = await page.$('input[type="file"]');
    expect(fileInput).not.toBeNull();
    await fileInput.setInputFiles(csvPath);

    // Wait for parse response and preview table to appear
    await page.waitForSelector('text=Statement Preview', { timeout: 15000 });
    
    // Check that preview rows are rendered
    const rows = await page.$$('tbody tr');
    expect(rows.length).toBe(3);
    console.log(`CSV preview loaded ${rows.length} rows`);

    // 3. Click Import Transactions button
    const importBtn = await page.locator('button:has-text("Import Transactions")');
    await expect(importBtn).toBeVisible();
    await importBtn.click();

    // Wait for success banner
    await page.waitForSelector('text=Statement Import Complete!', { timeout: 15000 });
    console.log('CSV Import Successful confirmed in UI');

    // 4. Verify in PostgreSQL via API
    const txRes = await request.get(`${API_BASE}/api/v1/transactions/`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(txRes.status()).toBe(200);
    const txData = await txRes.json();
    expect(txData.length).toBe(3);
    console.log(`Confirmed ${txData.length} transactions saved in PostgreSQL for user`);

    // 5. Navigate to Dashboard and verify data appears
    await page.goto('http://localhost:3001/dashboard');
    await page.waitForLoadState('networkidle');
    const dashText = await page.innerText('body');
    expect(dashText).toContain('INCOME');
    expect(dashText).toContain('SPENDING');
    expect(dashText).toContain('₹50,000');
    expect(dashText).toContain('Monthly Salary');
    console.log('Dashboard successfully refreshed with imported financial metrics');
  });

  test('Upload SBI PDF -> Monospace Parsing -> Preview -> Bulk Import', async ({ page, request }) => {
    const { token } = await createFreshUser(request, 'sbi_pdf_user');

    await page.addInitScript((t) => {
      localStorage.setItem('token', t);
    }, token);

    await page.goto('http://localhost:3001/import');
    await page.waitForLoadState('networkidle');

    const pdfPath = path.resolve(__dirname, '../../backend/tests/fixtures/sample_sbi_statement.pdf');
    const fileInput = await page.$('input[type="file"]');
    await fileInput.setInputFiles(pdfPath);

    await page.waitForSelector('text=Statement Preview', { timeout: 20000 });
    const rows = await page.$$('tbody tr');
    expect(rows.length).toBe(3);
    console.log(`SBI PDF preview loaded ${rows.length} rows`);

    // Click Import
    const importBtn = await page.locator('button:has-text("Import Transactions")');
    await importBtn.click();

    await page.waitForSelector('text=Statement Import Complete!', { timeout: 15000 });
    console.log('SBI PDF Import Successful confirmed in UI');

    // Verify in PostgreSQL
    const txRes = await request.get(`${API_BASE}/api/v1/transactions/`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(txRes.status()).toBe(200);
    const txData = await txRes.json();
    expect(txData.length).toBe(3);
    console.log(`Confirmed ${txData.length} SBI transactions saved in PostgreSQL for user`);
  });

  test('Upload Excel XLSX -> Parse Table -> Preview -> Commit', async ({ page, request }) => {
    const { token } = await createFreshUser(request, 'excel_user');

    await page.addInitScript((t) => {
      localStorage.setItem('token', t);
    }, token);

    await page.goto('http://localhost:3001/import');
    await page.waitForLoadState('networkidle');

    const xlsxPath = path.resolve(__dirname, '../../backend/tests/fixtures/sample_test_statement.xlsx');
    const fileInput = await page.$('input[type="file"]');
    await fileInput.setInputFiles(xlsxPath);

    await page.waitForSelector('text=Statement Preview', { timeout: 20000 });
    const rows = await page.$$('tbody tr');
    expect(rows.length).toBe(3);
    console.log(`Excel XLSX preview loaded ${rows.length} rows`);

    // Click Import
    const importBtn = await page.locator('button:has-text("Import Transactions")');
    await importBtn.click();

    await page.waitForSelector('text=Statement Import Complete!', { timeout: 15000 });
    console.log('Excel XLSX Import Successful confirmed in UI');

    // Verify in PostgreSQL
    const txRes = await request.get(`${API_BASE}/api/v1/transactions/`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(txRes.status()).toBe(200);
    const txData = await txRes.json();
    expect(txData.length).toBe(3);
    console.log(`Confirmed ${txData.length} Excel transactions saved in PostgreSQL for user`);
  });
});
