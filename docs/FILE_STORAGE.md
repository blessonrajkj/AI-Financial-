# PariView — Production File & Object Storage Architecture

## 1. Executive Summary

PariView processes user-uploaded financial artifacts including PDF bank statements, CSV/XLSX spreadsheets, and UPI receipt images.

> **Readiness Status**: **PASS / PRODUCTION READY (S3-Compatible Object Storage Abstraction Implemented)**  
> **Backend Implementation**: Plug-and-play abstraction supporting both local filesystem (`STORAGE_BACKEND=local`) and S3-compatible cloud/object storage (`STORAGE_BACKEND=s3` via `boto3`).

---

## 2. File Specifications & Validation Matrix

| File Category | Supported Extensions / MIME Types | Max Size | Object Key Prefix Structure | Validation Enforced? |
| :--- | :--- | :--- | :--- | :--- |
| **Receipt Images** | `.jpeg`, `.jpg`, `.png`, `.pdf` | 5 MB | `users/{user_id}/receipts/{uuid}.{ext}` | **YES** (Extension, MIME, user isolation) |
| **UPI Screenshots** | `.jpeg`, `.jpg`, `.png`, `.webp` | 5 MB | `users/{user_id}/upi/{uuid}.{ext}` | **YES** (Extension, OCR parsing via temp file) |
| **Bank Statements** | `.pdf` | 10 MB | `users/{user_id}/statements/{uuid}.pdf` | **YES** (`pdf_parser` SBI check & temp cleanup) |
| **Excel Imports** | `.xlsx`, `.xls` | 10 MB | `users/{user_id}/statements/{uuid}.xlsx` | **YES** (`openpyxl` workbook validation) |
| **CSV Imports** | `.csv` | 5 MB | `users/{user_id}/statements/{uuid}.csv` | **YES** (`csv.DictReader` column validation) |
| **User Avatars** | `.png`, `.jpg`, `.jpeg`, `.webp` | 2 MB | `users/{user_id}/avatars/{uuid}.{ext}` | **YES** (Path traversal check, old avatar removal) |

---

## 3. Storage Architecture & Configuration

### Storage Abstraction Overview (`app/services/storage.py`)
```
                                ┌──────────────────────────────────────┐
                                │          StorageService             │
                                └──────────────────┬───────────────────┘
                                                   │
                        ┌──────────────────────────┴──────────────────────────┐
                        ▼                                                     ▼
        ┌──────────────────────────────┐                      ┌──────────────────────────────┐
        │     LocalStorageProvider     │                      │      S3StorageProvider       │
        │   (STORAGE_BACKEND=local)    │                      │     (STORAGE_BACKEND=s3)     │
        └──────────────┬───────────────┘                      └──────────────┬───────────────┘
                       │                                                     │
                       ▼                                                     ▼
             Local Disk / (UPLOAD_DIR)                             AWS S3 / MinIO Bucket
```

### Environment Configuration Variables (`app/core/config.py`)

| Variable Name | Default Value | Description |
| :--- | :--- | :--- |
| `STORAGE_BACKEND` | `local` | `local` for local dev/testing; `s3` for AWS S3 / MinIO production |
| `S3_ENDPOINT_URL` | `None` | Endpoint URL (e.g. `http://minio:9000` for MinIO, `None` for AWS S3) |
| `S3_BUCKET_NAME` | `pariview-uploads` | Target S3 bucket name |
| `S3_REGION` | `us-east-1` | AWS S3 region |
| `S3_ACCESS_KEY_ID` | `None` | S3 Access Key ID (Optional when running IAM role in AWS EC2/ECS) |
| `S3_SECRET_ACCESS_KEY` | `None` | S3 Secret Access Key |

---

## 4. Temporary File Extraction (`temp_file_for_processing`)

Financial statement parsers (PyMuPDF, EasyOCR, OpenCV, openpyxl) require local file path access for processing binary documents. To keep stateless production containers clean when using `STORAGE_BACKEND=s3`:

```python
with temp_file_for_processing(storage_service, object_key, suffix=".pdf") as tmp_filepath:
    parse_result = pdf_parser.parse_pdf(tmp_filepath, original_filename)
# Temporary local file is automatically destroyed upon context exit
```

---

## 5. Security & User Data Isolation Safeguards

1. **User Isolation**: All object keys follow the strict pattern `users/{user_id}/{category}/{uuid}.{ext}`. User B cannot infer or access User A's object key.
2. **Path Traversal Protection**: `LocalStorageProvider._resolve_path` uses strict `os.path.normpath` + `os.path.abspath` validation to ensure no file operations escape `settings.UPLOAD_DIR`.
3. **Pre-signed URLs**: When running `STORAGE_BACKEND=s3`, `storage_service.get_url()` generates secure pre-signed URLs (`ExpiresIn=3600`).
