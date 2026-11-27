from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
import os
import uuid
import shutil
from datetime import datetime

from app.api import deps
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.models.receipt import Receipt
from app.models.transaction import Transaction
from app.models.category_merchant import Merchant, Category
from app.services.ocr_service import ocr_service
from app.services.ml_categorizer import ml_categorizer
from app.schemas.receipt import ReceiptOut

from app.services.storage import storage_service, generate_object_key, temp_file_for_processing

router = APIRouter()

def validate_receipt_upload(file: UploadFile) -> tuple[str, str, bytes]:
    filename = (file.filename or "receipt.jpg").lower()
    ext = os.path.splitext(filename)[1]
    if ext not in [".jpg", ".jpeg", ".png", ".pdf", ".webp"]:
        raise HTTPException(
            status_code=400,
            detail="Only JPEG, PNG, WebP, and PDF files are allowed."
        )

    file_bytes = file.file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds maximum allowed limit of 10MB.")

    if ext == ".pdf" and not file_bytes.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="Invalid PDF file content.")
    elif ext in [".jpg", ".jpeg"] and not file_bytes.startswith(b"\xff\xd8\xff"):
        raise HTTPException(status_code=400, detail="Invalid JPEG image content.")
    elif ext == ".png" and not file_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        raise HTTPException(status_code=400, detail="Invalid PNG image content.")
    elif ext == ".webp" and not (file_bytes.startswith(b"RIFF") and file_bytes[8:12] == b"WEBP"):
        raise HTTPException(status_code=400, detail="Invalid WebP image content.")

    return filename, ext, file_bytes


@router.post("/upload", status_code=status.HTTP_201_CREATED)
def upload_receipt(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    filename, ext, file_bytes = validate_receipt_upload(file)

    object_key = generate_object_key(current_user.id, "receipts", filename)
    storage_service.upload_file(file_bytes, object_key, content_type=file.content_type)
    db_relative_path = storage_service.get_url(object_key)

    # Run OCR Scan using temporary file for processing
    with temp_file_for_processing(storage_service, object_key, suffix=ext.lower()) as file_path:
        ocr_result = ocr_service.scan_receipt(file_path)
    
    # Save receipt to DB with parsed stats
    db_receipt = Receipt(
        user_id=current_user.id,
        file_path=db_relative_path,
        merchant_name=ocr_result.get("merchant_name"),
        total_amount=ocr_result.get("total_amount"),
        tax_amount=ocr_result.get("tax_amount"),
        transaction_date=ocr_result.get("date"),
        extracted_data=ocr_result,
        status="parsed"
    )
    
    db.add(db_receipt)
    db.commit()
    db.refresh(db_receipt)
    
    # Predict Category based on merchant name
    predicted_cat_id = ml_categorizer.predict_category(ocr_result.get("merchant_name"), "", db)
    predicted_cat_name = "Miscellaneous"
    if predicted_cat_id:
        cat = db.query(Category).filter(Category.id == predicted_cat_id).first()
        if cat:
            predicted_cat_name = cat.name

    return {
        "receipt_id": db_receipt.id,
        "file_path": db_relative_path,
        "merchant_name": db_receipt.merchant_name,
        "total_amount": db_receipt.total_amount,
        "tax_amount": db_receipt.tax_amount,
        "transaction_date": db_receipt.transaction_date,
        "predicted_category": predicted_cat_name,
        "items": ocr_result.get("items", []),
        "payment_method": ocr_result.get("payment_method", "Cash")
    }

from app.services.upi_scanner import upi_scanner

@router.post("/scan-upi", status_code=status.HTTP_201_CREATED)
def scan_upi_screenshot(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(
            status_code=400,
            detail="Only JPEG, PNG and WEBP screenshots are allowed."
        )

    object_key = generate_object_key(current_user.id, "upi", file.filename)
    file_bytes = file.file.read()
    storage_service.upload_file(file_bytes, object_key, content_type=file.content_type)
    db_relative_path = storage_service.get_url(object_key)

    # Run screenshot OCR & classification using temporary file
    with temp_file_for_processing(storage_service, object_key, suffix=ext) as file_path:
        scan_result = upi_scanner.scan_screenshot(file_path)
    
    # Duplicate checking: check by amount + merchant + transaction_id (if available)
    is_duplicate = False
    dup_reason = None
    
    if scan_result["amount"]:
        dup_query = db.query(Transaction).filter(
            Transaction.user_id == current_user.id,
            Transaction.amount == scan_result["amount"]
        )
        if scan_result["transaction_id"]:
            # If transaction ID (UTR/ref) matches in description or tags or metadata, flag it
            dup_query_with_id = dup_query.filter(
                Transaction.description.like(f"%{scan_result['transaction_id']}%")
            )
            if dup_query_with_id.first():
                is_duplicate = True
                dup_reason = f"A transaction with ID {scan_result['transaction_id']} already exists."
        
        if not is_duplicate:
            # Check if same merchant + amount today
            start_of_day = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999999)
            
            # Look for merchant matches
            dup_merchant = dup_query.filter(
                Transaction.date >= start_of_day,
                Transaction.date <= end_of_day
            ).all()
            for tx in dup_merchant:
                # Match merchant names loosely
                m_name = ""
                if tx.merchant:
                    m_name = tx.merchant.name.lower()
                if scan_result["merchant"].lower() in m_name or m_name in scan_result["merchant"].lower():
                    is_duplicate = True
                    dup_reason = f"Duplicate Transaction Found: A payment of ₹{scan_result['amount']} to {scan_result['merchant']} was already logged today."
                    break

    # Save to Receipts table
    db_receipt = Receipt(
        user_id=current_user.id,
        file_path=db_relative_path,
        merchant_name=scan_result.get("merchant"),
        total_amount=scan_result.get("amount"),
        tax_amount=0.0,
        transaction_date=datetime.now(),
        extracted_data=scan_result,
        status="parsed"
    )
    db.add(db_receipt)
    db.commit()
    db.refresh(db_receipt)

    return {
        "receipt_id": db_receipt.id,
        "file_path": db_relative_path,
        "merchant": scan_result.get("merchant"),
        "amount": scan_result.get("amount"),
        "upi_id": scan_result.get("upi_id"),
        "date": scan_result.get("date"),
        "time": scan_result.get("time"),
        "status": scan_result.get("status"),
        "payment_app": scan_result.get("payment_app"),
        "category": scan_result.get("category"),
        "transaction_id": scan_result.get("transaction_id"),
        "bank_name": scan_result.get("bank_name"),
        "confidence_score": scan_result.get("confidence_score"),
        "needs_review": scan_result.get("needs_review"),
        "review_fields": scan_result.get("review_fields"),
        "is_duplicate": is_duplicate,
        "duplicate_reason": dup_reason
    }

@router.post("/confirm/{receipt_id}", status_code=status.HTTP_201_CREATED)
def confirm_receipt(
    receipt_id: int,
    amount: float,
    merchant_name: str,
    category_name: str,
    date: datetime,
    payment_method: str = "Cash",
    description: str | None = None,
    transaction_type: str = "expense",
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    receipt = db.query(Receipt).filter(
        Receipt.id == receipt_id, Receipt.user_id == current_user.id
    ).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
        
    # Check or create Category
    category = db.query(Category).filter(
        Category.name.ilike(category_name)
    ).first()
    if not category:
        category = Category(name=category_name, type=transaction_type.lower(), user_id=current_user.id)
        db.add(category)
        db.commit()
        db.refresh(category)
        
    # Check or create Merchant
    merchant = db.query(Merchant).filter(
        Merchant.name.ilike(merchant_name)
    ).first()
    if not merchant:
        merchant = Merchant(name=merchant_name, user_id=current_user.id, default_category_id=category.id)
        db.add(merchant)
        db.commit()
        db.refresh(merchant)
        
    # Create transaction
    transaction = Transaction(
        user_id=current_user.id,
        amount=amount,
        date=date,
        description=description or f"OCR Scan: {merchant_name}",
        category_id=category.id,
        merchant_id=merchant.id,
        payment_method=payment_method,
        type=transaction_type.lower(),
        receipt_id=receipt.id
    )
    
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    
    # Retrain categorizer model asynchronously in background
    ml_categorizer.train_model(db)
    
    return transaction
