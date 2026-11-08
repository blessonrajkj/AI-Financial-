# PariView Production Environment Configuration Specification

## 1. Environment Overview

PariView is architected as a distributed FastAPI application backed by PostgreSQL (primary persistence) and Redis (distributed rate limiting, session revocation, and security tokens).

In production (`ENVIRONMENT=production`), the application enforces strict fail-closed constraints. Any insecure default, missing key, or active debug flag immediately terminates startup.

---

## 2. Environment Variables Specification

The application reads configuration from system environment variables or a secured `.env` file mounted with restricted permissions (`chmod 600`).

| Variable Name | Required | Default / Constraints | Description |
|---|---|---|---|
| `ENVIRONMENT` | **YES** | `production` | Enforces production hardening and disables in-memory fallbacks. |
| `DEBUG` | **YES** | `False` | Application startup aborts (`RuntimeError`) if `DEBUG=True` in production. |
| `SECRET_KEY` | **YES** | Cryptographically random, $\ge 32$ chars | Used for HMAC-SHA256 JWT signing and signed URL validation. Fails startup if default or $<32$ chars. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Optional | `10080` (7 days) | JWT expiration lifetime in minutes. |
| `DATABASE_URL` | **YES** | `postgresql+psycopg2://<user>:<pwd>@<host>:<port>/<db>` | Full connection string to PostgreSQL cluster. |
| `POSTGRES_SERVER` | Conditional | Required if `DATABASE_URL` not set | PostgreSQL host or IP address. |
| `POSTGRES_PORT` | Optional | `5432` | PostgreSQL port. |
| `POSTGRES_DB` | **YES** | `pariview` | Primary database name. |
| `POSTGRES_USER` | **YES** | Dedicated non-root user | Application database username. |
| `POSTGRES_PASSWORD` | **YES** | High-entropy secret | Must never be committed or default. |
| `REDIS_URL` | **YES** | `redis://<host>:6379/0` | Primary Redis instance for distributed rate limiting and token revocation. |
| `GEMINI_API_KEY` | Optional | Provider secret key | Google Gemini API key for AI financial forecasting and categorization. |
| `UPLOAD_DIR` | Optional | `uploads` | Root directory for file uploads (must not be directly served by web servers). |
| `STORAGE_BACKEND` | Optional | `local` (or `s3`) | Object storage driver (`local` with secure API wrapper or S3/MinIO). |
| `S3_ENDPOINT_URL` | Conditional | S3/MinIO endpoint | Required if `STORAGE_BACKEND=s3`. |
| `S3_BUCKET_NAME` | Conditional | `pariview-uploads` | S3 bucket name. |
| `S3_ACCESS_KEY_ID` | Conditional | Provider key | Required if `STORAGE_BACKEND=s3`. |
| `S3_SECRET_ACCESS_KEY` | Conditional | Provider secret | Required if `STORAGE_BACKEND=s3`. |
| `BACKEND_CORS_ORIGINS` | Optional | Whitelist of HTTPS domains | CORS allowed origins. Wildcards (`*`) forbidden in production. |

---

## 3. Production Invariants & Startup Validation

The application startup hook in `app.core.config.Settings.validate_security()` actively tests the configuration:

1. **Insecure Secret Key Interception**:
   - Compares `SECRET_KEY` against known historical defaults (e.g., `dev-insecure-secret-key-change-in-production-min-32-chars`, `supersecretkey`, `changeme`).
   - Asserts length $\ge 32$ characters.
   - Raises `RuntimeError` immediately if invalid.

2. **Debug Mode Prohibition**:
   - If `ENVIRONMENT=production` and `DEBUG=True`, startup halts with `RuntimeError("Production security error: DEBUG must be set to False in production.")`.

3. **Session Revocation Fail-Closed Requirement**:
   - If `REDIS_URL` is unreachable upon user authentication or session revocation, the application raises `RevocationStoreUnavailableError` returning `HTTP 503 Service Unavailable`.
   - In-memory process fallback `_REVOKED_USERS` is strictly disabled in production.

4. **Upload Isolation Requirement**:
   - Direct static file serving (`app.mount("/uploads", ...)`) is forbidden.
   - All uploads are scoped strictly to `uploads/users/{user_id}/` and served via authenticated endpoints or short-lived HMAC-SHA256 signed URLs.

---

## 4. Production Secret Generation Guide

Generate cryptographically secure secrets prior to container instantiation:

```bash
# Generate 64-character hex SECRET_KEY
python -c "import secrets; print(secrets.token_hex(32))"

# Generate 32-character high-entropy DB password
python -c "import secrets, string; alphabet = string.ascii_letters + string.digits + '!@#%^*()-_=+'; print(''.join(secrets.choice(alphabet) for _ in range(32)))"
```
