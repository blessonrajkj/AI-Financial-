from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta

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
    now = datetime.utcnow()
    last_30_days = now - timedelta(days=30)
    
    income_30 = float(db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == "income",
        Transaction.date >= last_30_days
    ).scalar() or 0.0)
    
    expense_30 = float(db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == "expense",
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
            days_span = (now - tx_date).days
            days_span = max(days_span, 15)  # min 15 days to prevent extreme skew
        else:
            days_span = 30
            
        total_income = float(db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "income"
        ).scalar() or 0.0)
        
        total_expense = float(db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense"
        ).scalar() or 0.0)
        
        net_savings_all = total_income - total_expense
        monthly_savings_rate = (net_savings_all / days_span) * 30.0
    
    response = []
    for g in goals:
        remaining = max(g.target_amount - g.current_amount, 0.0)
        percentage = round((g.current_amount / g.target_amount) * 100.0, 1) if g.target_amount > 0 else 0.0
        percentage = min(percentage, 100.0)
        
        # Calculate AI prediction text
        if remaining <= 0:
            ai_prediction = "Goal achieved! Congratulations!"
        else:
            g_target = g.target_date
            if g_target.tzinfo is not None:
                g_target = g_target.replace(tzinfo=None)
                
            now_naive = datetime.utcnow()
            days_left = (g_target - now_naive).days
            time_left_months = max((days_left / 30.0), 0.1)
            required_rate = remaining / time_left_months
            
            if monthly_savings_rate <= 0:
                ai_prediction = f"⚠️ Spending exceeds income. Save ₹{required_rate:,.2f}/mo to hit target."
            else:
                months_needed = remaining / monthly_savings_rate
                
                # Check if target is out of range (more than 100 years / 1200 months)
                if months_needed > 1200:
                    ai_prediction = f"⚠️ Behind Target. Goal is out of reach at current rate (100+ years). Increase savings by ₹{required_rate - monthly_savings_rate:,.2f}/mo."
                else:
                    try:
                        projected_date = now_naive + timedelta(days=int(months_needed * 30.0))
                        
                        if projected_date <= g_target:
                            ai_prediction = f"✅ On Track! Expected: {projected_date.strftime('%B %Y')} (Monthly savings: ₹{monthly_savings_rate:,.2f})"
                        else:
                            needed_extra = required_rate - monthly_savings_rate
                            ai_prediction = f"⚠️ Behind Target. Expected: {projected_date.strftime('%B %Y')}. Increase savings by ₹{needed_extra:,.2f}/mo."
                    except OverflowError:
                        ai_prediction = f"⚠️ Behind Target. Goal is out of reach at current rate. Increase savings by ₹{required_rate - monthly_savings_rate:,.2f}/mo."
                        
        response.append({
            "id": g.id,
            "name": g.name,
            "target_amount": g.target_amount,
            "current_amount": g.current_amount,
            "target_date": g.target_date.isoformat(),
            "created_at": g.created_at.isoformat(),
            "percentage_completed": percentage,
            "remaining_amount": remaining,
            "ai_prediction": ai_prediction
        })
        
    return response

@router.post("", response_model=SavingsGoalOut, status_code=status.HTTP_201_CREATED)
def create_savings_goal(
    goal_in: SavingsGoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    db_goal = SavingsGoal(
        user_id=current_user.id,
        name=goal_in.name,
        target_amount=goal_in.target_amount,
        current_amount=goal_in.current_amount,
        target_date=goal_in.target_date
    )
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal

@router.put("/{goal_id}", response_model=SavingsGoalOut)
def update_savings_goal(
    goal_id: int,
    goal_in: SavingsGoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    db_goal = db.query(SavingsGoal).filter(
        SavingsGoal.id == goal_id,
        SavingsGoal.user_id == current_user.id
    ).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Savings Goal not found")
        
    update_data = goal_in.dict(exclude_unset=True)
    for field, val in update_data.items():
        setattr(db_goal, field, val)
        
    db.commit()
    db.refresh(db_goal)
    return db_goal

@router.delete("/{goal_id}")
def delete_savings_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    db_goal = db.query(SavingsGoal).filter(
        SavingsGoal.id == goal_id,
        SavingsGoal.user_id == current_user.id
    ).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Savings Goal not found")
        
    db.delete(db_goal)
    db.commit()
    return {"message": "Savings goal deleted successfully."}
