# PariView — Step-by-Step Production Deployment Runbook

## Overview

This runbook details the exact manual steps required to deploy a new release of PariView to production following successful CI/CD pipeline execution.

---

## Pre-Deployment Requirements
- [ ] GitHub Actions CI Pipeline Status: **PASSED**
- [ ] Release Tag Created: e.g. `v1.2.0`
- [ ] Production Database Backup Snapshot Completed.

---

## Step-by-Step Deployment Protocol

### Step 1: Execute Local / CI Verification
```powershell
powershell -ExecutionPolicy Bypass -File scripts\test-all.ps1
```

### Step 2: Build Production Docker Images
```bash
docker build -t pariview-backend:v1.2.0 ./backend
docker build -t pariview-frontend:v1.2.0 ./frontend
```

### Step 3: Database Schema Migration
Execute Alembic migrations against the production PostgreSQL instance:
```bash
docker run --rm \
  -e DATABASE_URL="postgresql://user:password@prod-db-host:5432/pariview" \
  pariview-backend:v1.2.0 alembic upgrade head
```

### Step 4: Deploy & Restart Containers
```bash
docker compose -f docker-compose.yml up -d --no-deps backend frontend
```

### Step 5: Post-Deployment Smoke Verification
```bash
curl -s https://api.yourdomain.com/health | grep '"status":"ok"'
```

---

## Emergency Rollback Protocol

If post-deployment smoke tests fail or critical issues arise:

1. **Rollback Container Versions**:
   ```bash
   docker compose -f docker-compose.yml up -d --no-deps backend:v1.1.9 frontend:v1.1.9
   ```
2. **Rollback Alembic Migration (If Schema Changed)**:
   ```bash
   alembic downgrade -1
   ```
3. **Verify System Stability**: Run `GET /health` endpoint check.
