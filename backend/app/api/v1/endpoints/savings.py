from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta, timezone

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.savings_goal import SavingsGoal
from app.models.transaction import Transaction
from app.schemas.savings_goal import SavingsGoalCreate, SavingsGoalUpdate, SavingsGoalOut

router = APIRouter()

@router.get("", response_model=List[dict])
def get_savings_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    goals = db.query(SavingsGoal).filter(SavingsGoal.user_id == current_user.id).all()
    
    # 1. Calculate user's monthly savings rate based on recent transactions (last 30 days)
    now = datetime.now(timezone.utc)
    last_30_days = now - timedelta(days=30)
    
    income_30 = float(db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        func.lower(Transaction.type) == "income",
        Transaction.date >= last_30_days
    ).scalar() or 0.0)
    
    expense_30 = float(db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        func.lower(Transaction.type) == "expense",
        Transaction.date >= last_30_days
    ).scalar() or 0.0)
    
    net_savings_30 = income_30 - expense_30
    
    if net_savings_30 > 0:
        monthly_savings_rate = net_savings_30
    else:
        # Fall back to all-time averages if recent is <= 0 or empty
        first_tx = db.query(Transaction).filter(Transaction.user_id == current_user.id).order_by(Transaction.date.asc()).first()
        if first_tx:
            tx_date = first_tx.date
            if tx_date.tzinfo is not None:
                tx_date = tx_date.replace(tzinfo=None)
            now_naive = now.replace(tzinfo=None)
            days_span = (now_naive - tx_date).days
            days_span = max(days_span, 15)  # min 15 days to prevent extreme skew
        else:
            days_span = 30
            
        total_income = float(db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == current_user.id,
            func.lower(Transaction.type) == "income"
        ).scalar() or 0.0)
        
        total_expense = float(db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == current_user.id,
            func.lower(Transaction.type) == "expense"
        ).scalar() or 0.0)
        
        net_savings_all = total_income - total_expense
        monthly_savings_rate = (net_savings_all / days_span) * 30.0 if days_span > 0 else 0.0

    result = []
    for g in goals:
        target_amt = float(g.target_amount)
        current_amt = float(g.current_amount)
        remaining = max(target_amt - current_amt, 0.0)
        progress_percentage = min((current_amt / target_amt * 100.0), 100.0) if target_amt > 0 else 0.0

        effective_rate = max(monthly_savings_rate, 0.0)

        if remaining <= 0:
            ai_prediction = "🎉 Goal achieved! Target completed."
        else:
            g_target = g.target_date
            if g_target and g_target.tzinfo is not None:
                g_target = g_target.replace(tzinfo=None)
            now_naive = now.replace(tzinfo=None)
                
            days_left = max((g_target - now_naive).days, 1) if g_target else 30
            time_left_months = max((days_left / 30.0), 0.1)
            required_rate = remaining / time_left_months
            
            target_str = g_target.strftime('%b %Y') if g_target else "Target"
            
            if effective_rate <= 0:
                ai_prediction = f"⚠️ Target: {target_str}. Save ₹{required_rate:,.2f}/mo to reach target on time (Current velocity: ₹0.00/mo)."
            else:
                months_needed = remaining / effective_rate
                
                if months_needed > 1200:
                    ai_prediction = f"⚠️ Behind Target. Target: {target_str}. Save ₹{required_rate:,.2f}/mo to reach target on time."
                else:
                    try:
                        projected_date = now_naive + timedelta(days=int(months_needed * 30.0))
                        
                        if (g_target and projected_date <= g_target) or effective_rate >= required_rate:
                            ai_prediction = f"✅ On Track! Expected: {projected_date.strftime('%B %Y')} (Monthly velocity: ₹{effective_rate:,.2f}/mo)"
                        else:
                            needed_extra = max(required_rate - effective_rate, 0.0)
                            ai_prediction = f"⚠️ Behind Target. Target: {target_str} (Est: {projected_date.strftime('%b %Y')}). Save ₹{required_rate:,.2f}/mo (Increase by ₹{needed_extra:,.2f}/mo)."
                    except OverflowError:
                        ai_prediction = f"⚠️ Behind Target. Target: {target_str}. Save ₹{required_rate:,.2f}/mo to reach target on time."

        result.append({
            "id": g.id,
            "user_id": g.user_id,
            "name": g.name,
            "target_amount": target_amt,
            "current_amount": current_amt,
            "target_date": g.target_date.isoformat() if g.target_date else None,
            "created_at": g.created_at.isoformat() if g.created_at else None,
            "remaining": round(remaining, 2),
            "remaining_amount": round(remaining, 2),
            "progress_percentage": round(progress_percentage, 1),
            "percentage_completed": round(progress_percentage, 1),
            "ai_prediction": ai_prediction
        })
        
    return result

@router.post("", response_model=SavingsGoalOut, status_code=status.HTTP_201_CREATED)
def create_savings_goal(
    goal_in: SavingsGoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    goal = SavingsGoal(
        user_id=current_user.id,
        name=goal_in.name,
        target_amount=goal_in.target_amount,
        current_amount=goal_in.current_amount or 0.0,
        target_date=goal_in.target_date
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal

@router.put("/{goal_id}", response_model=SavingsGoalOut)
def update_savings_goal(
    goal_id: int,
    goal_in: SavingsGoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    goal = db.query(SavingsGoal).filter(SavingsGoal.id == goal_id, SavingsGoal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Savings goal not found")
        
    update_data = goal_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(goal, field, val)
        
    db.commit()
    db.refresh(goal)
    return goal

@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_savings_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    goal = db.query(SavingsGoal).filter(SavingsGoal.id == goal_id, SavingsGoal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Savings goal not found")
        
    db.delete(goal)
    db.commit()
    return None
