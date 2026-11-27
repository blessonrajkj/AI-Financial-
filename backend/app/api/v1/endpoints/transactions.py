from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from datetime import datetime, timedelta
from typing import List
from pydantic import BaseModel
import csv
import uuid
import os
from openpyxl import load_workbook

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.models.category_merchant import Category, Merchant
from app.schemas.transaction import TransactionCreate, TransactionUpdate, TransactionOut, CategoryOut, MerchantOut, BulkValidateRequest, BulkImportRequest
from app.services.pdf_parser import pdf_parser
from app.core.config import settings
from app.services.market_data import check_and_update_investments_from_transaction
from app.services.category_taxonomy import (
    EXPENSE_TAXONOMY,
    INCOME_CATEGORIES,
    TRANSFER_CATEGORIES
)

router = APIRouter()

@router.get("", response_model=List[TransactionOut])
def read_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
    skip: int = 0,
    limit: int = 100,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    category_id: int | None = None,
    merchant_id: int | None = None,
    min_amount: float | None = None,
    max_amount: float | None = None,
    type: str | None = None,
    payment_method: str | None = None,
    search: str | None = None,
    tags: str | None = None
):
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    if merchant_id:
        query = query.filter(Transaction.merchant_id == merchant_id)
    if min_amount:
        query = query.filter(Transaction.amount >= min_amount)
    if max_amount:
        query = query.filter(Transaction.amount <= max_amount)
    if type:
        query = query.filter(Transaction.type == type)
    if payment_method:
        query = query.filter(Transaction.payment_method == payment_method)
    if tags:
        query = query.filter(Transaction.tags.like(f"%{tags}%"))
    if search:
        query = query.filter(
            or_(
                Transaction.description.ilike(f"%{search}%"),
                Transaction.tags.ilike(f"%{search}%")
            )
        )
        
    query = query.order_by(Transaction.date.desc())
    return query.offset(skip).limit(limit).all()

@router.get("/taxonomy")
def get_category_taxonomy():
    return {
        "expense": EXPENSE_TAXONOMY,
        "income": INCOME_CATEGORIES,
        "transfer": TRANSFER_CATEGORIES
    }

@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    transaction_in: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    subcat = transaction_in.subcategory or "Uncategorized"
    db_trans = Transaction(
        user_id=current_user.id,
        amount=transaction_in.amount,
        date=transaction_in.date,
        description=transaction_in.description,
        category_id=transaction_in.category_id,
        subcategory=subcat,
        merchant_id=transaction_in.merchant_id,
        payment_method=transaction_in.payment_method,
        type=transaction_in.type,
        is_recurring=transaction_in.is_recurring,
        receipt_id=transaction_in.receipt_id,
        voice_log_id=transaction_in.voice_log_id,
        tags=transaction_in.tags,
        transaction_id=transaction_in.transaction_id,
        reference_number=transaction_in.reference_number,
        bank=transaction_in.bank,
        balance=transaction_in.balance,
        debit_amount=transaction_in.debit_amount,
        credit_amount=transaction_in.credit_amount,
        post_date=transaction_in.post_date,
        time=transaction_in.time
    )
    
    db.add(db_trans)
    # Automatically update matching investment quantities if this is an investment purchase
    try:
        check_and_update_investments_from_transaction(db, db_trans)
    except Exception as err:
        print(f"Investment update notice: {err}")
    db.commit()
    db.refresh(db_trans)
    return db_trans

@router.get("/{id}", response_model=TransactionOut)
def read_transaction(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    transaction = db.query(Transaction).filter(
        Transaction.id == id, Transaction.user_id == current_user.id
    ).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction

@router.put("/{id}", response_model=TransactionOut)
def update_transaction(
    id: int,
    transaction_in: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    db_trans = db.query(Transaction).filter(
        Transaction.id == id, Transaction.user_id == current_user.id
    ).first()
    
    if not db_trans:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    update_data = transaction_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_trans, field, value)
        
    db.add(db_trans)
    db.commit()
    db.refresh(db_trans)
    return db_trans

class BulkDeletePayload(BaseModel):
    ids: List[int]

@router.post("/bulk-delete")
def bulk_delete_transactions(
    payload: BulkDeletePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    deleted_count = db.query(Transaction).filter(
        Transaction.id.in_(payload.ids),
        Transaction.user_id == current_user.id
    ).delete(synchronize_session=False)
    db.commit()
    return {"message": f"Successfully deleted {deleted_count} transactions.", "deleted_count": deleted_count}

@router.delete("/{id}", response_model=TransactionOut)
def delete_transaction(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    db_trans = db.query(Transaction).filter(
        Transaction.id == id, Transaction.user_id == current_user.id
    ).first()
    
    if not db_trans:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    db.delete(db_trans)
    db.commit()
    return db_trans

# CATEGORIES & MERCHANTS
@router.get("/categories/all", response_model=List[CategoryOut])
def read_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    # Fetch default categories (user_id is None) and user specific categories
    return db.query(Category).filter(
        or_(Category.user_id == None, Category.user_id == current_user.id)
    ).all()

@router.post("/categories/all", response_model=CategoryOut)
def create_category(
    name: str,
    type: str = "expense",
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    # Check if category already exists
    existing = db.query(Category).filter(
        Category.name.ilike(name.strip()),
        or_(Category.user_id == None, Category.user_id == current_user.id)
    ).first()
    if existing:
        return existing
        
    db_cat = Category(name=name.strip(), type=type, user_id=current_user.id)
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat

@router.get("/merchants/all", response_model=List[MerchantOut])
def read_merchants(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    return db.query(Merchant).filter(
        or_(Merchant.user_id == None, Merchant.user_id == current_user.id)
    ).all()

@router.post("/merchants/all", response_model=MerchantOut)
def create_merchant(
    name: str,
    default_category_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    existing = db.query(Merchant).filter(
        Merchant.name.ilike(name),
        or_(Merchant.user_id == None, Merchant.user_id == current_user.id)
    ).first()
    if existing:
        return existing
        
    db_merchant = Merchant(name=name, user_id=current_user.id, default_category_id=default_category_id)
    db.add(db_merchant)
    db.commit()
    db.refresh(db_merchant)
    return db_merchant

def parse_excel_csv_backend(file_path: str, filename: str) -> tuple:
    transactions = []
    invalid_rows = []
    
    from app.services.tabular_parser import tabular_parser
    
    if filename.endswith('.csv'):
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                reader = csv.reader(f)
                rows = list(reader)
                if len(rows) > 0:
                    txs, bad = tabular_parser.parse_tabular_data(rows, "Generic CSV")
                    transactions.extend(txs)
                    invalid_rows.extend(bad)
        except Exception as e:
            invalid_rows.append({"rowNum": 1, "reasons": [f"CSV parsing error: {str(e)}"]})
    else:  # Excel (.xlsx, .xls)
        try:
            wb = load_workbook(filename=file_path, data_only=True)
            ws = wb.active
            rows = list(ws.iter_rows(values_only=True))
            if len(rows) > 0:
                txs, bad = tabular_parser.parse_tabular_data(rows, "Generic Excel")
                transactions.extend(txs)
                invalid_rows.extend(bad)
        except Exception as e:
            invalid_rows.append({"rowNum": 1, "reasons": [f"Excel parsing error: {str(e)}"]})
            
    return transactions, invalid_rows

def validate_statement_upload(file: UploadFile) -> tuple[str, str, bytes]:
    filename = (file.filename or "statement.csv").lower()
    ext = os.path.splitext(filename)[1]
    if ext not in [".pdf", ".csv", ".xlsx", ".xls"]:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload CSV, Excel, or PDF.")

    file_bytes = file.file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds maximum allowed limit of 10MB.")

    if ext == ".pdf":
        if not file_bytes.startswith(b"%PDF"):
            raise HTTPException(status_code=400, detail="Invalid PDF file content.")
    elif ext == ".xlsx":
        if not file_bytes.startswith(b"PK\x03\x04"):
            raise HTTPException(status_code=400, detail="Invalid Excel XLSX file content.")
    return filename, ext, file_bytes


@router.post("/import", status_code=status.HTTP_201_CREATED)
def import_transactions(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    filename, ext, file_bytes = validate_statement_upload(file)
    
    temp_dir = os.path.join(settings.UPLOAD_DIR, "temp")
    os.makedirs(temp_dir, exist_ok=True)
    temp_filename = f"{uuid.uuid4()}{ext}"
    temp_filepath = os.path.join(temp_dir, temp_filename)
    
    with open(temp_filepath, "wb") as buffer:
        buffer.write(file_bytes)
        
    try:
        transactions = []
        if ext == ".pdf":
            parse_result = pdf_parser.parse_pdf(temp_filepath)
            transactions = parse_result["transactions"]
        else:
            transactions, _ = parse_excel_csv_backend(temp_filepath, filename)
            
        if os.path.exists(temp_filepath):
            os.remove(temp_filepath)
            
        # Bulk insert
        imported_count = 0
        for t in transactions:
            # Resolve category & merchant on the fly
            cat_id = None
            if t.get("category"):
                cat = db.query(Category).filter(
                    Category.name.ilike(t["category"]),
                    or_(Category.user_id == None, Category.user_id == current_user.id)
                ).first()
                if not cat:
                    cat = Category(name=t["category"], type=t["type"], user_id=current_user.id)
                    db.add(cat)
                    db.commit()
                    db.refresh(cat)
                cat_id = cat.id
                
            merch_id = None
            if t.get("merchant"):
                merch = db.query(Merchant).filter(
                    Merchant.name.ilike(t["merchant"]),
                    or_(Merchant.user_id == None, Merchant.user_id == current_user.id)
                ).first()
                if not merch:
                    merch = Merchant(name=t["merchant"], user_id=current_user.id, default_category_id=cat_id)
                    db.add(merch)
                    db.commit()
                    db.refresh(merch)
                merch_id = merch.id
                
            db_trans = Transaction(
                user_id=current_user.id,
                amount=t["amount"],
                date=datetime.fromisoformat(t["date"]),
                description=t.get("description") or "",
                category_id=cat_id,
                subcategory=t.get("subcategory") or "Uncategorized",
                merchant_id=merch_id,
                payment_method=t.get("payment_method") or "Cash",
                type=t["type"],
                transaction_id=t.get("transaction_id"),
                reference_number=t.get("reference_number"),
                bank=t.get("bank"),
                balance=t.get("balance"),
                time=t.get("time")
            )
            db.add(db_trans)
            imported_count += 1
            
        db.commit()
        return {"message": f"Successfully imported {imported_count} transactions."}
    except Exception as e:
        if os.path.exists(temp_filepath):
            os.remove(temp_filepath)
        raise HTTPException(status_code=500, detail=str(e))

from app.services.storage import storage_service, generate_object_key, temp_file_for_processing

def batch_detect_duplicates(
    db: Session,
    user_id: int,
    items: list,
    is_sqlite: bool = False
) -> list[tuple[bool, int | None]]:
    """
    High-performance batch duplicate detector.
    Pre-indexes candidate transaction IDs, reference numbers, and date ranges,
    executing a single indexed query followed by O(1) in-memory hash matching.
    """
    if not items:
        return []

    cand_tx_ids = set()
    cand_ref_nums = set()
    cand_dates = []

    def get_val(obj, key, default=None):
        if isinstance(obj, dict):
            return obj.get(key, default)
        return getattr(obj, key, default)

    for item in items:
        tx_id = get_val(item, "transaction_id")
        if tx_id and str(tx_id).strip():
            cand_tx_ids.add(str(tx_id).strip())

        ref_num = get_val(item, "reference_number")
        if ref_num and str(ref_num).strip():
            cand_ref_nums.add(str(ref_num).strip())

        raw_date = get_val(item, "date")
        if raw_date:
            try:
                if isinstance(raw_date, datetime):
                    cand_dates.append(raw_date.date())
                elif isinstance(raw_date, str):
                    d_clean = raw_date.replace("Z", "+00:00").split("T")[0]
                    cand_dates.append(datetime.strptime(d_clean[:10], "%Y-%m-%d").date())
            except Exception:
                pass

    or_clauses = []
    if cand_tx_ids:
        or_clauses.append(Transaction.transaction_id.in_(cand_tx_ids))
    if cand_ref_nums:
        or_clauses.append(Transaction.reference_number.in_(cand_ref_nums))
    if cand_dates:
        min_d = min(cand_dates) - timedelta(days=1)
        max_d = max(cand_dates) + timedelta(days=1)
        min_dt = datetime.combine(min_d, datetime.min.time())
        max_dt = datetime.combine(max_d, datetime.max.time())
        or_clauses.append(and_(Transaction.date >= min_dt, Transaction.date <= max_dt))

    db_tx_ids = {}
    db_ref_nums = {}
    db_date_amt_merchant = {}
    db_date_amt_desc = {}

    if or_clauses:
        existing_matches = db.query(
            Transaction.id,
            Transaction.transaction_id,
            Transaction.reference_number,
            Transaction.date,
            Transaction.amount,
            Transaction.type,
            Transaction.description,
            Merchant.name.label("merchant_name")
        ).outerjoin(Merchant, Transaction.merchant_id == Merchant.id).filter(
            Transaction.user_id == user_id,
            or_(*or_clauses)
        ).all()

        for r in existing_matches:
            if r.transaction_id:
                db_tx_ids[str(r.transaction_id).strip()] = r.id
            if r.reference_number:
                db_ref_nums[str(r.reference_number).strip()] = r.id

            d_str = r.date.strftime("%Y-%m-%d") if r.date else ""
            amt_key = f"{float(r.amount):.2f}"
            t_type = (r.type or "").lower().strip()

            if r.merchant_name:
                m_key = (d_str, amt_key, t_type, r.merchant_name.lower().strip())
                db_date_amt_merchant[m_key] = r.id

            if r.description:
                desc_key = (d_str, amt_key, t_type, r.description.lower().strip())
                db_date_amt_desc[desc_key] = r.id

    results = []
    for item in items:
        tx_id = str(get_val(item, "transaction_id") or "").strip()
        ref_num = str(get_val(item, "reference_number") or "").strip()
        amt = get_val(item, "amount")
        amt_key = f"{float(amt):.2f}" if amt is not None else "0.00"
        t_type = str(get_val(item, "type") or "").lower().strip()
        merchant = str(get_val(item, "merchant") or "").lower().strip()
        desc = str(get_val(item, "description") or "").lower().strip()

        raw_date = get_val(item, "date")
        d_str = ""
        if raw_date:
            try:
                if isinstance(raw_date, datetime):
                    d_str = raw_date.strftime("%Y-%m-%d")
                elif isinstance(raw_date, str):
                    d_str = raw_date.replace("Z", "+00:00").split("T")[0][:10]
            except Exception:
                d_str = ""

        is_dup = False
        dup_id = None

        if tx_id and tx_id in db_tx_ids:
            is_dup = True
            dup_id = db_tx_ids[tx_id]
        elif ref_num and ref_num in db_ref_nums:
            is_dup = True
            dup_id = db_ref_nums[ref_num]
        elif merchant and (d_str, amt_key, t_type, merchant) in db_date_amt_merchant:
            is_dup = True
            dup_id = db_date_amt_merchant[(d_str, amt_key, t_type, merchant)]
        elif desc and (d_str, amt_key, t_type, desc) in db_date_amt_desc:
            is_dup = True
            dup_id = db_date_amt_desc[(d_str, amt_key, t_type, desc)]

        results.append((is_dup, dup_id))

    return results

@router.post("/import/bank-statement")
@router.post("/upload-parse")
def upload_and_parse_statement(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    filename, ext, file_bytes = validate_statement_upload(file)

    object_key = generate_object_key(current_user.id, "statements", filename)
    storage_service.upload_file(file_bytes, object_key, content_type=file.content_type)
        
    try:
        transactions = []
        invalid_rows = []
        bank_name = "Generic"
        is_sbi = False
        confidence_score = 90
        is_scanned = False

        with temp_file_for_processing(storage_service, object_key, suffix=ext) as temp_filepath:
            if ext == ".pdf":
                parse_result = pdf_parser.parse_pdf(temp_filepath, file.filename)
                transactions = parse_result["transactions"]
                invalid_rows = parse_result["invalid_rows"]
                bank_name = parse_result["bank"]
                is_scanned = parse_result["is_scanned"]
                is_sbi = parse_result.get("is_sbi", False)
                confidence_score = parse_result.get("confidence_score", 90)
            elif ext in [".csv", ".xlsx", ".xls"]:
                transactions, invalid_rows = parse_excel_csv_backend(temp_filepath, filename)
                bank_name = "Generic CSV/Excel"
            
        enriched_transactions = []
        duplicate_count = 0
        needs_review_count = 0
        income_total = 0.0
        expense_total = 0.0
        income_count = 0
        expense_count = 0
        detected_categories = set()
        detected_accounts = set()
        
        is_sqlite = db.bind.dialect.name == "sqlite"
        dup_results = batch_detect_duplicates(db, current_user.id, transactions, is_sqlite)
        
        for idx, t in enumerate(transactions):
            is_duplicate, _ = dup_results[idx]
            if t.get("needs_review"):
                needs_review_count += 1
            if is_duplicate:
                duplicate_count += 1
                
            t["is_duplicate"] = is_duplicate
            enriched_transactions.append(t)
            
            amt = float(t.get("amount", 0.0))
            if t.get("type") == "income":
                income_total += amt
                income_count += 1
            else:
                expense_total += amt
                expense_count += 1
                
            if t.get("category"):
                detected_categories.add(t["category"])
            if t.get("bank"):
                detected_accounts.add(t["bank"])
                
        if not detected_accounts and bank_name:
            detected_accounts.add(bank_name)
            
        return {
            "transactions": enriched_transactions,
            "preview": enriched_transactions,
            "invalid_rows": invalid_rows,
            "summary": {
                "total": len(enriched_transactions),
                "income_total": income_total,
                "expense_total": expense_total,
                "income_count": income_count,
                "expense_count": expense_count,
                "duplicate_count": duplicate_count,
                "needs_review_count": needs_review_count,
                "invalid_rows_count": len(invalid_rows),
                "detected_categories": list(detected_categories),
                "detected_accounts": list(detected_accounts)
            },
            "total_extracted": len(enriched_transactions),
            "total_income": income_total,
            "total_expenses": expense_total,
            "income_count": income_count,
            "expense_count": expense_count,
            "duplicates_count": duplicate_count,
            "needs_review_count": needs_review_count,
            "bank": bank_name,
            "bank_name": bank_name,
            "is_sbi": is_sbi,
            "is_sbi_statement": is_sbi,
            "is_scanned": is_scanned,
            "is_scanned_pdf": is_scanned,
            "confidence_score": confidence_score
        }
        
    except Exception as e:
        if os.path.exists(temp_filepath):
            os.remove(temp_filepath)
        raise HTTPException(status_code=500, detail=f"Failed to process and parse file: {str(e)}")

@router.post("/bulk-validate")
def bulk_validate_transactions(
    req: BulkValidateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    results = []
    summary = {
        "total": len(req.transactions),
        "valid": 0,
        "duplicates": 0,
        "errors": 0
    }
    
    is_sqlite = db.bind.dialect.name == "sqlite"
    dup_results = batch_detect_duplicates(db, current_user.id, req.transactions, is_sqlite)
    
    for idx, t in enumerate(req.transactions):
        is_valid = True
        error_msg = None
        
        # 1. Date parse check
        try:
            datetime.fromisoformat(t.date.replace("Z", "+00:00"))
        except Exception:
            try:
                datetime.strptime(t.date.split("T")[0], "%Y-%m-%d")
            except Exception:
                is_valid = False
                error_msg = "Invalid date format. Expected YYYY-MM-DD."
                summary["errors"] += 1
                results.append({
                    "index": idx,
                    "is_valid": is_valid,
                    "error_msg": error_msg,
                    "is_duplicate": False
                })
                continue
                
        # 2. Amount validation
        if t.amount <= 0:
            is_valid = False
            error_msg = "Amount must be greater than zero."
            summary["errors"] += 1
            results.append({
                "index": idx,
                "is_valid": is_valid,
                "error_msg": error_msg,
                "is_duplicate": False
            })
            continue
            
        # 3. Duplicate check
        is_duplicate, _ = dup_results[idx]
        if is_duplicate:
            summary["duplicates"] += 1
            
        summary["valid"] += 1
        results.append({
            "index": idx,
            "is_valid": is_valid,
            "error_msg": error_msg,
            "is_duplicate": is_duplicate
        })
        
    return {
        "validation_results": results,
        "summary": summary
    }

@router.post("/bulk-import")
def bulk_import_transactions(
    req: BulkImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    imported = 0
    skipped = 0
    duplicates = 0
    errors = 0
    
    is_sqlite = db.bind.dialect.name == "sqlite"
    
    # 1. Batch duplicate detection
    dup_results = batch_detect_duplicates(db, current_user.id, req.transactions, is_sqlite)
    
    # If duplicate strategy is 'replace', batch delete existing duplicate records
    if req.duplicate_strategy == "replace":
        dup_ids_to_delete = [dup_id for (is_dup, dup_id) in dup_results if is_dup and dup_id is not None]
        if dup_ids_to_delete:
            try:
                db.query(Transaction).filter(
                    Transaction.user_id == current_user.id,
                    Transaction.id.in_(dup_ids_to_delete)
                ).delete(synchronize_session=False)
                db.flush()
            except Exception:
                db.rollback()

    # 2. Pre-fetch and cache categories and merchants
    all_categories = db.query(Category).filter(
        or_(Category.user_id == None, Category.user_id == current_user.id)
    ).all()
    category_cache = {c.name.lower().strip(): c.id for c in all_categories if c.name}
    
    all_merchants = db.query(Merchant).all()
    merchant_cache = {m.name.lower().strip(): m.id for m in all_merchants if m.name}
    
    # Pre-create any missing categories in batch
    new_cats_to_create = {}
    for t in req.transactions:
        if t.category and t.category.strip():
            c_clean = t.category.strip()
            c_key = c_clean.lower()
            if c_key not in category_cache and c_key not in new_cats_to_create:
                new_cats_to_create[c_key] = (c_clean, t.type)
                
    if new_cats_to_create:
        for c_key, (c_name, c_type) in new_cats_to_create.items():
            db.add(Category(name=c_name, type=c_type, user_id=current_user.id))
        try:
            db.flush()
            refreshed_cats = db.query(Category).filter(
                or_(Category.user_id == None, Category.user_id == current_user.id)
            ).all()
            category_cache = {c.name.lower().strip(): c.id for c in refreshed_cats if c.name}
        except Exception:
            db.rollback()

    # Pre-create any missing merchants in batch
    new_merchs_to_create = {}
    for t in req.transactions:
        if t.merchant and t.merchant.strip():
            m_clean = t.merchant.strip()
            m_key = m_clean.lower()
            if m_key not in merchant_cache and m_key not in new_merchs_to_create:
                cat_id = None
                if t.category and t.category.strip():
                    cat_id = category_cache.get(t.category.strip().lower())
                new_merchs_to_create[m_key] = (m_clean, cat_id)

    if new_merchs_to_create:
        for m_key, (m_name, c_id) in new_merchs_to_create.items():
            db.add(Merchant(name=m_name, user_id=current_user.id, default_category_id=c_id))
        try:
            db.flush()
            refreshed_merchs = db.query(Merchant).all()
            merchant_cache = {m.name.lower().strip(): m.id for m in refreshed_merchs if m.name}
        except Exception:
            db.rollback()

    def parse_item_date(date_str: str) -> datetime | None:
        if not date_str:
            return None
        d_clean = date_str.strip()
        try:
            return datetime.fromisoformat(d_clean.replace("Z", "+00:00"))
        except Exception:
            pass
        for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d-%b-%Y", "%d %b %Y", "%Y/%m/%d", "%d/%m/%y", "%d-%m-%y"]:
            try:
                part = d_clean.split("T")[0].split()[0]
                return datetime.strptime(part, fmt)
            except Exception:
                pass
        return None

    records_to_insert = []

    for idx, t in enumerate(req.transactions):
        try:
            date_parsed = parse_item_date(t.date)
            if not date_parsed:
                errors += 1
                continue
                
            if t.amount <= 0:
                errors += 1
                continue
                
            is_duplicate, dup_id = dup_results[idx]
            if is_duplicate:
                duplicates += 1
                if req.duplicate_strategy == "skip":
                    skipped += 1
                    continue
                    
            cat_id = None
            if t.category and t.category.strip():
                cat_id = category_cache.get(t.category.strip().lower())
                
            merch_id = None
            if t.merchant and t.merchant.strip():
                merch_id = merchant_cache.get(t.merchant.strip().lower())

            records_to_insert.append({
                "user_id": current_user.id,
                "amount": t.amount,
                "date": date_parsed,
                "description": t.description or "",
                "category_id": cat_id,
                "subcategory": t.subcategory or "Uncategorized",
                "merchant_id": merch_id,
                "payment_method": t.payment_method or "Cash",
                "type": t.type,
                "is_recurring": False,
                "transaction_id": t.transaction_id,
                "reference_number": t.reference_number,
                "bank": t.bank,
                "balance": t.balance,
                "debit_amount": t.debit_amount,
                "credit_amount": t.credit_amount,
                "post_date": t.post_date,
                "time": t.time
            })
            imported += 1
        except Exception:
            errors += 1

    if records_to_insert:
        try:
            db.bulk_insert_mappings(Transaction, records_to_insert)
            db.commit()
        except Exception as ex:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Database batch insertion failed: {str(ex)}")

    return {
        "imported": imported,
        "skipped": skipped,
        "duplicates": duplicates,
        "errors": errors
    }
