# PariView Production Smoke Test Protocol

This document provides executable verification commands to validate application health, security boundaries, rate limiting, and session controls in a newly deployed production environment.

---

## 1. Automated Health & Database Connectivity

```bash
# Check basic application health
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/health
# Expected Output: 200

# Check health payload
curl -s http://127.0.0.1:8000/health
# Expected Output: {"status":"ok","app":"PariView"}
```

---

## 2. Authentication & Privilege Escalation Boundary Test

```bash
# Test 1: Verify public registration cannot escalate to 'admin'
curl -s -X POST http://127.0.0.1:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "smoketest_user@example.com", "password": "SecurePassword@2026", "role": "admin"}' | grep -q '"role":"user"' && echo "PASS: Privilege escalation blocked" || echo "FAIL"

# Test 2: Verify weak password rejection
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "weak_user@example.com", "password": "123"}'
# Expected Output: 422
```

---

## 3. Distributed Rate Limiter Test

```bash
# Test Auth Endpoint Rate Limit (Threshold: 10 requests / 60 seconds)
for i in {1..12}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:8000/api/v1/auth/login \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=invalid@example.com&password=wrongpassword")
  echo "Request $i: HTTP $STATUS"
done
# Expected Output: Requests 1-10 return 400/401; Requests 11-12 return 429
```

---

## 4. Multi-Worker Session Revocation Verification

```bash
# 1. Authenticate and obtain JWT token
TOKEN=$(curl -s -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=smoketest_user@example.com&password=SecurePassword@2026" | jq -r .access_token)

# 2. Verify token validity on /api/v1/auth/me
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
# Expected Output: 200

# 3. Update password (revokes active sessions)
curl -s -X PUT http://127.0.0.1:8000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"current_password": "SecurePassword@2026", "password": "UpdatedPassword@2026"}'

# 4. Verify original token is immediately rejected across workers
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
# Expected Output: 401
```

---

## 5. Upload Isolation & Signed URL Test

```bash
# 1. Attempt unauthenticated file download (direct path)
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/uploads/users/1/receipt.png
# Expected Output: 404 (Direct /uploads route unmounted)

# 2. Attempt cross-user access via authenticated route
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/api/v1/uploads/download/users/9999/receipt.png \
  -H "Authorization: Bearer $NEW_TOKEN"
# Expected Output: 403 Forbidden
```
