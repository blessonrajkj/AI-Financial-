# PariView Security Architecture & Production Controls

**Version:** 2.0-Hardened  
**Date:** September 2026  

---

## 1. Authentication & Password Security

PariView enforces enterprise-grade authentication controls to protect user financial data.

### Password Policy Rules
1. **Length**: Minimum 8 characters.
2. **Complexity**: Must contain at least 1 uppercase letter, 1 lowercase letter, 1 digit, and 1 special character.
3. **Hashing**: Passwords hashed using bcrypt with adaptive salt generation (`cost=12`).
4. **Token Security**: OAuth2 JWT bearer tokens signed with SHA-256 HMAC (`HS256`).

---

## 2. Rate Limiting & Threat Protection

In-memory token-bucket rate limiting middleware safeguards sensitive API surfaces against brute-force attacks and denial of service.

| Endpoint Target | Window | Max Allowed Requests | Action on Exceed |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth/login` | 60 seconds | 15 attempts | HTTP 429 Too Many Requests |
| `/api/v1/auth/register` | 60 seconds | 15 attempts | HTTP 429 Too Many Requests |
| `/api/v1/receipts/upload` | 60 seconds | 15 attempts | HTTP 429 Too Many Requests |
| Bank Statement Imports | 60 seconds | 15 attempts | HTTP 429 Too Many Requests |

---

## 3. Secure File Upload Pipeline

To prevent malicious file upload vulnerabilities:
1. **Filename Sanitization**: Filenames normalized, removing path traversal characters (`../`, `\`).
2. **Magic Number MIME Validation**: Files inspected via magic number header validation (JPEG `FF D8 FF`, PNG `89 50 4E 47`, PDF `%PDF`).
3. **Storage Isolation**: Uploaded files stored outside web server execution directories.

---

## 4. Append-Only Audit Logging

Critical security and financial operations are recorded in an append-only `audit_logs` database table.

### Monitored Event Types
- User authentication & token generation (`LOGIN`, `LOGOUT`).
- User profile & password updates (`UPDATE_PASSWORD`).
- Data Export requests (`EXPORT`).
- Account Deletion & Purging (`DELETE_ACCOUNT`).
- High-value financial transactions or bank statement uploads (`UPLOAD`).
