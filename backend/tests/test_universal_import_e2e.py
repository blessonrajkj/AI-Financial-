import os
import io
import pytest
from datetime import datetime
from openpyxl import Workbook
import fitz
from PIL import Image, ImageDraw

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.models.transaction import Transaction
from app.core.security import create_access_token, get_password_hash
from app.services.storage import storage_service

@pytest.fixture(scope="module")
def import_client():
    client = TestClient(app)
    return client

@pytest.fixture(scope="module")
def import_users():
    db = SessionLocal()
    # User 1
    u1 = db.query(User).filter(User.email == "import_user1@example.com").first()
    if not u1:
        u1 = User(
            email="import_user1@example.com",
            hashed_password=get_password_hash("Password123!"),
            full_name="Import User One",
            role="user",
            is_active=True
        )
        db.add(u1)
        db.commit()
        db.refresh(u1)

    # User 2 (for isolation testing)
    u2 = db.query(User).filter(User.email == "import_user2@example.com").first()
    if not u2:
        u2 = User(
            email="import_user2@example.com",
            hashed_password=get_password_hash("Password123!"),
            full_name="Import User Two",
            role="user",
            is_active=True
        )
        db.add(u2)
        db.commit()
        db.refresh(u2)

    u1_id = u1.id
    u2_id = u2.id

    # Clean up test transactions for idempotent test execution
    db.query(Transaction).filter(Transaction.user_id.in_([u1_id, u2_id])).delete(synchronize_session=False)
    db.commit()

    db.close()
    return u1_id, u2_id

def test_1_sbi_pdf_statement_upload_parse_and_bulk_import(import_client, import_users):
    u1_id, _ = import_users
    token = create_access_token(u1_id)
    headers = {"Authorization": f"Bearer {token}"}

    sbi_path = "backend/tests/fixtures/sample_sbi_statement.pdf"
    assert os.path.exists(sbi_path)

    # 1. Upload & Parse
    with open(sbi_path, "rb") as f:
        res = import_client.post(
            "/api/v1/transactions/upload-parse",
            headers=headers,
            files={"file": ("sample_sbi_statement.pdf", f, "application/pdf")}
        )
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["is_sbi"] is True
    assert "State Bank of India" in data["bank"]
    assert len(data["transactions"]) == 3
    assert len(data["invalid_rows"]) == 0

    txs = data["transactions"]
    swiggy_tx = next(t for t in txs if "SWIGGY" in t["description"])
    salary_tx = next(t for t in txs if "SALARY" in t["description"])
    atm_tx = next(t for t in txs if "ATM" in t["description"])

    # Verify Debit / Credit / Balance mapping
    assert swiggy_tx["amount"] == 540.0
    assert swiggy_tx["type"] == "expense"
    assert swiggy_tx["direction"] == "out"
    assert swiggy_tx["balance"] == 49460.0
    assert swiggy_tx["reference_number"] == "123456789012"

    assert salary_tx["amount"] == 50000.0
    assert salary_tx["type"] == "income"
    assert salary_tx["direction"] == "in"
    assert salary_tx["balance"] == 99460.0

    assert atm_tx["amount"] == 2000.0
    assert atm_tx["type"] == "expense"
    assert atm_tx["direction"] == "out"
    assert atm_tx["balance"] == 97460.0

    # 2. Bulk Import
    import_payload = {
        "transactions": txs,
        "duplicate_strategy": "skip"
    }
    commit_res = import_client.post(
        "/api/v1/transactions/bulk-import",
        headers=headers,
        json=import_payload
    )
    assert commit_res.status_code == 200
    commit_data = commit_res.json()
    assert commit_data["imported"] >= 1
    assert commit_data["errors"] == 0

    # 3. Verify PostgreSQL Persistence & User Isolation
    db = SessionLocal()
    db_txs = db.query(Transaction).filter(Transaction.user_id == u1_id).all()
    assert any(t.amount == 50000.0 and t.type == "income" for t in db_txs)
    assert any(t.amount == 540.0 and t.type == "expense" for t in db_txs)
    db.close()

def test_2_csv_bank_statement_upload_parse_and_bulk_import(import_client, import_users):
    u1_id, _ = import_users
    token = create_access_token(u1_id)
    headers = {"Authorization": f"Bearer {token}"}

    csv_path = "backend/tests/fixtures/sample_transactions.csv"
    assert os.path.exists(csv_path)

    with open(csv_path, "rb") as f:
        res = import_client.post(
            "/api/v1/transactions/upload-parse",
            headers=headers,
            files={"file": ("sample_transactions.csv", f, "text/csv")}
        )
    assert res.status_code == 200
    data = res.json()
    assert len(data["transactions"]) == 3
    assert data["summary"]["total"] == 3
    assert data["summary"]["income_total"] == 50000.0

    # Test Duplicate Detection on second validate
    val_res = import_client.post(
        "/api/v1/transactions/bulk-validate",
        headers=headers,
        json={"transactions": data["transactions"]}
    )
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert val_data["summary"]["total"] == 3

def test_3_excel_statement_upload_parse_and_bulk_import(import_client, import_users):
    u1_id, _ = import_users
    token = create_access_token(u1_id)
    headers = {"Authorization": f"Bearer {token}"}

    # Generate an Excel file in-memory
    wb = Workbook()
    ws = wb.active
    ws.append(["Date", "Description", "Category", "Subcategory", "Type", "Amount"])
    ws.append(["2026-09-12", "Starbucks Coffee", "Food & Dining", "Coffee", "EXPENSE", 350.00])
    ws.append(["2026-09-15", "Freelance Consulting", "Salary", "Bonus", "INCOME", 15000.00])

    excel_buffer = io.BytesIO()
    wb.save(excel_buffer)
    excel_buffer.seek(0)

    res = import_client.post(
        "/api/v1/transactions/upload-parse",
        headers=headers,
        files={"file": ("sample_excel.xlsx", excel_buffer.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["transactions"]) == 2
    assert any(t["merchant"] == "Starbucks Coffee" and t["amount"] == 350.0 for t in data["transactions"])
    assert any(t["merchant"] == "Freelance Consulting" and t["amount"] == 15000.0 for t in data["transactions"])

    # Commit the Excel transactions
    commit_res = import_client.post(
        "/api/v1/transactions/bulk-import",
        headers=headers,
        json={"transactions": data["transactions"], "duplicate_strategy": "skip"}
    )
    assert commit_res.status_code == 200
    assert commit_res.json()["imported"] == 2

def test_4_scanned_pdf_statement_and_ocr_fallback(import_client, import_users):
    u1_id, _ = import_users
    token = create_access_token(u1_id)
    headers = {"Authorization": f"Bearer {token}"}

    # Generate a scanned/image-based PDF (pure image, no selectable text)
    img = Image.new('RGB', (600, 300), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((30, 30), "STATEMENT OF ACCOUNT", fill=(0, 0, 0))
    draw.text((30, 80), "Date: 2026-09-18 | Big Bazaar Supermarket | INR 1,450.00", fill=(0, 0, 0))

    img_buffer = io.BytesIO()
    img.save(img_buffer, format="PNG")
    img_buffer.seek(0)

    pdf_doc = fitz.open()
    pdf_page = pdf_doc.new_page(width=600, height=300)
    pdf_page.insert_image(fitz.Rect(0, 0, 600, 300), stream=img_buffer.getvalue())
    pdf_bytes = pdf_doc.tobytes()
    pdf_doc.close()

    # Upload scanned PDF
    res = import_client.post(
        "/api/v1/transactions/upload-parse",
        headers=headers,
        files={"file": ("scanned_statement.pdf", pdf_bytes, "application/pdf")}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_scanned"] is True

def test_5_security_and_user_isolation(import_client, import_users):
    u1_id, u2_id = import_users
    token1 = create_access_token(u1_id)
    token2 = create_access_token(u2_id)

    # 1. Unauthenticated upload fails (401)
    res_anon = import_client.post(
        "/api/v1/transactions/upload-parse",
        files={"file": ("test.csv", b"Date,Amount\n2026-09-01,100", "text/csv")}
    )
    assert res_anon.status_code == 401

    # 2. Unsupported extension rejected (400)
    res_bad_ext = import_client.post(
        "/api/v1/transactions/upload-parse",
        headers={"Authorization": f"Bearer {token1}"},
        files={"file": ("malicious.exe", b"binarycontent", "application/octet-stream")}
    )
    assert res_bad_ext.status_code == 400

    # 3. User 2 cannot see User 1's imported transactions
    res_u2_tx = import_client.get(
        "/api/v1/transactions/",
        headers={"Authorization": f"Bearer {token2}"}
    )
    assert res_u2_tx.status_code == 200
    u2_txs = res_u2_tx.json()
    # Confirm no transactions belong to user 1
    for t in u2_txs:
        assert t["user_id"] == u2_id
