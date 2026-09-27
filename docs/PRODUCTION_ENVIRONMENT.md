# PariView — Production Environment Variables Audit

## Overview

This document specifies all environment variables utilized across the PariView application (Backend FastAPI, Frontend React/Vite, Database, Redis, and AI services).

---

## Environment Variable Matrix

| Variable Name | Purpose | Required in Prod? | Safe Default? | Contains Secret? | Where Used in Code? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | **YES** | No | **YES** (DB Password) | `app/core/config.py`, `app/core/database.py`, `alembic/env.py` |
| `POSTGRES_SERVER` | PostgreSQL host name | No (if `DATABASE_URL` set) | `localhost` | No | `app/core/config.py` |
| `POSTGRES_USER` | PostgreSQL user name | No (if `DATABASE_URL` set) | `postgres` | No | `app/core/config.py` |
| `POSTGRES_PASSWORD` | PostgreSQL password | No (if `DATABASE_URL` set) | None | **YES** | `app/core/config.py` |
| `POSTGRES_DB` | PostgreSQL database name | No (if `DATABASE_URL` set) | `pariview` | No | `app/core/config.py` |
| `POSTGRES_PORT` | PostgreSQL port | No (if `DATABASE_URL` set) | `5432` | No | `app/core/config.py` |
| `SECRET_KEY` | JWT signature encryption key | **YES** | None | **YES** | `app/core/config.py`, `app/core/security.py` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT expiration duration in minutes | No | `10080` (7 days) | No | `app/core/config.py`, `app/core/security.py` |
| `PROJECT_NAME` | Display name of application | No | `PariView` | No | `app/core/config.py`, `app/main.py` |
| `API_V1_STR` | API path prefix | No | `/api/v1` | No | `app/core/config.py`, `app/main.py` |
| `BACKEND_CORS_ORIGINS` | Allowed CORS origins (JSON array) | **YES** | None | No | `app/core/config.py`, `app/main.py` |
| `REDIS_URL` | Redis cache connection string | No | `redis://localhost:6379/0` | No | `app/core/config.py` |
| `GEMINI_API_KEY` | Google Gemini AI API key | No (Optional) | `None` | **YES** | `app/core/config.py`, `app/api/v1/endpoints/ai.py` |
| `UPLOAD_DIR` | Upload directory storage path | No | `uploads` | No | `app/core/config.py`, `app/main.py` |
| `VITE_API_URL` | Frontend API backend base URL | **YES** (at build time) | `/api/v1` | No | `frontend/src/context/AuthContext.jsx`, pages |

---

## Production `.env.example` Schema

```ini
# Production Database Connection
DATABASE_URL=postgresql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:5432/<DB_NAME>

# Core Security & Authentication
SECRET_KEY=<SECURE_RANDOM_GENERATED_JWT_SECRET_KEY_MIN_64_CHARS>
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# CORS & Application Boundaries
PROJECT_NAME="PariView AI Financial Assistant"
API_V1_STR=/api/v1
BACKEND_CORS_ORIGINS=["https://app.yourdomain.com"]

# Optional AI Services
GEMINI_API_KEY=<OPTIONAL_GEMINI_API_KEY>

# Frontend Environment Variable (Build-time)
VITE_API_URL=https://api.yourdomain.com/api/v1
```

> **Security Rule**: Never store real passwords, private keys, or secret tokens in version-controlled repositories or image layers.
