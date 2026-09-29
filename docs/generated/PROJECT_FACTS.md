# PARIVIEW — GENERATED PROJECT FACTS

**Generated Date:** 2026-09-29T16:56:54.809829+00:00  
**Git Commit:** `cf84d44c53d78e24708e58b6bea5692d439a3d0a`  
**Git Branch:** `master`  
**Commit Timestamp:** `2026-09-29 15:30:10 +0530`  

## 1. System Metadata

- **Python Version:** 3.13.14
- **Backend Framework:** FastAPI 0.139.0
- **Frontend Framework:** React ^18.2.0 (Vite ^4.3.9)
- **Database Backend:** PostgreSQL (Production) / SQLite (Fallback)
- **Object Storage Backend:** S3StorageProvider (AWS S3 / MinIO) / LocalStorageProvider
- **Alembic Migration Head:** `b7f8bbbeff6f_remediation_financial_precision_and_new_models.py`

## 2. API & Database Metrics

- **Database Tables (24):** accounts, audit_logs, budgets, categories, category_feedbacks, chat_history, import_batches, india_post_investments, india_post_rates, investment_transactions, investments, liabilities, linked_banks, merchants, notifications, receipts, savings_goals, subscriptions, transactions, transfers, user_profiles, user_settings, users, voice_logs
- **API Router Count:** 18
- **Registered Endpoints Count:** 69

### Endpoint Paths & HTTP Methods

| HTTP Method | Endpoint Path | Name |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | `Register` |
| `POST` | `/api/v1/auth/login` | `Login` |
| `GET, PUT` | `/api/v1/auth/me` | `Read User Me` |
| `POST` | `/api/v1/auth/me/avatar` | `Upload Avatar` |
| `GET, POST` | `/api/v1/accounts/` | `Get User Accounts` |
| `GET, PUT, DELETE` | `/api/v1/accounts/{account_id}` | `Get Account` |
| `GET, POST` | `/api/v1/transfers/` | `Get User Transfers` |
| `GET, POST` | `/api/v1/liabilities/` | `Get User Liabilities` |
| `GET` | `/api/v1/liabilities/summary` | `Get Liabilities Summary` |
| `GET, PUT, DELETE` | `/api/v1/liabilities/{liability_id}` | `Get Liability` |
| `GET, POST` | `/api/v1/transactions` | `Read Transactions` |
| `GET` | `/api/v1/transactions/taxonomy` | `Get Category Taxonomy` |
| `GET, PUT, DELETE` | `/api/v1/transactions/{id}` | `Read Transaction` |
| `POST` | `/api/v1/transactions/bulk-delete` | `Bulk Delete Transactions` |
| `GET, POST` | `/api/v1/transactions/categories/all` | `Read Categories` |
| `GET, POST` | `/api/v1/transactions/merchants/all` | `Read Merchants` |
| `POST` | `/api/v1/transactions/import` | `Import Transactions` |
| `POST` | `/api/v1/transactions/upload-parse` | `Upload And Parse Statement` |
| `POST` | `/api/v1/transactions/bulk-validate` | `Bulk Validate Transactions` |
| `POST` | `/api/v1/transactions/bulk-import` | `Bulk Import Transactions` |
| `GET, POST` | `/api/v1/budgets` | `Read Budgets` |
| `PUT, DELETE` | `/api/v1/budgets/{id}` | `Update Budget` |
| `GET` | `/api/v1/budgets/status` | `Get Budgets Status` |
| `POST` | `/api/v1/receipts/upload` | `Upload Receipt` |
| `POST` | `/api/v1/receipts/scan-upi` | `Scan Upi Screenshot` |
| `POST` | `/api/v1/receipts/confirm/{receipt_id}` | `Confirm Receipt` |
| `GET` | `/api/v1/analytics/summary` | `Get Dashboard Summary` |
| `GET` | `/api/v1/analytics/notifications` | `Get User Notifications` |
| `POST` | `/api/v1/analytics/notifications/{id}/read` | `Mark Notification Read` |
| `POST` | `/api/v1/analytics/notifications/mark-all-read` | `Mark All Notifications Read` |
| `GET` | `/api/v1/analytics/trends` | `Get Spending Trends` |
| `GET` | `/api/v1/analytics/forecast` | `Get Forecast` |
| `GET` | `/api/v1/analytics/fraud` | `Get Fraud Warnings` |
| `GET` | `/api/v1/analytics/top-merchants` | `Get Top Merchants` |
| `GET` | `/api/v1/analytics/export/csv` | `Export Csv` |
| `GET` | `/api/v1/analytics/export/excel` | `Export Excel` |
| `GET` | `/api/v1/analytics/export/pdf` | `Export Pdf` |
| `GET` | `/api/v1/analytics/reports/generate` | `Generate Custom Report` |
| `GET` | `/api/v1/analytics/dashboard/ai-summary` | `Get Dashboard Ai Summary` |
| `POST` | `/api/v1/ai/chat` | `Chat With Finny` |
| `POST` | `/api/v1/ai/voice-entry` | `Parse Voice Transaction` |
| `POST` | `/api/v1/ai/voice-entry/confirm` | `Confirm Voice Transaction` |
| `GET` | `/api/v1/ai/insights` | `Get Insights` |
| `GET, POST` | `/api/v1/settings/subscriptions` | `Read Subscriptions` |
| `PUT, DELETE` | `/api/v1/settings/subscriptions/{id}` | `Update Subscription` |
| `GET, POST` | `/api/v1/settings/investments` | `Read Investments` |
| `PUT, DELETE` | `/api/v1/settings/investments/{id}` | `Update Investment` |
| `GET, POST` | `/api/v1/savings` | `Get Savings Goals` |
| `PUT, DELETE` | `/api/v1/savings/{goal_id}` | `Update Savings Goal` |
| `GET, POST` | `/api/v1/investments` | `Get Investments` |
| `PUT, DELETE` | `/api/v1/investments/{inv_id}` | `Update Investment` |
| `GET, POST` | `/api/v1/subscriptions` | `Get Subscriptions` |
| `PUT, DELETE` | `/api/v1/subscriptions/{sub_id}` | `Update Subscription` |
| `GET, POST` | `/api/v1/india-post-investments` | `Get Investments` |
| `GET` | `/api/v1/india-post-investments/summary` | `Get Investments Summary` |
| `GET` | `/api/v1/india-post-investments/ai-insights` | `Get Ai Insights` |
| `GET, PUT, DELETE` | `/api/v1/india-post-investments/{inv_id}` | `Get Investment` |
| `GET` | `/api/v1/user/export-data` | `Export User Data` |
| `DELETE` | `/api/v1/user/delete-account` | `Delete User Account` |
| `GET, PUT, DELETE` | `/api/v1/profile` | `Get Profile` |
| `POST, DELETE` | `/api/v1/profile/avatar` | `Upload Avatar` |
| `GET, PUT` | `/api/v1/settings` | `Get User Settings` |
| `POST` | `/api/v1/auth/change-password` | `Change Password` |
| `GET` | `/api/v1/banks` | `Get Linked Banks` |
| `POST` | `/api/v1/banks/link` | `Link Bank` |
| `PUT, DELETE` | `/api/v1/banks/{id}` | `Update Bank` |
| `GET` | `/api/v1/profile/export` | `Export Profile Data` |
| `GET` | `/` | `Read Root` |
| `GET` | `/health` | `Health Check` |

## 3. Verified Test Metrics

- **Pytest Suite:** 55/55 Passed (Status: `PASS`)
- **Frontend Build:** PASS (Vite build verified)
- **E2E Playwright Suite:** PASS (Playwright verified)

## 4. Implemented Security & Controls

- **Authentication:** Argon2id password hashing + JWT Bearer Access/Refresh Tokens
- **Rate Limiting:** IP & User-scoped Token-Bucket Rate Limiter Middleware
- **Audit Logging:** Append-Only Security Audit Log (audit_logs table)
- **Privacy:** GDPR / DPDP JSON Data Export & Cascading Account Deletion
