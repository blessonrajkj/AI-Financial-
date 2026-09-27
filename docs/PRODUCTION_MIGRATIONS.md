# PariView — Production Alembic Migration Procedure

## Overview

PariView utilizes **Alembic** for schema migrations against PostgreSQL. Database migrations must be executed deterministically as part of the production release process before launching application instances.

---

## Production Deployment & Migration Workflow

```
1. CI Pipeline Pass (Pytest, Build, E2E, Docker)
   ↓
2. PostgreSQL Database Backup Snapshot (Pre-deployment)
   ↓
3. Execute Alembic Migration: alembic upgrade head
   ↓
4. Verify Schema Migration & Revision ID: alembic current
   ↓
5. Start FastAPI Backend Containers
   ↓
6. Execute Health Check: GET /health
```

---

## Migration Execution Commands

### Apply Pending Schema Migrations
```bash
cd backend
export DATABASE_URL="postgresql://<USER>:<PASSWORD>@<HOST>:5432/<DB_NAME>"
alembic upgrade head
```

### Verify Current Migration State
```bash
cd backend
alembic current
```

### Safe Migration Rollback (One Step Down)
```bash
cd backend
alembic downgrade -1
```

---

## Migration Safety Guidelines

1. **Non-Destructive Migrations**: Never issue `DROP TABLE` or `DROP COLUMN` commands without prior data archiving and a multi-phase deprecation window.
2. **No Startup Resets**: Application startup code (`app/main.py` / `app/db_init.py`) uses `Base.metadata.create_all(bind=engine)` safely wrapped inside `try/except` without clearing existing data.
3. **Transaction Locking**: Migration scripts execute inside single transactional blocks to ensure atomic rollback upon error.
