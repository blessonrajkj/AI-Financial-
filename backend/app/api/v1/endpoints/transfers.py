from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.account import Account
from app.models.transfer import Transfer
from app.models.transaction import Transaction
from app.schemas.transfer import TransferCreate, TransferOut

router = APIRouter()

@router.get("/", response_model=List[TransferOut])
def get_user_transfers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all internal transfers for current user."""
    transfers = db.query(Transfer).filter(Transfer.user_id == current_user.id).order_by(Transfer.transfer_date.desc()).all()
    return transfers

@router.post("/", response_model=TransferOut, status_code=status.HTTP_201_CREATED)
def create_transfer(
    transfer_in: TransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create double-entry account transfer."""
    if transfer_in.source_account_id == transfer_in.destination_account_id:
        raise HTTPException(status_code=400, detail="Source and destination accounts must be different")

    source_acc = db.query(Account).filter(Account.id == transfer_in.source_account_id, Account.user_id == current_user.id).first()
    dest_acc = db.query(Account).filter(Account.id == transfer_in.destination_account_id, Account.user_id == current_user.id).first()

    if not source_acc or not dest_acc:
        raise HTTPException(status_code=404, detail="Source or destination account not found")

    if transfer_in.amount <= 0:
        raise HTTPException(status_code=400, detail="Transfer amount must be positive")

    transfer_time = transfer_in.transfer_date or datetime.now(timezone.utc)

    transfer = Transfer(
        user_id=current_user.id,
        source_account_id=source_acc.id,
        destination_account_id=dest_acc.id,
        amount=transfer_in.amount,
        transfer_date=transfer_time,
        reference_number=transfer_in.reference_number,
        notes=transfer_in.notes,
    )
    db.add(transfer)
    db.flush()

    source_acc.balance -= transfer_in.amount
    dest_acc.balance += transfer_in.amount

    debit_tx = Transaction(
        user_id=current_user.id,
        account_id=source_acc.id,
        amount=transfer_in.amount,
        debit_amount=transfer_in.amount,
        type="transfer",
        date=transfer_time,
        description=f"Transfer to {dest_acc.account_name} ({dest_acc.bank_name})",
        payment_method="Transfer",
        transfer_id=transfer.id,
        reference_number=transfer_in.reference_number,
    )

    credit_tx = Transaction(
        user_id=current_user.id,
        account_id=dest_acc.id,
        amount=transfer_in.amount,
        credit_amount=transfer_in.amount,
        type="transfer",
        date=transfer_time,
        description=f"Transfer from {source_acc.account_name} ({source_acc.bank_name})",
        payment_method="Transfer",
        transfer_id=transfer.id,
        reference_number=transfer_in.reference_number,
    )

    db.add(debit_tx)
    db.add(credit_tx)
    db.commit()
    db.refresh(transfer)

    return transfer
