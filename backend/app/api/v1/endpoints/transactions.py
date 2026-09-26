from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from datetime import datetime
from typing import List
from pydantic import BaseModel
import io
import csv
import shutil
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

@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    transaction_in: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    db_trans = Transaction(
        user_id=current_user.id,
        amount=transaction_in.amount,
        date=transaction_in.date,
        description=transaction_in.description,
        category_id=transaction_in.category_id,
        merchant_id=transaction_in.merchant_id,
        payment_method=transaction_in.payment_method,
        type=transaction_in.type,
        is_recurring=transaction_in.is_recurring,
        receipt_id=transaction_in.receipt_id,
        voice_log_id=transaction_in.voice_log_id,
        tags=transaction_in.tags
    )
    
    db.add(db_trans)
    # Automatically update matching investment quantities if this is an investment purchase
    check_and_update_investments_from_transaction(db, db_trans)
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
        Category.name.ilike(name),
        or_(Category.user_id == None, Category.user_id == current_user.id)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
        
    db_cat = Category(name=name, type=type, user_id=current_user.id)
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
    
    from app.services.pdf_parser import pdf_parser
    
    if filename.endswith('.csv'):
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                reader = csv.reader(f)
                rows = list(reader)
                if len(rows) > 0:
                    headers = [str(h).lower().strip() if h else "" for h in rows[0]]
                    cells_headers = [{"text": h, "color": None} for h in headers]
                    header_map = pdf_parser.find_headers(cells_headers)
                    
                    formatted_rows = []
                    for r_idx, row in enumerate(rows[1:]):
                        if any(row):
                            row_cells = [{"text": str(cell) if cell is not None else "", "color": None} for cell in row]
                            formatted_rows.append(row_cells)
                            
                    txs, bad = pdf_parser.parse_table_rows(formatted_rows, "Generic CSV")
                    transactions.extend(txs)
                    invalid_rows.extend(bad)
        except Exception as e:
            invalid_rows.append({"rowNum": 1, "reasons": [f"CSV parsing error: {str(e)}"]})
    else:  # Excel
        try:
            wb = load_workbook(filename=file_path, data_only=True)
            ws = wb.active
            rows = list(ws.iter_rows(values_only=True))
            if len(rows) > 0:
                headers = [str(cell).lower().strip() if cell is not None else "" for cell in rows[0]]
                cells_headers = [{"text": h, "color": None} for h in headers]
                header_map = pdf_parser.find_headers(cells_headers)
                
                formatted_rows = []
                for row in rows[1:]:
                    if any(row):
                        row_cells = [{"text": str(cell) if cell is not None else "", "color": None} for cell in row]
                        formatted_rows.append(row_cells)
                        
                txs, bad = pdf_parser.parse_table_rows(formatted_rows, "Generic Excel")
                transactions.extend(txs)
                invalid_rows.extend(bad)
        except Exception as e:
            invalid_rows.append({"rowNum": 1, "reasons": [f"Excel parsing error: {str(e)}"]})
            
    return transactions, invalid_rows

@router.post("/import", status_code=status.HTTP_201_CREATED)
def import_transactions(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    # Backward compatibility: legacy import endpoint maps to parser + save directly
    filename = file.filename.lower()
    ext = os.path.splitext(filename)[1]
    
    temp_dir = os.path.join(settings.UPLOAD_DIR, "temp")
    os.makedirs(temp_dir, exist_ok=True)
    temp_filename = f"{uuid.uuid4()}{ext}"
    temp_filepath = os.path.join(temp_dir, temp_filename)
    
    with open(temp_filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
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

@router.post("/upload-parse")
def upload_and_parse_statement(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    filename = file.filename.lower()
    ext = os.path.splitext(filename)[1]
    
    temp_dir = os.path.join(settings.UPLOAD_DIR, "temp")
    os.makedirs(temp_dir, exist_ok=True)
    temp_filename = f"{uuid.uuid4()}{ext}"
    temp_filepath = os.path.join(temp_dir, temp_filename)
    
    with open(temp_filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        transactions = []
        invalid_rows = []
        bank_name = "Generic"
        is_sbi = False
        confidence_score = 90
        
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
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload CSV, Excel, or PDF.")
            
        if os.path.exists(temp_filepath):
            os.remove(temp_filepath)
            
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
        
        for t in transactions:
            if t.get("needs_review"):
                needs_review_count += 1

            # Multi-tier Duplicate Detection (Priority: 1. transaction_id, 2. reference_number, 3. date+amount+merchant, 4. date+amount+description)
            if t.get("transaction_id"):
                dup = db.query(Transaction).filter(
                    Transaction.user_id == current_user.id,
                    Transaction.transaction_id == t["transaction_id"]
                ).first()
                if dup:
                    is_duplicate = True
            
            if not is_duplicate and t.get("reference_number"):
                dup = db.query(Transaction).filter(
                    Transaction.user_id == current_user.id,
                    Transaction.reference_number == t["reference_number"]
                ).first()
                if dup:
                    is_duplicate = True
            
            if not is_duplicate:
                try:
                    date_parsed = datetime.fromisoformat(t["date"])
                except Exception:
                    date_parsed = datetime.now()
                    
                # Priority 3: date + amount + merchant
                if t.get("merchant"):
                    dup_query = db.query(Transaction).filter(
                        Transaction.user_id == current_user.id,
                        Transaction.amount == t["amount"],
                        Transaction.type == t["type"]
                    )
                    if is_sqlite:
                        dup_query = dup_query.filter(func.strftime('%Y-%m-%d', Transaction.date) == date_parsed.strftime('%Y-%m-%d'))
                    else:
                        dup_query = dup_query.filter(func.date(Transaction.date) == date_parsed.date())
                    dup_query = dup_query.join(Merchant, Transaction.merchant_id == Merchant.id).filter(
                        Merchant.name.ilike(t["merchant"].strip())
                    )
                    if dup_query.first():
                        is_duplicate = True

                # Priority 4: date + amount + description
                if not is_duplicate and t.get("description"):
                    dup_query = db.query(Transaction).filter(
                        Transaction.user_id == current_user.id,
                        Transaction.amount == t["amount"],
                        Transaction.type == t["type"],
                        Transaction.description.ilike(t["description"].strip())
                    )
                    if is_sqlite:
                        dup_query = dup_query.filter(func.strftime('%Y-%m-%d', Transaction.date) == date_parsed.strftime('%Y-%m-%d'))
                    else:
                        dup_query = dup_query.filter(func.date(Transaction.date) == date_parsed.date())
                    if dup_query.first():
                        is_duplicate = True
                    
            if is_duplicate:
                duplicate_count += 1
                
            t["is_duplicate"] = is_duplicate
            enriched_transactions.append(t)
            
            if t["type"] == "income":
                income_total += t["amount"]
                income_count += 1
            else:
                expense_total += t["amount"]
                expense_count += 1
                
            if t.get("category"):
                detected_categories.add(t["category"])
            if t.get("bank"):
                detected_accounts.add(t["bank"])
                
        if not detected_accounts and bank_name:
            detected_accounts.add(bank_name)
            
        return {
            "transactions": enriched_transactions,
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
            "bank": bank_name,
            "is_sbi": is_sbi,
            "is_scanned": is_scanned,
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
    
    for idx, t in enumerate(req.transactions):
        is_valid = True
        error_msg = None
        is_duplicate = False
        
        # 1. Date parse check
        try:
            date_parsed = datetime.fromisoformat(t.date.replace("Z", "+00:00"))
        except Exception:
            try:
                date_parsed = datetime.strptime(t.date.split("T")[0], "%Y-%m-%d")
            except Exception:
                is_valid = False
                error_msg = "Invalid date format. Expected YYYY-MM-DD."
                summary["errors"] += 1
                results.append({
                    "index": idx,
                    "is_valid": is_valid,
                    "error_msg": error_msg,
                    "is_duplicate": is_duplicate
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
                "is_duplicate": is_duplicate
            })
            continue
            
        # 3. Duplicate check
        if t.transaction_id and t.transaction_id.strip():
            dup_by_id = db.query(Transaction).filter(
                Transaction.user_id == current_user.id,
                Transaction.transaction_id == t.transaction_id.strip()
            ).first()
            if dup_by_id:
                is_duplicate = True
                
        if not is_duplicate and t.reference_number and t.reference_number.strip():
            dup_by_ref = db.query(Transaction).filter(
                Transaction.user_id == current_user.id,
                Transaction.reference_number == t.reference_number.strip()
            ).first()
            if dup_by_ref:
                is_duplicate = True
                
        if not is_duplicate:
            dup_query = db.query(Transaction).filter(
                Transaction.user_id == current_user.id,
                Transaction.amount == t.amount,
                Transaction.type == t.type
            )
            
            if is_sqlite:
                dup_query = dup_query.filter(func.strftime('%Y-%m-%d', Transaction.date) == date_parsed.strftime('%Y-%m-%d'))
            else:
                dup_query = dup_query.filter(func.date(Transaction.date) == date_parsed.date())
                
            if t.merchant and t.merchant.strip():
                dup_query = dup_query.join(Merchant, Transaction.merchant_id == Merchant.id).filter(
                    Merchant.name.ilike(t.merchant.strip())
                )
                
            if dup_query.first():
                is_duplicate = True
                
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
    
    all_categories = db.query(Category).filter(
        or_(Category.user_id == None, Category.user_id == current_user.id)
    ).all()
    category_cache = {c.name.lower().strip(): c.id for c in all_categories}
    
    all_merchants = db.query(Merchant).filter(
        or_(Merchant.user_id == None, Merchant.user_id == current_user.id)
    ).all()
    merchant_cache = {m.name.lower().strip(): m.id for m in all_merchants}
    
    for t in req.transactions:
        try:
            date_parsed = datetime.fromisoformat(t.date.replace("Z", "+00:00"))
        except Exception:
            try:
                date_parsed = datetime.strptime(t.date.split("T")[0], "%Y-%m-%d")
            except Exception:
                errors += 1
                continue
                
        if t.amount <= 0:
            errors += 1
            continue
            
        is_duplicate = False
        existing_dup = None
        
        if t.transaction_id and t.transaction_id.strip():
            existing_dup = db.query(Transaction).filter(
                Transaction.user_id == current_user.id,
                Transaction.transaction_id == t.transaction_id.strip()
            ).first()
            if existing_dup:
                is_duplicate = True
                
        if not is_duplicate and t.reference_number and t.reference_number.strip():
            existing_dup = db.query(Transaction).filter(
                Transaction.user_id == current_user.id,
                Transaction.reference_number == t.reference_number.strip()
            ).first()
            if existing_dup:
                is_duplicate = True
                
        if not is_duplicate:
            dup_query = db.query(Transaction).filter(
                Transaction.user_id == current_user.id,
                Transaction.amount == t.amount,
                Transaction.type == t.type
            )
            
            if is_sqlite:
                dup_query = dup_query.filter(func.strftime('%Y-%m-%d', Transaction.date) == date_parsed.strftime('%Y-%m-%d'))
            else:
                dup_query = dup_query.filter(func.date(Transaction.date) == date_parsed.date())
                
            if t.merchant and t.merchant.strip():
                dup_query_with_merch = dup_query.join(Merchant, Transaction.merchant_id == Merchant.id).filter(
                    Merchant.name.ilike(t.merchant.strip())
                )
                existing_dup = dup_query_with_merch.first()
                
            if existing_dup:
                is_duplicate = True
                
        if is_duplicate:
            duplicates += 1
            if req.duplicate_strategy == "skip":
                skipped += 1
                continue
            elif req.duplicate_strategy == "replace" and existing_dup:
                db.delete(existing_dup)
                db.commit()
                
        cat_id = None
        if t.category and t.category.strip():
            cat_clean = t.category.strip()
            cat_key = cat_clean.lower()
            if cat_key in category_cache:
                cat_id = category_cache[cat_key]
            else:
                new_cat = Category(name=cat_clean, type=t.type, user_id=current_user.id)
                db.add(new_cat)
                db.commit()
                db.refresh(new_cat)
                cat_id = new_cat.id
                category_cache[cat_key] = cat_id
                
        merch_id = None
        if t.merchant and t.merchant.strip():
            merch_clean = t.merchant.strip()
            merch_key = merch_clean.lower()
            if merch_key in merchant_cache:
                merch_id = merchant_cache[merch_key]
            else:
                new_merch = Merchant(name=merch_clean, user_id=current_user.id, default_category_id=cat_id)
                db.add(new_merch)
                db.commit()
                db.refresh(new_merch)
                merch_id = new_merch.id
                merchant_cache[merch_key] = merch_id
                
        db_trans = Transaction(
            user_id=current_user.id,
            amount=t.amount,
            date=date_parsed,
            description=t.description or "",
            category_id=cat_id,
            merchant_id=merch_id,
            payment_method=t.payment_method or "Cash",
            type=t.type,
            is_recurring=False,
            transaction_id=t.transaction_id,
            reference_number=t.reference_number,
            bank=t.bank,
            balance=t.balance,
            debit_amount=t.debit_amount,
            credit_amount=t.credit_amount,
            post_date=t.post_date,
            time=t.time
        )
        db.add(db_trans)
        # Automatically update matching investment quantities if this is an investment purchase
        check_and_update_investments_from_transaction(db, db_trans)
        imported += 1
        
    db.commit()
    return {
        "imported": imported,
        "skipped": skipped,
        "duplicates": duplicates,
        "errors": errors
    }
