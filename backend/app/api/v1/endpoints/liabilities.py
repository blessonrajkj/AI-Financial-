from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from decimal import Decimal
from typing import List

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.liability import Liability
from app.schemas.liability import LiabilityCreate, LiabilityUpdate, LiabilityOut

router = APIRouter()

@router.get("/", response_model=List[LiabilityOut])
def get_user_liabilities(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all liabilities for current user."""
    return db.query(Liability).filter(Liability.user_id == current_user.id).all()

@router.post("/", response_model=LiabilityOut, status_code=status.HTTP_201_CREATED)
def create_liability(
    liability_in: LiabilityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new liability obligation."""
    liability = Liability(
        user_id=current_user.id,
        name=liability_in.name,
        liability_type=liability_in.liability_type,
        total_amount=liability_in.total_amount,
        remaining_amount=liability_in.remaining_amount,
        interest_rate=liability_in.interest_rate,
        minimum_payment=liability_in.minimum_payment,
        due_date=liability_in.due_date,
        status=liability_in.status,
    )
    db.add(liability)
    db.commit()
    db.refresh(liability)
    return liability

@router.get("/summary")
def get_liabilities_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get debt health metrics, total liabilities, and minimum monthly obligations."""
    liabilities = db.query(Liability).filter(Liability.user_id == current_user.id, Liability.status == "Active").all()
    
    total_principal = sum(l.total_amount for l in liabilities) or Decimal("0.00")
    total_remaining = sum(l.remaining_amount for l in liabilities) or Decimal("0.00")
    monthly_minimums = sum(l.minimum_payment for l in liabilities) or Decimal("0.00")
    
    if total_remaining > 0:
        weighted_rate = sum(l.remaining_amount * l.interest_rate for l in liabilities) / total_remaining
    else:
        weighted_rate = Decimal("0.00")

    return {
        "total_active_liabilities": len(liabilities),
        "total_original_principal": float(total_principal),
        "total_remaining_balance": float(total_remaining),
        "monthly_minimum_obligations": float(monthly_minimums),
        "weighted_average_interest_rate": float(round(weighted_rate, 2)),
    }

@router.get("/{liability_id}", response_model=LiabilityOut)
def get_liability(
    liability_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get specific liability by ID."""
    liability = db.query(Liability).filter(Liability.id == liability_id, Liability.user_id == current_user.id).first()
    if not liability:
        raise HTTPException(status_code=404, detail="Liability not found")
    return liability

@router.put("/{liability_id}", response_model=LiabilityOut)
def update_liability(
    liability_id: int,
    liability_in: LiabilityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update liability details."""
    liability = db.query(Liability).filter(Liability.id == liability_id, Liability.user_id == current_user.id).first()
    if not liability:
        raise HTTPException(status_code=404, detail="Liability not found")
    
    update_data = liability_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(liability, field, value)
        
    db.commit()
    db.refresh(liability)
    return liability

@router.delete("/{liability_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_liability(
    liability_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a liability."""
    liability = db.query(Liability).filter(Liability.id == liability_id, Liability.user_id == current_user.id).first()
    if not liability:
        raise HTTPException(status_code=404, detail="Liability not found")
    db.delete(liability)
    db.commit()
    return None
