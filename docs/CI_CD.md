# PariView — Production Automated Testing & CI/CD Pipeline Architecture

## 1. Overview & Objective

PariView's CI/CD pipeline enforces strict automated quality control across the entire stack before any code can be merged into production branches (`master` / `main`).

```
Code Change
    ↓
Git Push / Pull Request
    ↓
Automated GitHub Actions CI Pipeline
    ├── Code Quality & Syntax Verification
    ├── PostgreSQL Migrations & Pytest Backend Suite
    ├── Production Vite Build Verification
    ├── Playwright End-to-End Workflow Testing
    └── Security & Secret Scanning
    ↓
PASS → Production Deployment Ready
FAIL → Pipeline Stopped (Merge Blocked)
```

---

## 2. Pipeline Stages & Workflow Jobs (`.github/workflows/ci.yml`)

### Stage 1: Code Quality & Syntax (`code-quality`)
- **Python Syntax Check**: Compiles all backend code using `python -m compileall` to catch syntax errors immediately.
- **Flake8 Linting**: Scans Python files for syntax errors, undefined variables, and breaking lint violations.
- **Frontend Code Verification**: Runs `npm ci` and `npm run build` to verify standard JS/JSX syntax and module dependencies.

### Stage 2: Backend & Database Suite (`backend-and-db-tests`)
- **Service Container**: Spins up an isolated PostgreSQL 16 container (`postgres:16-alpine`).
- **Alembic Migrations**: Applies all database schema migrations (`alembic upgrade head`) on a clean test database.
- **Pytest Suite**: Executes 28+ unit, integration, and API tests:
  - SBI PDF statement parser & merchant regex logic
  - UPI receipt OCR scanner & sensitive data masking
  - Category & subcategory taxonomy tree handling
  - Exact Decimal financial precision & net savings math
  - Report generation (PDF & Excel formatting)
  - User data isolation between accounts

### Stage 3: Playwright End-to-End Testing (`e2e-tests`)
- **Uvicorn Backend**: Launches FastAPI application against PostgreSQL service.
- **Playwright Test Runner**: Runs automated full-lifecycle E2E tests:
  - User registration & JWT token issuance
  - Hierarchical category lookup
  - Manual transaction creation (Income & Expense)
  - Financial math assertion (Net balance = Income - Expense)
  - Budget category validation
  - PDF & Excel report downloading
  - Strict user data isolation check

### Stage 4: Security & Production Build (`security-and-build`)
- **Secret Scanning**: Scans repository for unencrypted API keys, private keys, or exposed credentials.
- **Bundle Verification**: Confirms Vite production bundle produces valid assets in `dist/`.

### Stage 5: Docker Verification (`docker-build`)
- **Docker Compose Spec Check**: Validates `docker-compose.yml` integrity.

---

## 3. Local Test Runner

Developers can execute the exact CI pipeline locally before pushing code to Git:

### Windows (CMD / PowerShell):
```cmd
scripts\test-all.bat
```

### Linux / macOS / Git Bash:
```bash
chmod +x scripts/test-all.sh
./scripts/test-all.sh
```

---

## 4. Environment Variables & Secret Management

| Environment Variable | Description | CI Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection URI | `postgresql://pariview:pariviewpassword@localhost:5432/pariview_test` |
| `SECRET_KEY` | JWT signing secret | Set securely in CI secrets |
| `API_BASE_URL` | E2E target URL | `http://127.0.0.1:8000` |

> **Security Rule**: Never commit real database credentials or banking credentials into source control. Test environments utilize sanitized fixtures.

---

## 5. Failure Protocol

If any job in the pipeline fails:
1. **GitHub Actions** stops execution and marks the Pull Request status check as **FAILED**.
2. **Merging is blocked** until the underlying issue is resolved and tests pass.
3. To debug locally, run `scripts/test-all.bat` or view the job logs in GitHub Actions.
