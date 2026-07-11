from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timezone, timedelta

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
def list_investments(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    return db.query(IndiaPostInvestment).filter(
        IndiaPostInvestment.user_id == current_user.id
    ).all()

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

    total_invested = sum(i.amount for i in active_subs)
    total_matured = sum(i.amount for i in matured_subs)

    # Calculate estimated returns and monthly interest
    monthly_interest = 0.0
    estimated_returns = 0.0
    
    # Portfolio allocation grouping
    allocation = {}
    
    now = datetime.now(timezone.utc)

    for i in active_subs:
        # Group allocations
        scheme = i.scheme_name
        allocation[scheme] = allocation.get(scheme, 0.0) + i.amount

        # Calculate monthly interest equivalencies
        rate = i.interest_rate / 100.0
        if scheme == "Monthly Income Scheme (MIS)":
            monthly_interest += (i.amount * rate / 12.0)
        elif scheme == "Senior Citizen Savings Scheme (SCSS)":
            # Quarterly payout, divide by 3 for monthly
            monthly_interest += (i.amount * rate / 12.0)
        elif scheme == "Post Office Savings Account":
            monthly_interest += (i.amount * rate / 12.0)

        # Simple returns calculations (accrued interest since purchase date)
        # Handle timezone-aware vs naive dates
        inv_date = i.investment_date
        if inv_date.tzinfo is None:
            inv_date = inv_date.replace(tzinfo=timezone.utc)
            
        years_held = (now - inv_date).days / 365.25
        years_held = max(0.0, years_held)

        if i.frequency == "Monthly":
            # Recurring deposit approximation
            total_contrib = i.amount * (years_held * 12)
            interest = total_contrib * (i.interest_rate / 200.0) * (years_held / 2.0)
            estimated_returns += interest
        else:
            # Lumpsum approximation
            interest = i.amount * ((1 + rate) ** min(years_held, 15.0)) - i.amount
            estimated_returns += interest

    # Find upcoming maturities in next 90 days
    upcoming_maturity_list = []
    limit_date = now + timedelta(days=90)
    for i in active_subs:
        mat_date = i.maturity_date
        if mat_date.tzinfo is None:
            mat_date = mat_date.replace(tzinfo=timezone.utc)
            
        if now <= mat_date <= limit_date:
            upcoming_maturity_list.append({
                "id": i.id,
                "scheme_name": i.scheme_name,
                "amount": i.amount,
                "maturity_date": i.maturity_date.isoformat(),
                "days_remaining": (mat_date - now).days
            })

    # Prepare allocations charts data
    allocation_list = [{"name": k, "value": round(v, 2)} for k, v in allocation.items()]

    return {
        "metrics": {
            "total_invested": total_invested,
            "total_matured": total_matured,
            "estimated_returns": estimated_returns,
            "monthly_interest": monthly_interest,
            "active_schemes_count": len(active_subs),
            "matured_schemes_count": len(matured_subs)
        },
        "portfolio_allocation": allocation_list,
        "upcoming_maturities": upcoming_maturity_list
    }

@router.get("/ai-insights")
def get_ai_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    investments = db.query(IndiaPostInvestment).filter(
        IndiaPostInvestment.user_id == current_user.id,
        IndiaPostInvestment.status == "Active"
    ).all()

    insights = []
    reminders = []
    
    now = datetime.now(timezone.utc)
    
    # Static checking limits rules
    ppf_total = sum(i.amount for i in investments if "PPF" in i.scheme_name)
    mis_total = sum(i.amount for i in investments if "MIS" in i.scheme_name)
    scss_total = sum(i.amount for i in investments if "SCSS" in i.scheme_name)

    # 1. PPF Checks
    if ppf_total > 0:
        if ppf_total < 150000.0:
            insights.append({
                "type": "info",
                "message": f"Your PPF contribution limit is not yet reached. You can invest another ₹{150000.0 - ppf_total:,.2f} this fiscal year."
            })
            reminders.append({
                "title": "PPF Contribution",
                "message": "Deposit remaining balance into your PPF account before March 31 to maximize tax exemptions."
            })
        else:
            insights.append({
                "type": "success",
                "message": "Excellent! You have fully utilized your ₹1.5L PPF contribution limit for Section 80C exemptions."
            })
    else:
        insights.append({
            "type": "tip",
            "message": "Consider starting a Public Provident Fund (PPF) account for secure, tax-free 7.1% compounded returns under Sec 80C."
        })

    # 2. MIS Checks
    if mis_total > 0:
        insights.append({
            "type": "info",
            "message": "Your Monthly Income Scheme (MIS) accounts are actively paying interest directly to your linked savings line."
        })
        reminders.append({
            "title": "MIS Interest payout",
            "message": "Post Office MIS monthly interest payout is scheduled to credit next week."
        })

    # 3. SCSS Checks
    if scss_total > 0:
        reminders.append({
            "title": "SCSS Quarterly Payout",
            "message": "Quarterly interest payout for Senior Citizen Savings Scheme will be credited on the next calendar quarter end."
        })

    # 4. Maturity checks
    for i in investments:
        mat_date = i.maturity_date
        if mat_date.tzinfo is None:
            mat_date = mat_date.replace(tzinfo=timezone.utc)
            
        days_left = (mat_date - now).days
        if 0 < days_left <= 90:
            insights.append({
                "type": "warning",
                "message": f"Your {i.scheme_name} (A/C: {i.account_number or 'N/A'}) matures in {days_left} days."
            })
            reminders.append({
                "title": f"{i.scheme_name} Maturing",
                "message": f"Account {i.account_number or ''} will mature on {i.maturity_date.strftime('%d-%b-%Y')}. Plan reinvestments."
            })

    # Default general insights
    if not investments:
        insights.append({
            "type": "info",
            "message": "No India Post schemes tracked yet. Post Office schemes offer sovereign safety backed directly by the Gov of India."
        })

    # Calculate returns projection
    total_yearly_est = sum(i.amount * (i.interest_rate / 100.0) for i in investments)
    insights.append({
        "type": "success",
        "message": f"Estimated total interest returns this year from Post Office portfolio: ₹{total_yearly_est:,.2f}."
    })

    return {
        "insights": insights,
        "reminders": reminders
    }

@router.post("", response_model=IndiaPostInvestmentOut, status_code=status.HTTP_201_CREATED)
def create_investment(
    inv_in: IndiaPostInvestmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    db_inv = IndiaPostInvestment(
        user_id=current_user.id,
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
        status=inv_in.status
    )
    db.add(db_inv)
    db.commit()
    db.refresh(db_inv)
    return db_inv

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
        
    update_data = inv_in.dict(exclude_unset=True)
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
    return {"message": "India Post Investment record deleted successfully."}
