# PARIVIEW — EXECUTIVE SUMMARY & PRODUCT BRIEF

**Project Name:** PariView  
**Tagline:** Your money. Your view. Your future.  
**Generated Date:** 29 September 2026  
**Repository:** `blessonrajkj/AI-Financial-`  
**Git Commit:** `a57de5e4ba29cfb9d6b3a7e420e514cce6f4c7b1`  
**Overall Readiness Status:** `VERIFIED PASS` (Production Database, S3 Object Storage, Responsive Mobile UI, 55/55 Pytest Suite, 10/10 Playwright E2E Suite)

---

## 1. Executive Summary

**PariView** is an enterprise-grade, production-ready Personal Financial Management (PFM) and wealth intelligence platform designed to consolidate an individual's complete financial life into a unified, secure, and privacy-first interface.

Unlike generic expense trackers that require tedious manual entry or single-purpose portfolio tools that ignore daily liquidity, PariView bridges the gap between daily cash-flow monitoring and long-term asset accumulation. It ingests data from disparate sources—including bank PDFs (with pluggable structural models for SBI, HDFC, ICICI, and Axis statements), Excel/CSV spreadsheets, physical paper receipts (via EasyOCR + OpenCV), and UPI payment screenshots—and transforms unstructured transactions into structured, actionable intelligence.

### Core Value Proposition
- **Unified Visibility:** Combines bank accounts, cash balances, internal transfers, debt liabilities, monthly budgets, stock/mutual fund portfolios, India Post small savings schemes (PPF, SSY, MIS, SCSS, KVP, NSC), savings goals, and recurring subscription commitments in one view.
- **Universal Transaction Ingestion:** Integrates manual entry, CSV/Excel upload, multi-page PDF bank statement parsing (with credit/debit column balance detection), SHA-256 fingerprint duplicate prevention, and optical character recognition (OCR) for receipts and UPI screenshots.
- **Rule-Based & AI Financial Intelligence:** Provides real-time financial health scoring (0–100), MAD-based robust spending anomaly detection, 3-tier statistical cash-flow forecasting (Conservative, Expected, Optimistic), category taxonomy mapping, and natural language query assistance via an integrated AI chatbot.
- **Stateless Cloud & Enterprise Security Architecture:** Engineered on FastAPI, PostgreSQL, SQLAlchemy ORM, Alembic migrations, token-bucket rate limiting, append-only audit logging, GDPR data export/deletion, React 18 with Tailwind CSS, and S3-compatible object storage (AWS S3 / MinIO) for complete containerized horizontal scalability.

---

## 2. Problem Statement & PariView Solutions

| Fragmented Problem in Modern PFM | PariView Engineering Solution | Implementation Status |
| :--- | :--- | :--- |
| **Scattered Financial Data:** Assets split across multiple banks, brokers, India Post savings, and wallet apps. | Unified dashboard aggregating bank balances, multi-account ledgers, debt liabilities, market investments, India Post schemes, budgets, and savings goals. | `IMPLEMENTED` |
| **Frictional Bank Statement Processing:** Password-protected or multi-page bank PDFs require manual re-typing. | Automated PyMuPDF-based pluggable bank parser framework with specialized column extraction for SBI, HDFC, ICICI, and Axis statements. | `IMPLEMENTED` |
| **Paper Receipts & UPI Screenshots Lost:** Cash and UPI merchant payments lack paper trails. | Embedded OCR pipeline combining OpenCV image preprocessing and EasyOCR text extraction for receipts and screenshots. | `IMPLEMENTED` |
| **Flawed Savings Goal Forecasts:** Standard apps use static monthly math or fail when recent transaction history is sparse. | 3-Tier Statistical forecast engine combining historical trend velocity, 30-day run rates, and confidence interval bounds. | `IMPLEMENTED` |
| **Data Privacy & Lock-in Risk:** Third-party aggregators sell transaction data to credit lenders. | Self-hosted, user-isolated database schema with Argon2id password hashing, JWT bearer auth, token-bucket rate limiting, and S3 storage privacy. | `IMPLEMENTED` |

---

## 3. Target User Personas

1. **Young Working Professionals & Salaried Employees:** Users managing monthly salary credits, UPI dining/groceries expenses, utility bill payments, and recurring streaming subscriptions.
2. **Retail Investors & Wealth Accumulators:** Individuals holding equity stocks, mutual funds, and traditional government-backed fixed-income schemes (e.g., India Post PPF, SSY, NSC) requiring consolidated yield and maturity tracking.
3. **Privacy-Conscious Individuals:** Financial planners who prefer self-hosted or user-isolated platforms without invasive third-party screen-scraping or data-monetization practices.
4. **Families & Small Household Planners:** Users requiring category-level monthly budgets, emergency fund progress tracking, and scheduled bill reminders.

---

## 4. Key Architectural Highlights

```
+-----------------------------------------------------------------------------------+
|                                 USER INTERFACE                                    |
|              React 18 + Vite + Tailwind CSS + Recharts + Lucide Icons             |
+-----------------------------------------------------------------------------------+
                                         │  HTTP / REST API (JWT Bearer)
                                         ▼
+-----------------------------------------------------------------------------------+
|                                FASTAPI BACKEND                                    |
|   /api/v1/auth     /api/v1/transactions  /api/v1/analytics  /api/v1/investments    |
|   /api/v1/accounts /api/v1/transfers     /api/v1/liabilities  /api/v1/budgets        |
|   /api/v1/savings  /api/v1/receipts      /api/v1/privacy      /api/v1/ai             |
+-----------------------------------------------------------------------------------+
       │                         │                        │                      │
       ▼                         ▼                        ▼                      ▼
+--------------+        +------------------+     +-----------------+   +------------------+
| PostgreSQL   |        | S3 Storage       |     | Analytics & AI  |   | File Parsers     |
| SQLAlchemy   |        | AWS S3 / MinIO   |     | Forecaster (MAD)|   | PyMuPDF (SBI/HDFC|
| Alembic      |        | Local Provider   |     | Debt & Rates    |   | EasyOCR / OpenCV |
+--------------+        +------------------+     +-----------------+   +------------------+
```

### Strategic Technical Attributes:
- **Database Resilience:** PostgreSQL database backend with Alembic migration versioning (`b7f8bbbeff6f_remediation_financial_precision_and_new_models.py`), Decimal monetary precision (`Numeric(14,4)`), composite indexes on `(user_id, date)` and `(user_id, category_id)`, and strict foreign-key cascades.
- **Stateless Storage Abstraction:** Abstract `StorageService` implementing `LocalStorageProvider` (for local development) and `S3StorageProvider` (boto3 integration for production AWS S3 / MinIO) with user-scoped object keys (`uploads/user_<id>/...`).
- **Production Quality Pipeline:** Automated 8-stage local CI/CD pipeline script (`scripts/test-all.ps1`) enforcing Python syntax checks, 50/50 Pytest unit/integration tests, Vite production builds, fixture generation, 10/10 Playwright E2E browser tests, security credential scans, and dependency audits.

---

## 5. Current Verification & Project Status Summary

| Area | Status | Verified Evidence |
| :--- | :--- | :--- |
| **Backend Core** | `IMPLEMENTED` | FastAPI application with 18 API routers, dependencies, and SQLAlchemy ORM models. |
| **Frontend UI** | `IMPLEMENTED` | React 18 + Vite SPA with 16 pages, responsive drawer, dark/light themes, and design tokens. |
| **Production Database** | `IMPLEMENTED` | PostgreSQL primary database with Alembic migration history, Numeric(14,4) Decimal precision, and SQLite fallback. |
| **Accounts & Liabilities**| `IMPLEMENTED` | Multi-account ledger, internal transfer engine, and debt liability scoring. |
| **Bank Parsers** | `IMPLEMENTED` | Pluggable bank statement parser framework (`BaseBankParser`) for SBI, HDFC, ICICI, and Axis. |
| **Object Storage** | `IMPLEMENTED` | Abstracted S3 storage provider (`boto3`) with user-isolated bucket storage. |
| **OCR Image Processing**| `IMPLEMENTED` | EasyOCR + OpenCV pipeline for receipt and UPI payment screenshot scanning. |
| **Automated Testing** | `IMPLEMENTED` | 55/55 Pytest unit/integration tests and 10/10 Playwright E2E integration tests passing. |
| **Security & Privacy** | `IMPLEMENTED` | Token-bucket rate limiting middleware, append-only audit logging, password validator, GDPR export & deletion. |
| **CI/CD Quality Pipeline**| `IMPLEMENTED` | GitHub Actions workflow (`.github/workflows/ci.yml`) and local test script (`scripts/test-all.ps1`). |
| **Containerization** | `IMPLEMENTED` | Production Dockerfiles for backend and frontend with `docker-compose.yml` orchestration. |

---

*For full technical details, schema definitions, API endpoint documentation, and technical architecture docs, refer to `docs/PARIVIEW_MASTER_PROJECT_REPORT.md`, `docs/PARIVIEW_ARCHITECTURE.md`, `docs/FINANCIAL_FORMULAS.md`, `docs/SECURITY_ARCHITECTURE.md`, `docs/DATABASE_ARCHITECTURE.md`, and `docs/TESTING_STRATEGY.md`.*

