# PARIVIEW — EXHAUSTIVE API ENDPOINTS REFERENCE

**Generated Date:** 2026-09-29T17:25:57.281065+00:00  
**Git Commit:** `335aa4dfd9d0cb6e2f53769d60befad9e76e501c`  
**Total Registered Endpoints:** `69` across `18` APIRouters  

## Registered Endpoints Inventory

| HTTP Method | Endpoint Path | Tags / Router | Summary |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | `auth` | `Register` |
| `POST` | `/api/v1/auth/login` | `auth` | `Login` |
| `GET, PUT` | `/api/v1/auth/me` | `auth` | `Read User Me` |
| `POST` | `/api/v1/auth/me/avatar` | `auth` | `Upload Avatar` |
| `GET, POST` | `/api/v1/accounts/` | `accounts` | `Get User Accounts` |
| `GET, PUT, DELETE` | `/api/v1/accounts/{account_id}` | `accounts` | `Get Account` |
| `GET, POST` | `/api/v1/transfers/` | `transfers` | `Get User Transfers` |
| `GET, POST` | `/api/v1/liabilities/` | `liabilities` | `Get User Liabilities` |
| `GET` | `/api/v1/liabilities/summary` | `liabilities` | `Get Liabilities Summary` |
| `GET, PUT, DELETE` | `/api/v1/liabilities/{liability_id}` | `liabilities` | `Get Liability` |
| `GET, POST` | `/api/v1/transactions` | `transactions` | `Read Transactions` |
| `GET` | `/api/v1/transactions/taxonomy` | `transactions` | `Get Category Taxonomy` |
| `GET, PUT, DELETE` | `/api/v1/transactions/{id}` | `transactions` | `Read Transaction` |
| `POST` | `/api/v1/transactions/bulk-delete` | `transactions` | `Bulk Delete Transactions` |
| `GET, POST` | `/api/v1/transactions/categories/all` | `transactions` | `Read Categories` |
| `GET, POST` | `/api/v1/transactions/merchants/all` | `transactions` | `Read Merchants` |
| `POST` | `/api/v1/transactions/import` | `transactions` | `Import Transactions` |
| `POST` | `/api/v1/transactions/upload-parse` | `transactions` | `Upload And Parse Statement` |
| `POST` | `/api/v1/transactions/bulk-validate` | `transactions` | `Bulk Validate Transactions` |
| `POST` | `/api/v1/transactions/bulk-import` | `transactions` | `Bulk Import Transactions` |
| `GET, POST` | `/api/v1/budgets` | `budgets` | `Read Budgets` |
| `PUT, DELETE` | `/api/v1/budgets/{id}` | `budgets` | `Update Budget` |
| `GET` | `/api/v1/budgets/status` | `budgets` | `Get Budgets Status` |
| `POST` | `/api/v1/receipts/upload` | `receipts` | `Upload Receipt` |
| `POST` | `/api/v1/receipts/scan-upi` | `receipts` | `Scan Upi Screenshot` |
| `POST` | `/api/v1/receipts/confirm/{receipt_id}` | `receipts` | `Confirm Receipt` |
| `GET` | `/api/v1/analytics/summary` | `analytics` | `Get Dashboard Summary` |
| `GET` | `/api/v1/analytics/notifications` | `analytics` | `Get User Notifications` |
| `POST` | `/api/v1/analytics/notifications/{id}/read` | `analytics` | `Mark Notification Read` |
| `POST` | `/api/v1/analytics/notifications/mark-all-read` | `analytics` | `Mark All Notifications Read` |
| `GET` | `/api/v1/analytics/trends` | `analytics` | `Get Spending Trends` |
| `GET` | `/api/v1/analytics/forecast` | `analytics` | `Get Forecast` |
| `GET` | `/api/v1/analytics/fraud` | `analytics` | `Get Fraud Warnings` |
| `GET` | `/api/v1/analytics/top-merchants` | `analytics` | `Get Top Merchants` |
| `GET` | `/api/v1/analytics/export/csv` | `analytics` | `Export Csv` |
| `GET` | `/api/v1/analytics/export/excel` | `analytics` | `Export Excel` |
| `GET` | `/api/v1/analytics/export/pdf` | `analytics` | `Export Pdf` |
| `GET` | `/api/v1/analytics/reports/generate` | `analytics` | `Generate Custom Report` |
| `GET` | `/api/v1/analytics/dashboard/ai-summary` | `analytics` | `Get Dashboard Ai Summary` |
| `POST` | `/api/v1/ai/chat` | `ai` | `Chat With Finny` |
| `POST` | `/api/v1/ai/voice-entry` | `ai` | `Parse Voice Transaction` |
| `POST` | `/api/v1/ai/voice-entry/confirm` | `ai` | `Confirm Voice Transaction` |
| `GET` | `/api/v1/ai/insights` | `ai` | `Get Insights` |
| `GET, POST` | `/api/v1/settings/subscriptions` | `settings` | `Read Subscriptions` |
| `PUT, DELETE` | `/api/v1/settings/subscriptions/{id}` | `settings` | `Update Subscription` |
| `GET, POST` | `/api/v1/settings/investments` | `settings` | `Read Investments` |
| `PUT, DELETE` | `/api/v1/settings/investments/{id}` | `settings` | `Update Investment` |
| `GET, POST` | `/api/v1/savings` | `savings` | `Get Savings Goals` |
| `PUT, DELETE` | `/api/v1/savings/{goal_id}` | `savings` | `Update Savings Goal` |
| `GET, POST` | `/api/v1/investments` | `investments` | `Get Investments` |
| `PUT, DELETE` | `/api/v1/investments/{inv_id}` | `investments` | `Update Investment` |
| `GET, POST` | `/api/v1/subscriptions` | `subscriptions` | `Get Subscriptions` |
| `PUT, DELETE` | `/api/v1/subscriptions/{sub_id}` | `subscriptions` | `Update Subscription` |
| `GET, POST` | `/api/v1/india-post-investments` | `india-post-investments` | `Get Investments` |
| `GET` | `/api/v1/india-post-investments/summary` | `india-post-investments` | `Get Investments Summary` |
| `GET` | `/api/v1/india-post-investments/ai-insights` | `india-post-investments` | `Get Ai Insights` |
| `GET, PUT, DELETE` | `/api/v1/india-post-investments/{inv_id}` | `india-post-investments` | `Get Investment` |
| `GET` | `/api/v1/user/export-data` | `user_privacy` | `Export User Data` |
| `DELETE` | `/api/v1/user/delete-account` | `user_privacy` | `Delete User Account` |
| `GET, PUT, DELETE` | `/api/v1/profile` | `profile` | `Get Profile` |
| `POST, DELETE` | `/api/v1/profile/avatar` | `profile` | `Upload Avatar` |
| `GET, PUT` | `/api/v1/settings` | `profile` | `Get User Settings` |
| `POST` | `/api/v1/auth/change-password` | `profile` | `Change Password` |
| `GET` | `/api/v1/banks` | `profile` | `Get Linked Banks` |
| `POST` | `/api/v1/banks/link` | `profile` | `Link Bank` |
| `PUT, DELETE` | `/api/v1/banks/{id}` | `profile` | `Update Bank` |
| `GET` | `/api/v1/profile/export` | `profile` | `Export Profile Data` |
| `GET` | `/` | `system` | `Read Root` |
| `GET` | `/health` | `system` | `Health Check` |
