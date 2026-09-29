# PariView Quality Assurance & Testing Strategy

**Version:** 2.0-Hardened  
**Date:** September 2026  

---

## 1. Test Suite Architecture & Verification Pipeline

PariView enforces a multi-tier testing pipeline covering backend unit tests, financial precision invariants, integration workflows, and Playwright end-to-end browser tests.

```
       +---------------------------------------------+
       |           Playwright E2E Tests              | (10 E2E Specs)
       +---------------------------------------------+
       |    Pytest Integration & Endpoint Tests     | (50 Pytests)
       +---------------------------------------------+
       |   Financial Invariants & Precision Suite    | (Decimal / Fingerprint)
       +---------------------------------------------+
```

---

## 2. Test Module Breakdown

| Module | Location | Purpose | Status |
| :--- | :--- | :--- | :--- |
| **Accounts** | `tests/test_accounts.py` | Validates account CRUD, multi-bank management, and balance updates. | 100% Passing |
| **Transfers** | `tests/test_transfers.py` | Validates internal transfers, balance integrity, and income exclusion. | 100% Passing |
| **Liabilities** | `tests/test_liabilities.py` | Validates liability CRUD and debt health metric calculations. | 100% Passing |
| **India Post** | `tests/test_india_post.py` | Validates exact compounding yield formulas for PPF, NSC, KVP, SSY, MIS, SCSS. | 100% Passing |
| **Bank Parsers** | `tests/test_bank_parsers.py` | Validates pluggable multi-bank parser factory (SBI, HDFC, ICICI, Axis). | 100% Passing |
| **Security** | `tests/test_security.py` | Validates password strength policy, bcrypt hashing, and token handling. | 100% Passing |
| **Privacy** | `tests/test_privacy.py` | Validates GDPR data export and account deletion. | 100% Passing |
| **Invariants** | `tests/test_invariants.py` | Validates SHA-256 fingerprint determinism and monetary precision. | 100% Passing |

---

## 3. Test Execution Commands

### Run Full Pytest Suite
```powershell
pytest -p no:warnings
```

### Run Full Verification (Pytest + E2E)
```powershell
powershell -ExecutionPolicy Bypass -File scripts/test-all.ps1
```
