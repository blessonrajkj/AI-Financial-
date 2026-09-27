# PariView — Production Smoke Test Suite & Synthetic Verification

## Overview

This document defines the post-deployment smoke test procedure to verify that a freshly deployed PariView production environment operates cleanly using synthetic test accounts.

> **Rules**: Use synthetic test data only. Never perform smoke tests using real user bank accounts or real personal details.

---

## Post-Deployment Smoke Test Protocol

| Test # | Workflow Stage | Synthetic Test Details | Expected Result |
| :--- | :--- | :--- | :--- |
| **1** | **Health Check** | `GET /health` | HTTP 200 `{"status": "ok", "database": "connected"}` |
| **2** | **Registration** | Create synthetic user `smoke_user@example.com` | HTTP 201 Created |
| **3** | **Login & JWT** | Submit credentials to `/api/v1/auth/login` | HTTP 200 returns valid JWT token |
| **4** | **Dashboard** | Load `/api/v1/analytics/summary` | HTTP 200 returns initial zeroed financial metrics |
| **5** | **Add Record** | POST Income transaction ₹50,000 & Expense ₹3,500 | HTTP 201 Created |
| **6** | **CSV Import** | Upload `sample_transactions.csv` | HTTP 200 returns imported transaction counts |
| **7** | **PDF Parser** | Upload `sample_sbi_statement.pdf` | HTTP 200 parses SBI statement cleanly |
| **8** | **Budgets** | POST budget ₹10,000 for "Food & Dining" | HTTP 201 Created |
| **9** | **Investments** | Add stock record 10 shares @ ₹3,500 | HTTP 201 Created |
| **10** | **Reports** | Download PDF report `/api/v1/analytics/export/pdf` | HTTP 200 returns valid `application/pdf` binary |
| **11** | **User Isolation**| Login as `smoke_user_2`, request transactions | Returns 0 transactions (User A data isolated) |
| **12** | **Persistence** | Re-login as `smoke_user_1` | All synthetic records remain 100% intact |

---

## Execution Command
```bash
cd frontend
npx playwright test e2e/workflow.spec.js
```
