# PariView Database Architecture & PostgreSQL Migration Guide

## Overview

PariView uses **PostgreSQL** as its primary persistent production database engine, managed via **SQLAlchemy 2.0 ORM** and **Alembic** schema migrations.

---

## Architecture Audit & Data Dictionary

### Core Tables & Relationships

```mermaid
erDiagram
    users ||--o{ user_profiles : "1:1 profile"
    users ||--o{ linked_banks : "1:N banks"
    users ||--o{ user_settings : "1:1 settings"
    users ||--o{ categories : "1:N custom categories"
    users ||--o{ merchants : "1:N custom merchants"
    users ||--o{ transactions : "1:N transactions"
    users ||--o{ budgets : "1:N budgets"
    users ||--o{ investments : "1:N investments"
    users ||--o{ savings_goals : "1:N savings goals"
    users ||--o{ subscriptions : "1:N subscriptions"
    users ||--o{ receipts : "1:N receipts"
    users ||--o{ notifications : "1:N notifications"
    users ||--o{ chat_history : "1:N chat"
    users ||--o{ voice_logs : "1:N voice logs"
    users ||--o{ india_post_investments : "1:N India Post"
    users ||--o{ import_logs : "1:N import logs"
    users ||--o{ import_batches : "1:N import batches"

    categories ||--o{ transactions : "1:N category transactions"
    categories ||--o{ budgets : "1:N category budgets"
    merchants ||--o{ transactions : "1:N merchant transactions"
    import_batches ||--o{ transactions : "1:N batch transactions"
```

### Table Definitions & Precision Specifications

1. **`users`**: User identity, roles (`user`, `admin`), password hashes, verification flags.
2. **`user_profiles`**: Personal profile details linked 1:1 via FK `user_id` CASCADE.
3. **`linked_banks`**: Linked bank account metadata linked via FK `user_id` CASCADE.
4. **`user_settings`**: Notification and security preferences linked 1:1 via FK `user_id` CASCADE.
5. **`categories`**: Taxonomy main categories with `user_id` NULL for default system categories.
6. **`merchants`**: Recognized merchants with optional default category mapping.
7. **`transactions`**: Primary ledger table. Monetary amounts (`amount`, `debit_amount`, `credit_amount`) and `balance` use **`Numeric(12, 2)`** and **`Numeric(14, 2)`** for exact financial precision.
8. **`budgets`**: Monthly budget targets using `Numeric(12, 2)` linked to `users` and `categories`.
9. **`investments`**: Stock/Mutual Fund/Crypto assets with `Numeric(12, 2)` pricing.
10. **`savings_goals`**: Target and current amount tracking with `Numeric(12, 2)`.
11. **`subscriptions`**: Recurring subscriptions with `Numeric(12, 2)` amount.
12. **`receipts`**: Scanned paper/digital receipts with extracted JSON metadata.
13. **`notifications`**: User alerts (budget alerts, fraud detection, bill reminders).
14. **`chat_history`**: Financial AI assistant chat logs.
15. **`voice_logs`**: Voice expense parser logs.
16. **`india_post_investments`**: Post office savings schemes (NSC, KVP, PPF, MIS, SCSS, TD, RD).
17. **`import_logs`**: Import audit history log records.
18. **`import_batches`**: Comprehensive statement import batch audit model (PDF, CSV, Excel, UPI).

---

## Database Connection Configuration

Set `DATABASE_URL` in your `.env` file:

```env
DATABASE_URL=postgresql://postgres:kjbb2320@localhost:5432/pariview
```

For cloud providers (Render, Supabase, Neon, AWS RDS, GCP Cloud SQL):

```env
DATABASE_URL=postgresql://username:password@ep-cool-db-12345.us-east-1.aws.neon.tech/pariview?sslmode=require
```

---

## Alembic Migration Commands

### Apply Pending Migrations
```bash
cd backend
alembic upgrade head
```

### Create a New Schema Migration
```bash
cd backend
alembic revision --autogenerate -m "describe_changes"
```

### Rollback Previous Migration
```bash
cd backend
alembic downgrade -1
```

---

## Data Migration from SQLite to PostgreSQL

To transfer existing SQLite data (`finance.db`) into PostgreSQL with full FK integrity verification and financial sum validation:

```bash
cd backend
python scripts/migrate_sqlite_to_postgres.py
```

---

## Database Health Check

Access the `/health` endpoint:
```http
GET /health
```
Response:
```json
{
  "status": "ok",
  "database": "connected",
  "db_engine": "postgresql"
}
```

---

## Backup and Restore Procedures

### Backup PostgreSQL Database
```bash
pg_dump -U postgres -d pariview -F c -b -v -f pariview_backup.dump
```

### Restore PostgreSQL Database
```bash
pg_restore -U postgres -d pariview -v pariview_backup.dump
```
