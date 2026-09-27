# PariView — Production Monitoring & Observability Architecture

## Overview

This document classifies the current monitoring, health check, log aggregation, and error tracking capabilities of PariView.

---

## Observability Status Matrix

| Component | Status | Implementation Details |
| :--- | :--- | :--- |
| **Health Endpoint (`GET /health`)** | **IMPLEMENTED** | Returns HTTP 200 `{"status": "ok", "database": "connected"}` with live DB connectivity check. |
| **Docker Container Healthcheck** | **IMPLEMENTED** | `docker-compose.yml` configures `pg_isready` check for PostgreSQL container. |
| **Request & Error Logging** | **CONFIGURED** | Python `logging` module captures server startup, request errors, and unhandled exceptions. |
| **APM / Error Tracking (Sentry)** | **CONFIGURED BUT NOT DEPLOYED** | Require `SENTRY_DSN` environment variable integration for real-time exception reporting. |
| **Metrics Collection (Prometheus/Grafana)** | **MISSING** | Production consideration for tracking request latency, throughput, and active DB pool connections. |
| **Log Aggregation (Datadog/ELK/Loki)** | **MISSING** | Infrastructure logging service setup required for multi-container deployments. |

---

## Recommended Production Metrics & Alerts

1. **HTTP 5xx Error Rate Alert**: Trigger alert when 5xx errors exceed 1% over a 5-minute window.
2. **Database Connection Pool Exhaustion**: Alert when active pool connections reach 90% of `pool_size` (9/10).
3. **High Latency Alert**: Trigger alert when p95 response time for `/api/v1/analytics/summary` or `/api/v1/receipts/scan-upi` exceeds 3,000ms.
4. **Disk Storage Alert**: Trigger alert when available storage on `/uploads` or DB volume drops below 15%.
