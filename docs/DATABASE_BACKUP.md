# PariView — Production Database Backup & Recovery Strategy

## Executive Summary

This document establishes the production backup, point-in-time recovery (PITR), and disaster recovery procedures for PariView's PostgreSQL database.

> **Status**: Backup Procedures & Tooling Documented: **PASS**  
> **Production Daily Automated Snapshot Cron**: **PENDING (Infrastructure Setup Required)**

---

## 1. Backup Strategy Overview

| Parameter | Specification |
| :--- | :--- |
| **Database Engine** | PostgreSQL 16 |
| **Backup Frequency** | Daily full snapshot (02:00 UTC) + Continuous WAL archiving (15-min intervals) |
| **Retention Policy** | Daily backups retained for 30 days; Monthly backups retained for 12 months |
| **Storage Destination** | AWS S3 / GCP Cloud Storage (Encrypted at rest with AES-256) |
| **RPO (Recovery Point Objective)** | < 15 minutes |
| **RTO (Recovery Time Objective)** | < 1 hour |

---

## 2. Backup Execution Commands

### Full Binary Custom-Format Backup (`pg_dump`)
```bash
pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB \
  -F c -b -v -f /backups/pariview_$(date +%Y%m%d_%H%M%S).dump
```

### Automated Compression & Encryption
```bash
gpg --symmetric --cipher-algo AES256 /backups/pariview_latest.dump
```

---

## 3. Disaster Recovery & Restoration Procedure

### 1. Provision / Clean Target Database
```bash
dropdb -h $POSTGRES_HOST -U $POSTGRES_USER $POSTGRES_DB --if-exists
createdb -h $POSTGRES_HOST -U $POSTGRES_USER $POSTGRES_DB
```

### 2. Restore Dump
```bash
pg_restore -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB \
  -v -c /backups/pariview_backup.dump
```

### 3. Verify Database Integrity & Alembic Sync
```bash
cd backend
alembic current
alembic upgrade head
python -c "from app.core.database import SessionLocal; db=SessionLocal(); print('DB Restored Successfully')"
```

---

## 4. Periodic Backup Testing Routine

1. Every month, restore the latest backup to a staging PostgreSQL environment.
2. Run `pytest` against the restored staging database to verify zero data corruption.
3. Validate total row counts for `users`, `transactions`, `budgets`, and `investments`.
