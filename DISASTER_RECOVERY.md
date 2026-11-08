# PariView Disaster Recovery & Incident Response Runbook

## 1. Objectives and Scope

This runbook establishes deterministic recovery procedures for critical infrastructure failure modes affecting the PariView application platform:
- Distributed Redis Cluster Outage
- Primary PostgreSQL Database Corruption / Host Failure
- Historical Credential Exposure / Cryptographic Key Compromise

---

## 2. Scenario 1: Redis Cluster Outage

### 2.1 System Impact
In accordance with PariView's fail-closed security invariants:
- **Authentication**: Existing tokens cannot verify revocation status $\to$ `HTTP 503 Service Unavailable`.
- **Password Changes**: Password modification requests fail with `HTTP 503` to prevent unrevoked ghost sessions.
- **Rate Limiting**: Sensitive endpoints (AUTH, UPLOAD, OCR, ANALYTICS) fail closed with `HTTP 503`.
- **Public & Non-Sensitive Endpoints**: Fall back to in-memory protection where configured.

### 2.2 Immediate Mitigation Steps
1. **Check Redis Service Status**:
   ```bash
   redis-cli -u $REDIS_URL ping
   # Expected: PONG
   ```
2. **Inspect Redis Container Logs**:
   ```bash
   docker logs --tail 100 pariview_redis
   ```
3. **Emergency Standby Redis Activation**:
   If primary Redis cannot be recovered within 5 minutes, redirect traffic to secondary replica:
   ```bash
   export REDIS_URL="redis://redis-standby.internal:6379/0"
   # Reload application workers
   kill -HUP $(pgrep -f "uvicorn app.main:app")
   ```
4. **Post-Recovery Verification**:
   - Issue test request to `/health`.
   - Verify authenticated request resolves with HTTP 200.

---

## 3. Scenario 2: PostgreSQL Database Recovery

### 3.1 Backup Strategy & Schedule
- Continuous WAL archiving to isolated secondary volume or S3 bucket.
- Daily automated `pg_dump` executed at 02:00 UTC.

### 3.2 Point-in-Time Recovery (PITR) Procedure
```bash
# 1. Stop all application workers to prevent partial writes
pkill -f "uvicorn app.main:app"

# 2. Terminate existing database connections
psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'pariview';"

# 3. Drop and recreate database
psql -U postgres -c "DROP DATABASE pariview;"
psql -U postgres -c "CREATE DATABASE pariview WITH OWNER pariview_user;"

# 4. Restore snapshot from verified backup
gunzip -c /var/backups/pariview_latest.sql.gz | psql -U pariview_user -d pariview

# 5. Run Alembic migration check
cd /app/backend
python -m alembic upgrade head

# 6. Restart application workers
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## 4. Scenario 3: Credential Exposure & Key Compromise Protocol

### 4.1 Historical Exposure Assessment
Historical Git commits identified containing cleartext test secrets:
- Commit `6ca1f66`
- Commit `95cfe75`
- Commit `eea9add`
- Commit `ab1102c`

*Mandate: Never rewrite shared Git history without explicit coordination. All historical credentials must be treated as fully compromised.*

### 4.2 Comprehensive Credential Rotation Protocol

#### Phase 1: Database Password Rotation
```bash
# Generate new 32-character database password
NEW_DB_PASS=$(python -c "import secrets, string; print(''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32)))")

# Update PostgreSQL user credentials
psql -U postgres -c "ALTER USER pariview_user WITH PASSWORD '$NEW_DB_PASS';"

# Update secret in production environment
sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$NEW_DB_PASS/" /etc/pariview/.env
```

#### Phase 2: JWT & HMAC Signing Secret Rotation
Rotating `SECRET_KEY` immediately invalidates all active user sessions and signed upload URLs:
```bash
# Generate new 64-character hex SECRET_KEY
NEW_SECRET=$(python -c "import secrets; print(secrets.token_hex(32))")

# Update production environment
sed -i "s/SECRET_KEY=.*/SECRET_KEY=$NEW_SECRET/" /etc/pariview/.env

# Flush stale Redis revocation keys (all sessions invalid under new key)
redis-cli -u $REDIS_URL FLUSHDB
```

#### Phase 3: Object Storage & API Keys Rotation
- Rotate MinIO / S3 access key and secret key in bucket IAM console.
- Invalidate Google Gemini API keys in Google Cloud Console $\to$ Provision new restricted key.
- Update `S3_SECRET_ACCESS_KEY` and `GEMINI_API_KEY` in environment.

#### Phase 4: Application Zero-Downtime Worker Reload
```bash
# Graceful worker restart
kill -HUP $(pgrep -f "uvicorn app.main:app")

# Execute smoke test protocol
bash PRODUCTION_SMOKE_TEST.md
```
