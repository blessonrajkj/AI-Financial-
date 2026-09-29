from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timezone

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.india_post_investment import IndiaPostInvestment
from app.schemas.india_post_investment import (
    IndiaPostInvestmentCreate,
    IndiaPostInvestmentUpdate,
    IndiaPostInvestmentOut
)

router = APIRouter()

@router.get("", response_model=List[IndiaPostInvestmentOut])
def get_investments(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    return db.query(IndiaPostInvestment).filter(
        IndiaPostInvestment.user_id == current_user.id
    ).order_by(IndiaPostInvestment.investment_date.desc()).all()

@router.get("/summary")
def get_investments_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    investments = db.query(IndiaPostInvestment).filter(
        IndiaPostInvestment.user_id == current_user.id
    ).all()

    active_subs = [i for i in investments if i.status == "Active"]
    matured_subs = [i for i in investments if i.status == "Matured"]

    total_invested = sum(float(i.amount) for i in active_subs)
    total_matured = sum(float(i.amount) for i in matured_subs)

    monthly_interest = 0.0
    estimated_returns = 0.0
    
    allocation = {}
    now = datetime.now(timezone.utc)

    for i in active_subs:
        amt = float(i.amount)
        rate = float(i.interest_rate) / 100.0
        scheme = i.scheme_name
        allocation[scheme] = allocation.get(scheme, 0.0) + amt

        if "Monthly Income Scheme" in scheme or "MIS" in scheme:
            monthly_interest += (amt * rate / 12.0)
        elif "Senior Citizen" in scheme or "SCSS" in scheme:
            monthly_interest += (amt * rate / 12.0)
        elif "Savings Account" in scheme:
            monthly_interest += (amt * rate / 12.0)

        inv_date = i.investment_date
        if inv_date.tzinfo is None:
            inv_date = inv_date.replace(tzinfo=timezone.utc)
            
        years_held = (now - inv_date).days / 365.25
        years_held = max(0.0, years_held)

        if "Public Provident Fund" in scheme or "PPF" in scheme or "NSC" in scheme or "KVP" in scheme:
            current_val = amt * ((1 + rate) ** years_held)
            estimated_returns += max(0.0, current_val - amt)
        else:
            estimated_returns += (amt * rate * years_held)

    portfolio_allocation = [
        {"name": k, "value": round(v, 2)} for k, v in allocation.items()
    ]

    return {
        "metrics": {
            "total_invested": round(total_invested, 2),
            "total_matured": round(total_matured, 2),
            "estimated_returns": round(estimated_returns, 2),
            "monthly_interest_income": round(monthly_interest, 2),
            "active_schemes_count": len(active_subs),
            "matured_schemes_count": len(matured_subs)
        },
        "portfolio_allocation": portfolio_allocation
    }

@router.get("/ai-insights")
def get_ai_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    investments = db.query(IndiaPostInvestment).filter(
        IndiaPostInvestment.user_id == current_user.id
    ).all()

    insights = []
    
    ppf_total = sum(float(i.amount) for i in investments if "PPF" in i.scheme_name or "Public Provident Fund" in i.scheme_name)
    if ppf_total > 0 and ppf_total < 150000.0:
        remaining_ppf = 150000.0 - ppf_total
        insights.append({
            "type": "opportunity",
            "title": "Maximize 80C Tax Deduction",
            "message": f"You've invested ₹{ppf_total:,.2f} in PPF. You can add up to ₹{remaining_ppf:,.2f} more this financial year for maximum 80C tax benefits.",
            "action": "Deposit More to PPF"
        })

    for i in investments:
        if i.status == "Active":
            mat_date = i.maturity_date
            if mat_date.tzinfo is None:
                mat_date = mat_date.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            days_left = (mat_date - now).days
            if 0 <= days_left <= 90:
                insights.append({
                    "type": "warning",
                    "title": f"Maturity Approaching: {i.scheme_name}",
                    "message": f"Your investment of ₹{float(i.amount):,.2f} matures in {days_left} days on {mat_date.strftime('%d %b %Y')}. Plan for withdrawal or reinvestment.",
                    "action": "View Details"
                })

    if not insights:
        insights.append({
            "type": "info",
            "title": "Portfolio Health Good",
            "message": "Your India Post savings schemes are active and yielding guaranteed government-backed returns.",
            "action": "Explore Schemes"
        })

    return {"insights": insights}

@router.post("", response_model=IndiaPostInvestmentOut, status_code=status.HTTP_201_CREATED)
def create_investment(
    inv_in: IndiaPostInvestmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    db_inv = IndiaPostInvestment(
        user_id=current_user.id,
        category=getattr(inv_in, "category", None) or "India Post",
        scheme_name=inv_in.scheme_name,
        amount=inv_in.amount,
        interest_rate=inv_in.interest_rate,
        investment_date=inv_in.investment_date,
        maturity_date=inv_in.maturity_date,
        frequency=inv_in.frequency,
        nominee=inv_in.nominee,
        account_number=inv_in.account_number,
        branch_name=inv_in.branch_name,
        notes=inv_in.notes,
        status=inv_in.status or "Active"
    )
    db.add(db_inv)
    db.commit()
    db.refresh(db_inv)
    return db_inv

@router.get("/{inv_id}", response_model=IndiaPostInvestmentOut)
def get_investment(
    inv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    inv = db.query(IndiaPostInvestment).filter(
        IndiaPostInvestment.id == inv_id,
        IndiaPostInvestment.user_id == current_user.id
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")
    return inv

@router.put("/{inv_id}", response_model=IndiaPostInvestmentOut)
def update_investment(
    inv_id: int,
    inv_in: IndiaPostInvestmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    db_inv = db.query(IndiaPostInvestment).filter(
        IndiaPostInvestment.id == inv_id,
        IndiaPostInvestment.user_id == current_user.id
    ).first()
    if not db_inv:
        raise HTTPException(status_code=404, detail="Investment not found")
        
    update_data = inv_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(db_inv, field, val)
        
    db.commit()
    db.refresh(db_inv)
    return db_inv

@router.delete("/{inv_id}")
def delete_investment(
    inv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    db_inv = db.query(IndiaPostInvestment).filter(
        IndiaPostInvestment.id == inv_id,
        IndiaPostInvestment.user_id == current_user.id
    ).first()
    if not db_inv:
        raise HTTPException(status_code=404, detail="Investment not found")
        
    db.delete(db_inv)
    db.commit()
    return {"message": "Investment deleted successfully"}
