from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Dict

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.models.category_merchant import Category
from app.schemas.budget import BudgetCreate, BudgetUpdate, BudgetOut

router = APIRouter()

@router.get("", response_model=List[BudgetOut])
def read_budgets(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    return db.query(Budget).filter(Budget.user_id == current_user.id).all()

@router.post("", response_model=BudgetOut, status_code=status.HTTP_201_CREATED)
def create_budget(
    budget_in: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    # Verify Category exists
    category = db.query(Category).filter(Category.id == budget_in.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
        
    # Check if budget already exists for this category/month/year
    existing = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.category_id == budget_in.category_id,
        Budget.month == budget_in.month,
        Budget.year == budget_in.year
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Budget limit already defined for this category/period")
        
    db_budget = Budget(
        user_id=current_user.id,
        category_id=budget_in.category_id,
        amount=budget_in.amount,
        month=budget_in.month,
        year=budget_in.year
    )
    db.add(db_budget)
    db.commit()
    db.refresh(db_budget)
    return db_budget

@router.put("/{id}", response_model=BudgetOut)
def update_budget(
    id: int,
    budget_in: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    db_budget = db.query(Budget).filter(
        Budget.id == id, Budget.user_id == current_user.id
    ).first()
    if not db_budget:
        raise HTTPException(status_code=404, detail="Budget not found")
        
    update_data = budget_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_budget, field, value)
        
    db.add(db_budget)
    db.commit()
    db.refresh(db_budget)
    return db_budget

@router.delete("/{id}", response_model=BudgetOut)
def delete_budget(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    db_budget = db.query(Budget).filter(
        Budget.id == id, Budget.user_id == current_user.id
    ).first()
    if not db_budget:
        raise HTTPException(status_code=404, detail="Budget not found")
        
    db.delete(db_budget)
    db.commit()
    return db_budget

@router.get("/status", response_model=List[Dict])
def get_budgets_status(
    month: int | None = None,
    year: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    now = datetime.now()
    m = month or now.month
    y = year or now.year
    
    budgets = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.month == m,
        Budget.year == y
    ).all()
    
    results = []
    for budget in budgets:
        # Sum transactions in category
        total_spent = db.query(Transaction).filter(
            Transaction.user_id == current_user.id,
            Transaction.category_id == budget.category_id,
            Transaction.type == "expense",
            Transaction.date >= datetime(y, m, 1),
            # Approximate end date
            Transaction.date < (datetime(y, m + 1, 1) if m < 12 else datetime(y + 1, 1, 1))
        ).sum(Transaction.amount) or 0.0
        
        # Calculate forecast/pro-rata status
        progress = (total_spent / budget.amount) * 100 if budget.amount > 0 else 0
        
        results.append({
            "budget_id": budget.id,
            "category_id": budget.category_id,
            "category_name": budget.category.name,
            "limit": budget.amount,
            "spent": total_spent,
            "remaining": max(0.0, budget.amount - total_spent),
            "progress_percentage": progress,
            "status": "alert" if progress >= 90 else "warning" if progress >= 75 else "normal"
        })
        
    return results
