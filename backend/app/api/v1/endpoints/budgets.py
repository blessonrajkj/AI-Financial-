from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
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

from app.services.category_taxonomy import map_legacy_category

def _compute_budget_with_spent(budget: Budget, db: Session, user_id: int) -> dict:
    """Compute the real spent amount for a budget from the transactions table."""
    m = budget.month
    y = budget.year
    month_start = datetime(y, m, 1)
    if m == 12:
        month_end = datetime(y + 1, 1, 1)
    else:
        month_end = datetime(y, m + 1, 1)

    cat_name = budget.category.name if budget.category else ""
    main_cat, _ = map_legacy_category(cat_name)

    all_cats = db.query(Category).all()
    matching_cat_ids = set()
    if budget.category_id:
        matching_cat_ids.add(budget.category_id)

    for c in all_cats:
        c_main, _ = map_legacy_category(c.name)
        if (
            c.id == budget.category_id
            or (cat_name and c.name.lower() == cat_name.lower())
            or (main_cat and c_main.lower() == main_cat.lower())
            or (cat_name and c_main.lower() == cat_name.lower())
            or (main_cat and c.name.lower() == main_cat.lower())
        ):
            matching_cat_ids.add(c.id)

    query_filter = [
        Transaction.user_id == user_id,
        func.lower(Transaction.type) == "expense",
        Transaction.date >= month_start,
        Transaction.date < month_end,
    ]

    cat_conditions = []
    if matching_cat_ids:
        cat_conditions.append(Transaction.category_id.in_(list(matching_cat_ids)))
    if cat_name:
        cat_conditions.append(Transaction.subcategory.ilike(f"%{cat_name}%"))
    if main_cat and main_cat.lower() != cat_name.lower():
        cat_conditions.append(Transaction.subcategory.ilike(f"%{main_cat}%"))

    if cat_conditions:
        query_filter.append(or_(*cat_conditions))

    raw_total = (
        db.query(func.sum(Transaction.amount))
        .filter(*query_filter)
        .scalar()
    )
    total_spent = float(raw_total or 0.0)

    subcat_rows = (
        db.query(
            Transaction.subcategory,
            func.sum(Transaction.amount).label("total"),
        )
        .filter(*query_filter)
        .group_by(Transaction.subcategory)
        .all()
    )

    subcategories_breakdown = [
        {"subcategory": sub or "Uncategorized", "amount": round(float(total), 2)}
        for sub, total in subcat_rows
    ]

    b_amt = float(budget.amount)
    limit = b_amt if b_amt > 0 else 1.0
    progress = (total_spent / limit) * 100
    remaining = max(0.0, b_amt - total_spent)
    exceeded = max(0.0, total_spent - b_amt)

    category_name = budget.category.name if budget.category else "Unknown"

    if progress > 100:
        bar_color = "dark_red"
        status_label = "Exceeded"
    elif progress >= 90:
        bar_color = "red"
        status_label = "Critical"
    elif progress >= 70:
        bar_color = "yellow"
        status_label = "Warning"
    else:
        bar_color = "green"
        status_label = "On Track"

    return {
        "id": budget.id,
        "category_id": budget.category_id,
        "category": {"id": budget.category_id, "name": category_name, "type": "expense"},
        "amount": b_amt,
        "month": budget.month,
        "year": budget.year,
        "created_at": budget.created_at.isoformat() if budget.created_at else None,
        "spent": round(total_spent, 2),
        "remaining": round(remaining, 2),
        "exceeded": round(exceeded, 2),
        "progress_percentage": round(progress, 1),
        "bar_color": bar_color,
        "status_label": status_label,
        "month_label": f"{datetime(y, m, 1).strftime('%B %Y')}",
        "subcategories_breakdown": subcategories_breakdown
    }


@router.get("", response_model=List[dict])
def read_budgets(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    budgets = db.query(Budget).filter(Budget.user_id == current_user.id).order_by(Budget.year.desc(), Budget.month.desc()).all()
    return [_compute_budget_with_spent(b, db, current_user.id) for b in budgets]


@router.post("", status_code=status.HTTP_201_CREATED)
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
        existing.amount = budget_in.amount
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return _compute_budget_with_spent(existing, db, current_user.id)
        
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
    return _compute_budget_with_spent(db_budget, db, current_user.id)


@router.put("/{id}")
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
    return _compute_budget_with_spent(db_budget, db, current_user.id)


@router.delete("/{id}")
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
    return {"message": "Budget deleted successfully", "id": id}


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
    
    return [_compute_budget_with_spent(b, db, current_user.id) for b in budgets]
