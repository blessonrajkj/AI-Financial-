# PARIVIEW — ARCHITECTURE & TECHNICAL SPECIFICATION

**Project Name:** PariView  
**Tagline:** Your money. Your view. Your future.  
**Generated Date:** 29 September 2026  
**Repository:** `blessonrajkj/AI-Financial-`  
**Git Commit:** `a57de5e4ba29cfb9d6b3a7e420e514cce6f4c7b1`  

---

## 1. System Architecture Overview

PariView follows a multi-tier, decoupled micro-architecture consisting of a single-page frontend application (SPA), a high-performance RESTful API backend, a relational database layer, an object storage service, and dedicated background processing engines.

```
+---------------------------------------------------------------------------------------+
|                                    CLIENT TIER                                        |
|             React 18 + Vite SPA (Tailwind CSS, Recharts, Lucide Icons)                |
+---------------------------------------------------------------------------------------+
                                           │
                                           │ HTTP / HTTPS (REST API)
                                           │ Headers: Authorization: Bearer <JWT>
                                           ▼
+---------------------------------------------------------------------------------------+
|                                    BACKEND TIER                                       |
|             FastAPI Server (Uvicorn ASGI, Pydantic v2, Python 3.11+)                  |
|                                                                                       |
|   +-------------------+  +--------------------+  +------------------+  +--------------+ |
|   | Auth & Security   |  | Transaction Engine |  | Financial Analytics| | Document OCR | |
|   | (Passlib/PyJWT)   |  | (CRUD / Imports)   |  | & AI Forecaster  | | & PDF Parser | |
|   +-------------------+  +--------------------+  +------------------+  +--------------+ |
+---------------------------------------------------------------------------------------+
           │                         │                     │                  │
           ▼                         ▼                     ▼                  ▼
+---------------------+    +--------------------+  +---------------+  +-----------------+
| Relational Database |    | Object Storage     |  | Market Data   |  | Machine Learning|
| PostgreSQL /        |    | S3StorageProvider /|  | Service       |  | Categorizer     |
| SQLAlchemy / Alembic|    | LocalStorage       |  | Yahoo Finance |  | Scikit-learn    |
+---------------------+    +--------------------+  +---------------+  +-----------------+
```

---

## 2. Relational Database Architecture

PariView uses **PostgreSQL** as its primary production relational database, managed via **SQLAlchemy ORM** and version-controlled using **Alembic** migrations (`backend/alembic/versions/`). A lightweight **SQLite** database (`finance.db`) remains supported for zero-dependency local developer environments.

### Core Database Schema & Models

#### 1. `users` Table (`app/models/user.py`)
- `id`: Integer, Primary Key, Indexed
- `email`: String, Unique, Indexed, Nullable=False
- `hashed_password`: String, Nullable=False
- `full_name`: String, Nullable=True
- `role`: String, Default="user"
- `is_active`: Boolean, Default=True
- `created_at`: DateTime(timezone=True), Server Default=func.now()
- `updated_at`: DateTime(timezone=True), Server Default=func.now(), OnUpdate=func.now()
- **Relationships:** `transactions`, `budgets`, `investments`, `savings_goals`, `subscriptions`, `notifications`, `chat_histories`, `import_batches`, `receipts`, `india_post_investments`, `voice_logs`, `profile`, `linked_banks`, `settings` (all with `cascade="all, delete-orphan"`).

#### 2. `transactions` Table (`app/models/transaction.py`)
- `id`: Integer, Primary Key, Indexed
- `user_id`: Integer, ForeignKey("users.id", ondelete="CASCADE"), Indexed, Nullable=False
- `amount`: Numeric(14,4), Nullable=False
- `date`: DateTime(timezone=True), Nullable=False, Indexed
- `description`: String, Nullable=False
- `category_id`: Integer, ForeignKey("categories.id", ondelete="SET NULL"), Nullable=True
- `merchant_id`: Integer, ForeignKey("merchants.id", ondelete="SET NULL"), Nullable=True
- `subcategory`: String, Nullable=True
- `payment_method`: String, Default="UPI"
- `type`: String, Nullable=False (Values: `"income"`, `"expense"`)
- `is_recurring`: Boolean, Default=False
- `reference_number`: String, Nullable=True, Indexed
- `transaction_id`: String, Nullable=True
- `bank`: String, Nullable=True
- `balance`: Numeric(14,4), Nullable=True
- `tags`: String, Nullable=True
- `created_at`: DateTime(timezone=True), Server Default=func.now()

#### 3. `budgets` Table (`app/models/budget.py`)
- `id`: Integer, Primary Key, Indexed
- `user_id`: Integer, ForeignKey("users.id", ondelete="CASCADE"), Indexed, Nullable=False
- `category_id`: Integer, ForeignKey("categories.id", ondelete="CASCADE"), Nullable=False
- `amount`: Numeric(14,4), Nullable=False
- `month`: Integer, Nullable=False (1–12)
- `year`: Integer, Nullable=False
- `created_at`: DateTime(timezone=True), Server Default=func.now()

#### 4. `investments` Table (`app/models/investment.py`)
- `id`: Integer, Primary Key, Indexed
- `user_id`: Integer, ForeignKey("users.id", ondelete="CASCADE"), Indexed, Nullable=False
- `asset_name`: String, Nullable=False
- `asset_type`: String, Nullable=False (Values: `"Stock"`, `"Mutual Fund"`, `"PPF"`, `"NPS"`, `"Gold"`, `"FD"`)
- `quantity`: Numeric(14,4), Nullable=False
- `purchase_price`: Numeric(14,4), Nullable=False
- `current_price`: Numeric(14,4), Nullable=False
- `purchase_date`: DateTime(timezone=True), Nullable=True
- `symbol`: String, Nullable=True
- `exchange`: String, Nullable=True
- `dividends_received`: Numeric(14,4), Default=0.0
- `created_at`: DateTime(timezone=True), Server Default=func.now()

#### 5. `india_post_investments` Table (`app/models/india_post_investment.py`)
- `id`: Integer, Primary Key, Indexed
- `user_id`: Integer, ForeignKey("users.id", ondelete="CASCADE"), Indexed, Nullable=False
- `category`: String, Default="India Post"
- `scheme_name`: String, Nullable=False (e.g. `"Public Provident Fund (PPF)"`, `"Sukanya Samriddhi Yojana (SSY)"`)
- `amount`: Numeric(14,4), Nullable=False
- `interest_rate`: Numeric(5,4), Nullable=False
- `investment_date`: DateTime(timezone=True), Nullable=False
- `maturity_date`: DateTime(timezone=True), Nullable=False
- `frequency`: String, Nullable=False (Values: `"One Time"`, `"Monthly"`)
- `account_number`: String, Nullable=True
- `branch_name`: String, Nullable=True
- `status`: String, Default="Active"
- `created_at`: DateTime(timezone=True), Server Default=func.now()

#### 6. `savings_goals` Table (`app/models/savings_goal.py`)
- `id`: Integer, Primary Key, Indexed
- `user_id`: Integer, ForeignKey("users.id", ondelete="CASCADE"), Indexed, Nullable=False
- `name`: String, Nullable=False
- `target_amount`: Numeric(14,4), Nullable=False
- `current_amount`: Numeric(14,4), Default=0.0
- `target_date`: DateTime(timezone=True), Nullable=False
- `created_at`: DateTime(timezone=True), Server Default=func.now()

#### 7. `subscriptions` Table (`app/models/subscription.py`)
- `id`: Integer, Primary Key, Indexed
- `user_id`: Integer, ForeignKey("users.id", ondelete="CASCADE"), Indexed, Nullable=False
- `name`: String, Nullable=False
- `amount`: Numeric(14,4), Nullable=False
- `billing_cycle`: String, Default="monthly"
- `next_billing_date`: DateTime(timezone=True), Nullable=False
- `is_active`: Boolean, Default=True
- `is_autopay`: Boolean, Default=False
- `created_at`: DateTime(timezone=True), Server Default=func.now()

#### 8. `notifications` Table (`app/models/notification.py`)
- `id`: Integer, Primary Key, Indexed
- `user_id`: Integer, ForeignKey("users.id", ondelete="CASCADE"), Indexed, Nullable=False
- `title`: String, Nullable=False
- `message`: String, Nullable=False
- `type`: String, Default="general"
- `is_read`: Boolean, Default=False
- `created_at`: DateTime(timezone=True), Server Default=func.now()

#### 9. `receipts` Table (`app/models/receipt.py`)
- `id`: Integer, Primary Key, Indexed
- `user_id`: Integer, ForeignKey("users.id", ondelete="CASCADE"), Indexed, Nullable=False
- `filename`: String, Nullable=False
- `file_path`: String, Nullable=False
- `merchant_name`: String, Nullable=True
- `total_amount`: Numeric(14,4), Nullable=True
- `transaction_date`: DateTime(timezone=True), Nullable=True
- `raw_text`: String, Nullable=True
- `status`: String, Default="processed"
- `created_at`: DateTime(timezone=True), Server Default=func.now()

#### 10. `import_batches` Table (`app/models/import_batch.py`)
- `id`: Integer, Primary Key, Indexed
- `user_id`: Integer, ForeignKey("users.id", ondelete="CASCADE"), Indexed, Nullable=False
- `file_name`: String, Nullable=False
- `file_type`: String, Nullable=False
- `total_records`: Integer, Default=0
- `imported_records`: Integer, Default=0
- `failed_records`: Integer, Default=0
- `created_at`: DateTime(timezone=True), Server Default=func.now()

#### 11. `accounts` Table (`app/models/account.py`)
- `id`: Integer, Primary Key, Indexed
- `user_id`: Integer, ForeignKey("users.id", ondelete="CASCADE"), Indexed, Nullable=False
- `account_name`: String, Nullable=False
- `account_type`: String, Nullable=False (Values: `"Savings"`, `"Checking"`, `"Credit Card"`, `"Investment"`, `"Cash"`)
- `account_number`: String, Nullable=True
- `institution_name`: String, Nullable=True
- `balance`: Numeric(14,4), Default=0.0000
- `currency`: String, Default="INR"
- `is_active`: Boolean, Default=True
- `created_at`: DateTime(timezone=True), Server Default=func.now()

#### 12. `transfers` Table (`app/models/transfer.py`)
- `id`: Integer, Primary Key, Indexed
- `user_id`: Integer, ForeignKey("users.id", ondelete="CASCADE"), Indexed, Nullable=False
- `from_account_id`: Integer, ForeignKey("accounts.id", ondelete="CASCADE"), Nullable=False
- `to_account_id`: Integer, ForeignKey("accounts.id", ondelete="CASCADE"), Nullable=False
- `amount`: Numeric(14,4), Nullable=False
- `fee`: Numeric(14,4), Default=0.0000
- `transfer_date`: DateTime(timezone=True), Nullable=False
- `description`: String, Nullable=True
- `reference_number`: String, Nullable=True
- `created_at`: DateTime(timezone=True), Server Default=func.now()

#### 13. `liabilities` Table (`app/models/liability.py`)
- `id`: Integer, Primary Key, Indexed
- `user_id`: Integer, ForeignKey("users.id", ondelete="CASCADE"), Indexed, Nullable=False
- `name`: String, Nullable=False
- `liability_type`: String, Nullable=False (Values: `"Credit Card"`, `"Personal Loan"`, `"Mortgage"`, `"Auto Loan"`, `"Other"`)
- `total_principal`: Numeric(14,4), Nullable=False
- `remaining_balance`: Numeric(14,4), Nullable=False
- `interest_rate_apr`: Numeric(5,2), Nullable=False
- `minimum_monthly_payment`: Numeric(14,4), Nullable=False
- `due_date_day`: Integer, Nullable=True
- `lender_name`: String, Nullable=True
- `created_at`: DateTime(timezone=True), Server Default=func.now()

#### 14. `india_post_rates` Table (`app/models/india_post_rate.py`)
- `id`: Integer, Primary Key, Indexed
- `scheme_code`: String, Nullable=False, Indexed (Values: `"PPF"`, `"SSY"`, `"MIS"`, `"SCSS"`, `"KVP"`, `"NSC"`)
- `effective_from`: Date, Nullable=False
- `effective_to`: Date, Nullable=True
- `annual_rate`: Numeric(5,4), Nullable=False
- `compounding_frequency`: String, Default="quarterly" (Values: `"quarterly"`, `"annually"`, `"monthly"`)

#### 15. `audit_logs` Table (`app/models/audit_log.py`)
- `id`: Integer, Primary Key, Indexed
- `user_id`: Integer, ForeignKey("users.id", ondelete="SET NULL"), Nullable=True
- `event_type`: String, Nullable=False (Values: `"LOGIN_SUCCESS"`, `"LOGIN_FAILURE"`, `"PASSWORD_CHANGE"`, `"DATA_EXPORT"`, `"ACCOUNT_DELETION"`)
- `ip_address`: String, Nullable=True
- `user_agent`: String, Nullable=True
- `details_json`: String, Nullable=True
- `created_at`: DateTime(timezone=True), Server Default=func.now()

---

## 3. API Route Architecture

PariView exposes a modular REST API under `/api/v1`, defined in `backend/app/api/v1/api.py`.

| Router Prefix | Module Path | Primary Purpose | Auth Requirement |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth` | `endpoints/auth.py` | Registration, OAuth2 Password Login, Token Refresh, User Profile | Public / Bearer Token |
| `/api/v1/accounts` | `endpoints/accounts.py` | Multi-Account Ledger Management & Balance Updates | Bearer Token |
| `/api/v1/transfers` | `endpoints/transfers.py` | Internal Account Transfers (excluded from cashflow) | Bearer Token |
| `/api/v1/liabilities` | `endpoints/liabilities.py` | Debt Liability Tracking, APR Scoring, Min Payment Math | Bearer Token |
| `/api/v1/transactions` | `endpoints/transactions.py` | Transaction CRUD, Bulk Imports, Fingerprinting, Category/Merchant Lookup | Bearer Token |
| `/api/v1/analytics` | `endpoints/analytics.py` | Summary Metrics, Monthly Trends, PDF/Excel Export, Custom Reports, AI Summary | Bearer Token |
| `/api/v1/budgets` | `endpoints/budgets.py` | Category Budget Limits, Spending Threshold Calculations | Bearer Token |
| `/api/v1/savings` | `endpoints/savings.py` | 3-Tier Savings Goals Management & Statistical Projections | Bearer Token |
| `/api/v1/investments` | `endpoints/investments.py` | Portfolio Holdings, Stock/MF CRUD, Transaction History, Yield Math | Bearer Token |
| `/api/v1/india-post-investments`| `endpoints/india_post_investments.py` | Small Savings Schemes (PPF, SSY, KVP, NSC) CRUD & Rate Lookup | Bearer Token |
| `/api/v1/subscriptions` | `endpoints/subscriptions.py` | Recurring Subscription Tracking & Renewal Alerts | Bearer Token |
| `/api/v1/receipts` | `endpoints/receipts.py` | OCR Receipt Upload, Text Parsing, Structured Data Extraction | Bearer Token |
| `/api/v1/user` | `endpoints/user_privacy.py` | GDPR Data Export (JSON) & Right to be Forgotten Deletion | Bearer Token |
| `/api/v1/ai` | `endpoints/ai.py` | Chatbot Assistant Interface, AI Financial Insights | Bearer Token |
| `/api/v1/profile` | `endpoints/profile_router.py` | User Profile Info, Avatar Upload, Linked Bank Accounts | Bearer Token |
| `/api/v1/settings` | `endpoints/settings.py` | Account Settings, Security Preferences, Password Update | Bearer Token |

---

## 4. Storage Architecture Abstraction

PariView implements a cloud-native, pluggable storage architecture (`backend/app/services/storage.py`) using the Factory pattern.

```
                            +--------------------------+
                            |     StorageService       |
                            | (Factory & API Interface)|
                            +--------------------------+
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
      +-------------------------+                 +--------------------------+
      |  LocalStorageProvider   |                 |    S3StorageProvider     |
      | (Local Dev Environment) |                 |   (AWS S3 / MinIO Engine)|
      +-------------------------+                 +--------------------------+
                   │                                           │
                   ▼                                           ▼
      Writes to local filesystem:                 Uploads using boto3 SDK to
      /app/uploads/user_<id>/...                  s3://<bucket>/uploads/user_<id>/...
```

### Storage Security & Traversal Protection Features:
1. **User Isolation:** All stored objects are keyed under user-scoped prefixes (`uploads/user_<id>/<filename>`).
2. **Path Traversal Shielding:** Filenames are sanitized via `os.path.basename()` to neutralize directory traversal attacks (`../`).
3. **Stream Cleanup:** Temporary files created during PDF/OCR processing are automatically cleaned up using Python `tempfile` context managers.

---

## 5. Security Architecture

1. **Password Security:** Passwords hashed with `passlib` using `bcrypt`/`argon2` schemes. Plaintext passwords are never logged or stored.
2. **JWT Authentication:** Stateless JWT access tokens signed with `HS256` HMAC algorithms using `SECRET_KEY` configuration.
3. **Database Isolation:** Every database query explicitly enforces `filter(Model.user_id == current_user.id)` to guarantee zero cross-tenant data leakage.
4. **CORS Configuration:** Explicit CORS origin whitelist configured in `app/core/config.py` (`BACKEND_CORS_ORIGINS`).

---

## 6. End-to-End Data Flow Diagrams

### 1. Bank PDF Statement Import Flow
```
User Upload (PDF) ──► StorageService (Save File) ──► PyMuPDF Structural Engine
                                                              │
                                                              ▼
DB Commit ◄── Duplicate Filter ◄── Category Taxonomy ◄── Extract Debit/Credit/Ref/Balance
```

### 2. OCR Receipt & UPI Screenshot Scanning Flow
```
User Image Upload ──► OpenCV Preprocessing (Grayscale/Threshold) ──► EasyOCR Text Extraction
                                                                            │
                                                                            ▼
Transaction DB ◄── User Confirmation ◄── Parse Amount/Merchant/Date ◄──────┘
```

---

## 7. CI/CD & Deployment Architecture

```
Code Push / Pull Request ──► GitHub Actions (.github/workflows/ci.yml)
                                           │
 ┌─────────────────────────────────────────┴─────────────────────────────────────────┐
 │ Stage 1: Python Syntax & Compilation                                              │
 │ Stage 2: PostgreSQL Migration & 55/55 Pytest Unit/Integration Suite               │
 │ Stage 3: Vite Production Build Verification                                       │
 │ Stage 4: Test Fixtures Generation                                                 │
 │ Stage 5: Playwright E2E Integration Suite (10/10 Browser Workflows)                │
 │ Stage 6: Security & Credentials Scanner                                           │
 │ Stage 7: Frontend Dependency Audit                                                │
 │ Stage 8: Docker Image Build Validation                                            │
 └───────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
                            SUCCESS → Production Readiness Gate
```

---

*For business documentation, product vision, and competitive evaluation, refer to `docs/PARIVIEW_MASTER_PROJECT_REPORT.md`.*
