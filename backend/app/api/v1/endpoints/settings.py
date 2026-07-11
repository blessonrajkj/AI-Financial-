from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.subscription import Subscription
from app.models.investment import Investment
from app.schemas.misc import SubscriptionCreate, SubscriptionOut, InvestmentCreate, InvestmentOut

router = APIRouter()

# SUBSCRIPTIONS
@router.get("/subscriptions", response_model=List[SubscriptionOut])
def read_subscriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    return db.query(Subscription).filter(Subscription.user_id == current_user.id).all()

@router.post("/subscriptions", response_model=SubscriptionOut, status_code=status.HTTP_201_CREATED)
def create_subscription(
    sub_in: SubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    db_sub = Subscription(
        user_id=current_user.id,
        name=sub_in.name,
        amount=sub_in.amount,
        billing_cycle=sub_in.billing_cycle,
        next_billing_date=sub_in.next_billing_date,
        is_active=sub_in.is_active
    )
    db.add(db_sub)
    db.commit()
    db.refresh(db_sub)
    return db_sub

@router.put("/subscriptions/{id}", response_model=SubscriptionOut)
def update_subscription(
    id: int,
    sub_in: SubscriptionCreate,  # Re-use schema
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    db_sub = db.query(Subscription).filter(
        Subscription.id == id, Subscription.user_id == current_user.id
    ).first()
    if not db_sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
        
    for field, value in sub_in.dict().items():
        setattr(db_sub, field, value)
        
    db.add(db_sub)
    db.commit()
    db.refresh(db_sub)
    return db_sub

@router.delete("/subscriptions/{id}", response_model=SubscriptionOut)
def delete_subscription(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    db_sub = db.query(Subscription).filter(
        Subscription.id == id, Subscription.user_id == current_user.id
    ).first()
    if not db_sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
        
    db.delete(db_sub)
    db.commit()
    return db_sub

# INVESTMENTS
@router.get("/investments", response_model=List[InvestmentOut])
def read_investments(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    return db.query(Investment).filter(Investment.user_id == current_user.id).all()

@router.post("/investments", response_model=InvestmentOut, status_code=status.HTTP_201_CREATED)
def create_investment(
    inv_in: InvestmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    db_inv = Investment(
        user_id=current_user.id,
        asset_name=inv_in.asset_name,
        asset_type=inv_in.asset_type,
        quantity=inv_in.quantity,
        purchase_price=inv_in.purchase_price,
        current_price=inv_in.current_price,
        purchase_date=inv_in.purchase_date
    )
    db.add(db_inv)
    db.commit()
    db.refresh(db_inv)
    return db_inv

@router.put("/investments/{id}", response_model=InvestmentOut)
def update_investment(
    id: int,
    inv_in: InvestmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    db_inv = db.query(Investment).filter(
        Investment.id == id, Investment.user_id == current_user.id
    ).first()
    if not db_inv:
        raise HTTPException(status_code=404, detail="Investment not found")
        
    for field, value in inv_in.dict().items():
        setattr(db_inv, field, value)
        
    db.add(db_inv)
    db.commit()
    db.refresh(db_inv)
    return db_inv

@router.delete("/investments/{id}", response_model=InvestmentOut)
def delete_investment(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    db_inv = db.query(Investment).filter(
        Investment.id == id, Investment.user_id == current_user.id
    ).first()
    if not db_inv:
        raise HTTPException(status_code=404, detail="Investment not found")
        
    db.delete(db_inv)
    db.commit()
    return db_inv
