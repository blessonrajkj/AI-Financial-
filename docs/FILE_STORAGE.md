# PariView — Production File & Object Storage Architecture

## 1. Executive Summary

PariView processes user-uploaded financial artifacts including PDF bank statements, CSV/XLSX spreadsheets, and UPI receipt images.

> **Current Readiness Status**: **PARTIAL / NOT PRODUCTION READY (Local Container Filesystem Dependent)**  
> **Production Requirement**: Object Storage (AWS S3 / GCP Cloud Storage / MinIO) integration required for stateless horizontally scaled container deployments.

---

## 2. File Specifications & Validation Matrix

| File Category | Supported MIME Types | Max Size | Current Storage Path | Validation Enforced? |
| :--- | :--- | :--- | :--- | :--- |
| **Receipt Images** | `image/jpeg`, `image/png`, `image/webp` | 5 MB | `uploads/receipts/` | **YES** (Strict MIME & extension check) |
| **Bank Statements** | `application/pdf` | 10 MB | Temporary buffer | **YES** (`pdf_parser` SBI check) |
| **Excel Imports** | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | 10 MB | Temporary buffer | **YES** (`openpyxl` workbook validation) |
| **CSV Imports** | `text/csv`, `application/csv` | 5 MB | Temporary buffer | **YES** (`csv.DictReader` column validation) |
| **User Avatars** | `image/jpeg`, `image/png` | 2 MB | `uploads/avatars/` | **YES** (Path sanitization & extension check) |

---

## 3. Storage Architecture: Current vs Production Target

### Current Local Architecture (Single Container Development)
```
Upload Request
    ↓
FastAPI Backend
    ↓
Local Disk (/app/uploads/)
    ↓
PostgreSQL Stores Path (/uploads/receipts/rec_123.png)
```
*Risk*: Non-persistent local container disk; data lost upon container restart or horizontal scaling.

### Target Production Architecture (Stateless Cloud Deployment)
```
Upload Request
    ↓
FastAPI Backend (MIME & Size Validation)
    ↓
S3 / Object Storage (Bucket: pariview-uploads-prod)
    ↓
PostgreSQL Stores Object Key + S3 Metadata
```

---

## 4. Upload Security & Path Traversal Safeguards

1. **Filename Sanitization**: Uploaded filenames are sanitized using `uuid.uuid4().hex` to prevent path traversal attacks (`../`).
2. **Access Control**: Receipt images and financial documents are query-filtered using `receipt.user_id == current_user.id`.
3. **MIME Verification**: Reject raw executable binaries or non-whitelisted MIME types (`application/x-executable`, `text/html`).

---

## 5. Required Production Object Storage Abstraction

To enable AWS S3 / MinIO compatibility, the backend storage interface should support:
- `upload_file(file_bytes, object_key, mime_type) -> str`
- `generate_presigned_url(object_key, expires_in=3600) -> str`
- `delete_file(object_key) -> bool`
