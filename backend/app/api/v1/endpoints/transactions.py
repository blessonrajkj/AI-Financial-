from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from datetime import datetime
from typing import List
from pydantic import BaseModel
import io
import csv
from openpyxl import load_workbook

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.models.category_merchant import Category, Merchant
from app.schemas.transaction import TransactionCreate, TransactionUpdate, TransactionOut, CategoryOut, MerchantOut, BulkValidateRequest, BulkImportRequest

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

@router.post("/import", status_code=status.HTTP_201_CREATED)
def import_transactions(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    contents = file.file.read()
    filename = file.filename.lower()
    
    transactions_to_add = []
    
    if filename.endswith('.csv'):
        # Parse CSV
        try:
            stream = io.StringIO(contents.decode("utf-8"))
            reader = csv.DictReader(stream)
            for row in reader:
                transactions_to_add.append(row)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")
    elif filename.endswith('.xlsx') or filename.endswith('.xls'):
        # Parse Excel
        try:
            wb = load_workbook(filename=io.BytesIO(contents), data_only=True)
            ws = wb.active
            headers = [str(cell.value).lower().strip() if cell.value is not None else "" for cell in ws[1]]
            for row in ws.iter_rows(min_row=2, values_only=True):
                if any(row):
                    row_dict = dict(zip(headers, row))
                    transactions_to_add.append(row_dict)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse Excel: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload CSV or Excel.")

    # Process and save transactions
    imported_count = 0
    for t_dict in transactions_to_add:
        # Standardize keys
        t_clean = {str(k).lower().strip(): v for k, v in t_dict.items() if k is not None}
        
        amount_val = t_clean.get('amount')
        if amount_val is None:
            continue
        try:
            amount = float(amount_val)
        except ValueError:
            continue
            
        t_type = str(t_clean.get('type', 'expense')).lower().strip()
        if t_type not in ['income', 'expense']:
            t_type = 'expense'
            
        # Parse date
        date_val = t_clean.get('date')
        if date_val:
            try:
                date_parsed = datetime.strptime(str(date_val).strip(), "%Y-%m-%d")
            except ValueError:
                try:
                    date_parsed = datetime.fromisoformat(str(date_val).strip())
                except ValueError:
                    date_parsed = datetime.now()
        else:
            date_parsed = datetime.now()
            
        desc = t_clean.get('description')
        desc_str = str(desc).strip() if desc else ""
        
        # Category resolution
        cat_name = t_clean.get('category')
        cat_id = None
        if cat_name:
            cat_name_str = str(cat_name).strip()
            category_obj = db.query(Category).filter(
                Category.name.ilike(cat_name_str),
                or_(Category.user_id == None, Category.user_id == current_user.id)
            ).first()
            if not category_obj:
                category_obj = Category(name=cat_name_str, type=t_type, user_id=current_user.id)
                db.add(category_obj)
                db.commit()
                db.refresh(category_obj)
            cat_id = category_obj.id
            
        # Merchant resolution
        merch_name = t_clean.get('merchant')
        merch_id = None
        if merch_name:
            merch_name_str = str(merch_name).strip()
            merchant_obj = db.query(Merchant).filter(
                Merchant.name.ilike(merch_name_str),
                or_(Merchant.user_id == None, Merchant.user_id == current_user.id)
            ).first()
            if not merchant_obj:
                merchant_obj = Merchant(name=merch_name_str, user_id=current_user.id, default_category_id=cat_id)
                db.add(merchant_obj)
                db.commit()
                db.refresh(merchant_obj)
            merch_id = merchant_obj.id
            
        pay_method = t_clean.get('payment_method') or t_clean.get('payment method') or 'Cash'
        pay_method_str = str(pay_method).strip()
        
        db_trans = Transaction(
            user_id=current_user.id,
            amount=amount,
            date=date_parsed,
            description=desc_str,
            category_id=cat_id,
            merchant_id=merch_id,
            payment_method=pay_method_str,
            type=t_type,
            is_recurring=False
        )
        db.add(db_trans)
        imported_count += 1
        
    db.commit()
    return {"message": f"Successfully imported {imported_count} transactions."}

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
            # try iso format
            date_parsed = datetime.fromisoformat(t.date.replace("Z", "+00:00"))
        except Exception:
            try:
                # try YYYY-MM-DD
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
            
        # 3. Duplicate check (Date + Amount + Merchant)
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
    
    # Pre-fetch user's categories and merchants for fast resolution cache
    all_categories = db.query(Category).filter(
        or_(Category.user_id == None, Category.user_id == current_user.id)
    ).all()
    category_cache = {c.name.lower().strip(): c.id for c in all_categories}
    
    all_merchants = db.query(Merchant).filter(
        or_(Merchant.user_id == None, Merchant.user_id == current_user.id)
    ).all()
    merchant_cache = {m.name.lower().strip(): m.id for m in all_merchants}
    
    for t in req.transactions:
        # 1. Parse date
        try:
            date_parsed = datetime.fromisoformat(t.date.replace("Z", "+00:00"))
        except Exception:
            try:
                date_parsed = datetime.strptime(t.date.split("T")[0], "%Y-%m-%d")
            except Exception:
                errors += 1
                continue
                
        # 2. Check amount
        if t.amount <= 0:
            errors += 1
            continue
            
        # 3. Check duplicate
        dup_query = db.query(Transaction).filter(
            Transaction.user_id == current_user.id,
            Transaction.amount == t.amount,
            Transaction.type == t.type
        )
        
        if is_sqlite:
            dup_query = dup_query.filter(func.strftime('%Y-%m-%d', Transaction.date) == date_parsed.strftime('%Y-%m-%d'))
        else:
            dup_query = dup_query.filter(func.date(Transaction.date) == date_parsed.date())
            
        existing_dup = None
        if t.merchant and t.merchant.strip():
            dup_query_with_merch = dup_query.join(Merchant, Transaction.merchant_id == Merchant.id).filter(
                Merchant.name.ilike(t.merchant.strip())
            )
            existing_dup = dup_query_with_merch.first()
            
        if existing_dup:
            duplicates += 1
            if req.duplicate_strategy == "skip":
                skipped += 1
                continue
            elif req.duplicate_strategy == "replace":
                # Delete old duplicate
                db.delete(existing_dup)
                db.commit()
                
        # 4. Resolve Category
        cat_id = None
        if t.category and t.category.strip():
            cat_clean = t.category.strip()
            cat_key = cat_clean.lower()
            if cat_key in category_cache:
                cat_id = category_cache[cat_key]
            else:
                # Create category
                new_cat = Category(name=cat_clean, type=t.type, user_id=current_user.id)
                db.add(new_cat)
                db.commit()
                db.refresh(new_cat)
                cat_id = new_cat.id
                category_cache[cat_key] = cat_id
                
        # 5. Resolve Merchant
        merch_id = None
        if t.merchant and t.merchant.strip():
            merch_clean = t.merchant.strip()
            merch_key = merch_clean.lower()
            if merch_key in merchant_cache:
                merch_id = merchant_cache[merch_key]
            else:
                # Create merchant
                new_merch = Merchant(name=merch_clean, user_id=current_user.id, default_category_id=cat_id)
                db.add(new_merch)
                db.commit()
                db.refresh(new_merch)
                merch_id = new_merch.id
                merchant_cache[merch_key] = merch_id
                
        # 6. Create Transaction
        db_trans = Transaction(
            user_id=current_user.id,
            amount=t.amount,
            date=date_parsed,
            description=t.description or "",
            category_id=cat_id,
            merchant_id=merch_id,
            payment_method=t.payment_method or "Cash",
            type=t.type,
            is_recurring=False
        )
        db.add(db_trans)
        imported += 1
        
    db.commit()
    return {
        "imported": imported,
        "skipped": skipped,
        "duplicates": duplicates,
        "errors": errors
    }
