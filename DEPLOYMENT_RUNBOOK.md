# PariView Production Deployment Runbook

## 1. Pre-Deployment Verification Checklist

Before initiating production deployment, verify the following prerequisites:

- [ ] PostgreSQL cluster ($\ge 16$) is online with valid network access and dedicated application credentials.
- [ ] Redis cluster ($\ge 7$) is operational with persistent storage enabled (`appendonly yes`).
- [ ] High-entropy secrets (`SECRET_KEY`, `POSTGRES_PASSWORD`) have been generated and injected via secrets manager or protected `.env`.
- [ ] No historical credentials or sensitive scratch scripts are committed to the codebase.
- [ ] Automated regression tests (101 unit/integration tests) pass with 100% success rate.
- [ ] Frontend production build compiles without syntax or bundle errors.

---

## 2. Step-by-Step Deployment Procedure

### Step 2.1: Clone and Environment Isolation
```bash
git clone <repository_url> pariview_prod
cd pariview_prod

# Copy production environment template
cp .env.example .env
chmod 600 .env

# Populate production secrets (never commit this file)
vi .env
```

### Step 2.2: Database Migration (Alembic)
Always run migrations before starting updated application workers:
```bash
# Navigate to backend directory
cd backend

# Execute database migration to latest revision
python -m alembic upgrade head

# Verify migration completion
python -c "from app.core.database import SessionLocal; from sqlalchemy import text; db = SessionLocal(); res = db.execute(text('SELECT version_num FROM alembic_version')).scalar(); print('Current DB Revision:', res); db.close()"
```

### Step 2.3: Multi-Worker Application Startup
In production, run the application using `uvicorn` managed by a supervisor or Gunicorn with multiple workers:
```bash
# Recommended production command:
uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 4 \
    --proxy-headers \
    --forwarded-allow-ips "*"
```
*Note: Ensure reverse proxy (e.g. Nginx, Cloudflare) sets `X-Forwarded-For` and `X-Forwarded-Proto` correctly.*

### Step 2.4: Frontend Asset Deployment
```bash
cd ../frontend
npm ci
npm run build

# Deploy dist/ to CDN, Nginx webroot, or container static server
# Example Nginx configuration:
# root /var/www/pariview/dist;
# try_files $uri $uri/ /index.html;
```

---

## 3. Post-Deployment Verification

1. **Liveness & Readiness Check**:
   ```bash
   curl -i http://127.0.0.1:8000/health
   # Expected response: HTTP 200 OK {"status": "ok", "app": "PariView"}
   ```

2. **Distributed Session Verification**:
   - Log in with test user on worker 1.
   - Perform password change.
   - Verify previous access token is immediately rejected across all workers with HTTP 401.

3. **Rate Limiting Smoke Test**:
   - Send 12 consecutive requests to `/api/v1/auth/login`.
   - Verify requests 11 and 12 receive HTTP 429 with `Retry-After` header.

---

## 4. Rollback Plan

If an unexpected failure occurs during deployment:

1. **Stop Application Workers**:
   ```bash
   kill -TERM $(pgrep -f "uvicorn app.main:app")
   ```

2. **Roll Back Database Schema (if necessary)**:
   ```bash
   cd backend
   python -m alembic downgrade -1
   ```

3. **Restore Previous Release Artifacts**:
   - Point symlink or container tag back to prior verified release.
   - Restart workers.

4. **Verify System Integrity**:
   - Execute `curl http://127.0.0.1:8000/health`.
   - Perform authenticated read test.
