import { test, expect } from '@playwright/test';

const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:8000';

test.describe('PariView Complete E2E Workflow & API Pipeline', () => {
  const testUser = {
    email: `ci_e2e_${Date.now()}@example.com`,
    password: 'TestPassword123!',
    full_name: 'CI Pipeline User'
  };
  let authToken = '';
  let authHeaders = {};

  test.beforeAll(async ({ request }) => {
    // Register test user
    const regRes = await request.post(`${API_BASE}/api/v1/auth/register`, {
      data: testUser
    });
    expect([200, 201]).toContain(regRes.status());

    // Login user
    const loginRes = await request.post(`${API_BASE}/api/v1/auth/login`, {
      form: {
        username: testUser.email,
        password: testUser.password
      }
    });
    expect(loginRes.status()).toBe(200);
    const body = await loginRes.json();
    authToken = body.access_token;
    authHeaders = { Authorization: `Bearer ${authToken}` };
  });

  test('1. User Auth Token Verification', async () => {
    expect(authToken).toBeTruthy();
    expect(authHeaders.Authorization).toContain('Bearer ');
  });

  test('2. Category Taxonomy & Hierarchical Categories', async ({ request }) => {
    const catRes = await request.get(`${API_BASE}/api/v1/transactions/taxonomy`, { headers: authHeaders });
    expect(catRes.status()).toBe(200);
    const taxonomy = await catRes.json();
    expect(taxonomy.expense).toBeTruthy();
    expect(taxonomy.income).toBeTruthy();
    expect(taxonomy.expense['Food & Dining']).toBeTruthy();
  });

  test('3. Add Manual Record & Financial Math Verification', async ({ request }) => {
    // Create Income Transaction
    const incRes = await request.post(`${API_BASE}/api/v1/transactions/`, {
      headers: authHeaders,
      data: {
        amount: 50000.00,
        type: 'income',
        category: 'Salary',
        subcategory: 'Base',
        description: 'Monthly Salary Payment',
        date: new Date().toISOString()
      }
    });
    expect([200, 201]).toContain(incRes.status());

    // Create Expense Transaction
    const expRes = await request.post(`${API_BASE}/api/v1/transactions/`, {
      headers: authHeaders,
      data: {
        amount: 3500.50,
        type: 'expense',
        category: 'Food & Dining',
        subcategory: 'Groceries',
        description: 'Supermarket Groceries',
        date: new Date().toISOString()
      }
    });
    expect([200, 201]).toContain(expRes.status());

    // Fetch Analytics Summary & Verify Net Income Math (50000 - 3500.50 = 46499.50 balance)
    const summaryRes = await request.get(`${API_BASE}/api/v1/analytics/summary`, { headers: authHeaders });
    expect(summaryRes.status()).toBe(200);
    const summary = await summaryRes.json();
    expect(summary.monthly_income).toBe(50000.00);
    expect(summary.monthly_spending).toBe(3500.50);
    expect(summary.current_balance).toBe(46499.50);
  });

  test('4. Budget Creation & Category Integration', async ({ request }) => {
    // Fetch categories to get category_id for Food & Dining
    const catsRes = await request.get(`${API_BASE}/api/v1/transactions/categories/all`, { headers: authHeaders });
    expect(catsRes.status()).toBe(200);
    const categories = await catsRes.json();
    const foodCat = categories.find(c => c.name === 'Food & Dining') || categories[0];
    expect(foodCat).toBeTruthy();

    const now = new Date();
    const budgetRes = await request.post(`${API_BASE}/api/v1/budgets/`, {
      headers: authHeaders,
      data: {
        category_id: foodCat.id,
        amount: 10000.00,
        month: now.getMonth() + 1,
        year: now.getFullYear()
      }
    });
    expect([200, 201]).toContain(budgetRes.status());

    const getBudgets = await request.get(`${API_BASE}/api/v1/budgets/`, { headers: authHeaders });
    expect(getBudgets.status()).toBe(200);
    const budgets = await getBudgets.json();
    expect(budgets.length).toBeGreaterThan(0);
  });

  test('5. Report Generation (PDF & Excel Export)', async ({ request }) => {
    // PDF Export
    const pdfRes = await request.get(`${API_BASE}/api/v1/analytics/export/pdf`, { headers: authHeaders });
    expect(pdfRes.status()).toBe(200);
    expect(pdfRes.headers()['content-type']).toContain('application/pdf');

    // Excel Export
    const excelRes = await request.get(`${API_BASE}/api/v1/analytics/export/excel`, { headers: authHeaders });
    expect(excelRes.status()).toBe(200);
    expect(excelRes.headers()['content-type']).toContain('spreadsheetml');
  });

  test('6. User Data Isolation & Security Check', async ({ request }) => {
    // Create second user
    const user2 = {
      email: `ci_isolated_${Date.now()}@example.com`,
      password: 'TestPassword123!',
      full_name: 'Isolated User'
    };

    await request.post(`${API_BASE}/api/v1/auth/register`, { data: user2 });
    const login2 = await request.post(`${API_BASE}/api/v1/auth/login`, {
      form: { username: user2.email, password: user2.password }
    });
    const body2 = await login2.json();
    const token2 = body2.access_token;

    // Fetch transactions as user 2 — should NOT contain User 1's salary transaction
    const tx2 = await request.get(`${API_BASE}/api/v1/transactions/`, {
      headers: { Authorization: `Bearer ${token2}` }
    });
    expect(tx2.status()).toBe(200);
    const user2Tx = await tx2.json();
    expect(Array.isArray(user2Tx)).toBe(true);
    expect(user2Tx.length).toBe(0);
  });
});
