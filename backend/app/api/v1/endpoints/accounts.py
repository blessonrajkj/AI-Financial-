from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.account import Account
from app.schemas.account import AccountCreate, AccountUpdate, AccountOut

router = APIRouter()

@router.get("/", response_model=List[AccountOut])
def get_user_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all accounts for current user."""
    accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    return accounts

@router.post("/", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
def create_account(
    account_in: AccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new financial account."""
    account = Account(
        user_id=current_user.id,
        account_name=account_in.account_name,
        bank_name=account_in.bank_name,
        account_type=account_in.account_type,
        balance=account_in.balance,
        currency=account_in.currency,
        account_number_mask=account_in.account_number_mask,
        is_active=account_in.is_active,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account

@router.get("/{account_id}", response_model=AccountOut)
def get_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific account by ID."""
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account

@router.put("/{account_id}", response_model=AccountOut)
def update_account(
    account_id: int,
    account_in: AccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update account details."""
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    update_data = account_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(account, field, value)
        
    db.commit()
    db.refresh(account)
    return account

@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an account."""
    from sqlalchemy import or_
    from app.models.transfer import Transfer

    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    has_transfers = db.query(Transfer).filter(
        or_(
            Transfer.source_account_id == account.id,
            Transfer.destination_account_id == account.id
        )
    ).first()
    if has_transfers:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete account with existing transfers; reassign or archive instead"
        )

    db.delete(account)
    db.commit()
    return None
