from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timezone

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.subscription import Subscription
from app.models.transaction import Transaction
from app.schemas.subscription import SubscriptionCreate, SubscriptionUpdate, SubscriptionOut

router = APIRouter()

@router.get("", response_model=dict)
def get_subscriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    subscriptions = db.query(Subscription).filter(Subscription.user_id == current_user.id).all()
    
    active_subs = [s for s in subscriptions if s.is_active]
    
    # Calculate costs safely using float conversion
    monthly_cost = 0.0
    annual_cost = 0.0
    
    for s in active_subs:
        amt = float(s.amount or 0.0)
        cycle = (s.billing_cycle or "monthly").lower()
        if cycle == "monthly":
            monthly_cost += amt
            annual_cost += (amt * 12.0)
        else:
            monthly_cost += (amt / 12.0)
            annual_cost += amt
            
    # Next AutoPay Date
    autopay_subs = [s for s in active_subs if s.is_autopay and s.next_billing_date]
    next_autopay = None
    if autopay_subs:
        future_autopays = [s.next_billing_date for s in autopay_subs if s.next_billing_date]
        if future_autopays:
            next_autopay = min(future_autopays).isoformat()
            
    # Upcoming Renewals (next 30 days)
    upcoming = []
    now = datetime.utcnow()
    for s in active_subs:
        if not s.next_billing_date:
            continue
        b_date = s.next_billing_date
        if b_date.tzinfo is not None:
            b_date = b_date.replace(tzinfo=None)
            
        days_until = (b_date - now).days
        upcoming.append({
            "id": s.id,
            "name": s.name,
            "amount": float(s.amount or 0.0),
            "billing_cycle": s.billing_cycle or "monthly",
            "next_billing_date": s.next_billing_date.isoformat(),
            "is_autopay": bool(s.is_autopay),
            "days_until": days_until
        })
    upcoming.sort(key=lambda x: x["days_until"])

    # Calculate Subscription Health Score
    month_start = datetime(datetime.now().year, datetime.now().month, 1)
    raw_income = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == "income",
        Transaction.date >= month_start
    ).scalar()
    
    monthly_income = float(raw_income) if raw_income is not None else 0.0
    
    # Fallback to general average monthly income if current month income is zero
    if monthly_income <= 0:
        raw_gen_income = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "income"
        ).scalar()
        monthly_income = float(raw_gen_income) if raw_gen_income is not None else 50000.0
        
    ratio = (monthly_cost / monthly_income) if monthly_income > 0 else 0.0
    
    # Base score
    if ratio <= 0.02:
        score = 100
        desc = "Excellent! Subscription spend is negligible (under 2% of income)."
    elif ratio <= 0.05:
        score = 90
        desc = "Great! Subscriptions are well within a healthy budget (under 5% of income)."
    elif ratio <= 0.10:
        score = 75
        desc = "Moderate subscription load. Keep an eye on recurring expenses (5-10% of income)."
    elif ratio <= 0.15:
        score = 60
        desc = "High subscription overhead. Consider cancelling unused or secondary memberships."
    else:
        score = 40
        desc = "⚠️ Critical overhead! Subscriptions absorb a major share of your monthly cash flow."
        
    # Deductions for manual pays
    if active_subs:
        manual_ratio = sum(1 for s in active_subs if not s.is_autopay) / len(active_subs)
        score -= int(manual_ratio * 10)
        score = max(score, 10)

    # Standard serialization of subscriptions items
    items = []
    for s in subscriptions:
        items.append({
            "id": s.id,
            "name": s.name,
            "amount": float(s.amount or 0.0),
            "billing_cycle": s.billing_cycle or "monthly",
            "next_billing_date": s.next_billing_date.isoformat() if s.next_billing_date else None,
            "is_active": bool(s.is_active),
            "is_autopay": bool(s.is_autopay),
            "created_at": s.created_at.isoformat() if s.created_at else None
        })

    return {
        "summary": {
            "active_subscriptions_count": len(active_subs),
            "monthly_cost": round(monthly_cost, 2),
            "annual_cost": round(annual_cost, 2),
            "next_autopay_date": next_autopay,
            "health_score": score,
            "health_score_desc": desc
        },
        "upcoming_renewals": upcoming,
        "items": items
    }

@router.post("", response_model=SubscriptionOut, status_code=status.HTTP_201_CREATED)
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
        is_active=sub_in.is_active,
        is_autopay=sub_in.is_autopay
    )
    db.add(db_sub)
    db.commit()
    db.refresh(db_sub)
    return db_sub

@router.put("/{sub_id}", response_model=SubscriptionOut)
def update_subscription(
    sub_id: int,
    sub_in: SubscriptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    db_sub = db.query(Subscription).filter(
        Subscription.id == sub_id,
        Subscription.user_id == current_user.id
    ).first()
    if not db_sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
        
    update_data = sub_in.model_dump(exclude_unset=True) if hasattr(sub_in, 'model_dump') else sub_in.dict(exclude_unset=True)
    for field, val in update_data.items():
        setattr(db_sub, field, val)
        
    db.commit()
    db.refresh(db_sub)
    return db_sub

@router.delete("/{sub_id}")
def delete_subscription(
    sub_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    db_sub = db.query(Subscription).filter(
        Subscription.id == sub_id,
        Subscription.user_id == current_user.id
    ).first()
    if not db_sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
        
    db.delete(db_sub)
    db.commit()
    return {"message": "Subscription record deleted successfully."}
