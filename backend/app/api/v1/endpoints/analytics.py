from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case
from datetime import datetime, timedelta
from decimal import Decimal
import csv
import io
from typing import List, Dict

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.models.category_merchant import Category, Merchant
from app.models.budget import Budget
from app.models.investment import Investment
from app.models.subscription import Subscription
from app.models.notification import Notification
from app.models.savings_goal import SavingsGoal
from app.models.india_post_investment import IndiaPostInvestment
from app.models.account import Account
from app.models.liability import Liability
from app.services.forecaster import forecaster
from app.services.fraud_detector import fraud_detector

router = APIRouter()

@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    now = datetime.now()
    
    # Check if there are any transactions for the user in the current month/year
    has_current_month_tx = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.date >= datetime(now.year, now.month, 1)
    ).first()
    
    # If no transactions in the current month, fallback to the latest transaction's month and year
    if not has_current_month_tx:
        latest_tx = db.query(Transaction).filter(
            Transaction.user_id == current_user.id
        ).order_by(Transaction.date.desc()).first()
        if latest_tx:
            now = latest_tx.date
            
    month_start = datetime(now.year, now.month, 1)
    
    # Calculate next month start for range filtering
    if now.month == 12:
        next_month_start = datetime(now.year + 1, 1, 1)
        prev_month_start = datetime(now.year, 11, 1)
        prev_month_end = datetime(now.year, 12, 1) - timedelta(seconds=1)
    else:
        next_month_start = datetime(now.year, now.month + 1, 1)
        if now.month == 1:
            prev_month_start = datetime(now.year - 1, 12, 1)
            prev_month_end = datetime(now.year, 1, 1) - timedelta(seconds=1)
        else:
            prev_month_start = datetime(now.year, now.month - 1, 1)
            prev_month_end = datetime(now.year, now.month, 1) - timedelta(seconds=1)

    # 1. Total spent and income calculations for current month (Task 7 & 8) - Consolidated
    current_month_aggs = db.query(
        func.sum(case((Transaction.type == "expense", Transaction.amount), else_=0)).label("expense"),
        func.sum(case((Transaction.type == "income", Transaction.amount), else_=0)).label("income")
    ).filter(
        Transaction.user_id == current_user.id,
        Transaction.date >= month_start,
        Transaction.date < next_month_start
    ).first()

    current_month_expense = float(current_month_aggs.expense or 0.0)
    current_month_income = float(current_month_aggs.income or 0.0)

    # 2. Previous Month Comparisons (Task 7 & 8) - Consolidated
    prev_month_aggs = db.query(
        func.sum(case((Transaction.type == "expense", Transaction.amount), else_=0)).label("expense"),
        func.sum(case((Transaction.type == "income", Transaction.amount), else_=0)).label("income")
    ).filter(
        Transaction.user_id == current_user.id,
        Transaction.date >= prev_month_start,
        Transaction.date <= prev_month_end
    ).first()

    prev_month_expense = float(prev_month_aggs.expense or 0.0)
    prev_month_income = float(prev_month_aggs.income or 0.0)

    expense_diff_pct = 0.0
    if prev_month_expense > 0:
        expense_diff_pct = round(((current_month_expense - prev_month_expense) / prev_month_expense) * 100, 1)

    income_diff_pct = 0.0
    if prev_month_income > 0:
        income_diff_pct = round(((current_month_income - prev_month_income) / prev_month_income) * 100, 1)

    # 3. Balance parameters: Total Income - Total Expense + Investment Returns (Task 6) - Consolidated
    total_aggs = db.query(
        func.sum(case((Transaction.type == "income", Transaction.amount), else_=0)).label("income"),
        func.sum(case((Transaction.type == "expense", Transaction.amount), else_=0)).label("expense")
    ).filter(
        Transaction.user_id == current_user.id
    ).first()

    total_income = float(total_aggs.income or 0.0)
    total_expense = float(total_aggs.expense or 0.0)

    # Investment returns (uses current stored prices; price updating is asynchronous/on-demand)
    investments_db = db.query(Investment).filter(Investment.user_id == current_user.id).all()
    total_investments_current = float(sum(i.quantity * i.current_price for i in investments_db))
    total_investments_cost = float(sum(i.quantity * i.purchase_price for i in investments_db))
    dividends_received = float(sum(i.dividends_received for i in investments_db))
    investment_returns = total_investments_current - total_investments_cost + dividends_received

    current_balance = total_income - total_expense + investment_returns

    # Net Worth calculation: account balances + investment current value + India Post active value - liabilities
    total_account_balances = float(db.query(func.sum(Account.balance)).filter(
        Account.user_id == current_user.id,
        Account.is_active == True
    ).scalar() or 0.0)

    total_liabilities = float(db.query(func.sum(Liability.remaining_amount)).filter(
        Liability.user_id == current_user.id,
        Liability.status == "Active"
    ).scalar() or 0.0)

    total_india_post_val = float(sum(ip.amount for ip in db.query(IndiaPostInvestment).filter(
        IndiaPostInvestment.user_id == current_user.id,
        IndiaPostInvestment.status == "Active"
    ).all()))

    net_worth = total_account_balances + total_investments_current + total_india_post_val - total_liabilities

    # 4. Budgets parameters: only subtract expenses belonging to budgeted categories
    budget_rows = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.month == now.month,
        Budget.year == now.year
    ).all()
    total_budget_limit = float(sum(b.amount for b in budget_rows))
    budget_cat_ids = [b.category_id for b in budget_rows if b.category_id is not None]

    if budget_cat_ids:
        budgeted_expenses = float(db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            Transaction.category_id.in_(budget_cat_ids),
            Transaction.date >= month_start,
            Transaction.date < next_month_start
        ).scalar() or 0.0)
    else:
        budgeted_expenses = 0.0

    has_budget = total_budget_limit > 0
    budget_remaining = max(0.0, total_budget_limit - budgeted_expenses) if has_budget else 0.0

    # 5. Savings rate & Real AI generated insight (Task 3)
    current_month_savings = current_month_income - current_month_expense
    savings_rate = 0.0
    if current_month_income > 0:
        savings_rate = round((current_month_savings / current_month_income) * 100, 1)

    prev_month_savings = prev_month_income - prev_month_expense
    prev_savings_rate = 0.0
    if prev_month_income > 0:
        prev_savings_rate = round((prev_month_savings / prev_month_income) * 100, 1)

    savings_rate_diff = round(savings_rate - prev_savings_rate, 1)
    if savings_rate_diff >= 0:
        insight_text = f"Great work! Savings rate improved by {savings_rate_diff}% compared to last month."
        insight_type = "improvement"
    else:
        insight_text = f"Warning: Savings rate dropped by {abs(savings_rate_diff)}%."
        insight_type = "alert"

    # Upcoming Subscriptions / Bills with monthly equivalent
    upcoming_subscriptions = db.query(Subscription).filter(
        Subscription.user_id == current_user.id,
        Subscription.is_active == True
    ).all()

    def _monthly_subscription_cost(amt: float, cycle: str | None) -> float:
        c = (cycle or "monthly").lower().strip()
        if c in ("yearly", "annual", "annually"):
            return amt / 12.0
        if c in ("quarterly",):
            return amt / 3.0
        if c in ("biannual", "bi-annual", "semi-annual", "semiannual"):
            return amt / 6.0
        if c in ("weekly",):
            return amt * 4.33
        if c in ("daily",):
            return amt * 30.0
        return amt

    upcoming_bills_cost = sum(_monthly_subscription_cost(float(s.amount), s.billing_cycle) for s in upcoming_subscriptions)

    # 6. Financial Health Score calculation (Task 4)
    # Savings Rate score (max 25 pts)
    savings_score_pts = min(25, max(0, int((savings_rate / 30.0) * 25))) if savings_rate > 0 else 0
    # Budget Usage score (max 20 pts)
    budget_usage_pct = budgeted_expenses / total_budget_limit if total_budget_limit > 0 else 0
    budget_score_pts = max(0, int(20 * (1.0 - budget_usage_pct))) if total_budget_limit > 0 else 15
    # Debt ratio score (max 15 pts) factoring in liabilities
    if total_liabilities <= 0:
        debt_score_pts = 15
    elif current_month_income > 0:
        debt_ratio = total_liabilities / (current_month_income * 12.0)
        debt_score_pts = max(0, int(15 * (1.0 - min(debt_ratio, 1.0))))
    else:
        debt_score_pts = 5
    # Investment Growth score (max 15 pts)
    investment_score_pts = 15 if investment_returns > 0 else 10
    # Emergency Fund score (max 10 pts)
    emergency_score_pts = min(10, max(0, int((current_balance / 100000.0) * 10)))
    # Subscription Control score (max 5 pts) factoring in subscription burden
    if current_month_income > 0:
        sub_ratio = upcoming_bills_cost / current_month_income
        if sub_ratio <= 0.05:
            subscription_score_pts = 5
        elif sub_ratio <= 0.15:
            subscription_score_pts = 3
        else:
            subscription_score_pts = 1
    else:
        sub_count = len(upcoming_subscriptions)
        subscription_score_pts = 5 if sub_count < 5 else 3
    # Bill Payments score (max 5 pts)
    bill_score_pts = 5
    # Cash Flow Stability score (max 5 pts)
    cash_flow_score_pts = 5 if current_month_income >= current_month_expense else 2

    health_score = min(100, max(0, savings_score_pts + budget_score_pts + debt_score_pts + investment_score_pts + emergency_score_pts + subscription_score_pts + bill_score_pts + cash_flow_score_pts))

    # 7. Notifications Center: Return real DB notifications only (no fake demo notifications)
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(15).all()

    unread_notifications_count = sum(1 for n in notifications if not n.is_read)

    # 8. Top Categories & Spending by Merchant scoped to current month
    top_cat_rows = db.query(
        Category.name,
        func.sum(Transaction.amount).label("total")
    ).join(Transaction, Transaction.category_id == Category.id).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == "expense",
        Transaction.date >= month_start,
        Transaction.date < next_month_start
    ).group_by(Category.name).order_by(func.sum(Transaction.amount).desc()).limit(5).all()
    top_categories = [{"name": row[0], "amount": round(float(row[1] or 0.0), 2)} for row in top_cat_rows]

    merchant_spend_rows = db.query(
        Merchant.name,
        func.sum(Transaction.amount).label("total")
    ).join(Transaction, Transaction.merchant_id == Merchant.id).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == "expense",
        Transaction.date >= month_start,
        Transaction.date < next_month_start
    ).group_by(Merchant.name).order_by(func.sum(Transaction.amount).desc()).limit(5).all()
    spending_by_merchant = [{"name": row[0], "amount": round(float(row[1] or 0.0), 2)} for row in merchant_spend_rows]

    # 9. Recent Activities (last 10 transactions) - Eagerly loaded to prevent N+1 queries
    recent_transactions_db = db.query(Transaction).options(
        joinedload(Transaction.merchant),
        joinedload(Transaction.category)
    ).filter(
        Transaction.user_id == current_user.id
    ).order_by(Transaction.date.desc()).limit(10).all()

    recent_transactions = []
    for t in recent_transactions_db:
        recent_transactions.append({
            "id": t.id,
            "amount": t.amount,
            "date": t.date.strftime("%Y-%m-%d"),
            "description": t.description,
            "merchant": t.merchant.name if t.merchant else "Unknown",
            "category": t.category.name if t.category else "Uncategorized",
            "type": t.type,
            "payment_method": t.payment_method
        })

    # 10. Goals Summary (Task 14)
    goals = db.query(SavingsGoal).filter(SavingsGoal.user_id == current_user.id).all()
    goals_summary = {
        "total": len(goals),
        "completed": sum(1 for g in goals if g.current_amount >= g.target_amount),
        "goals_list": [
            {
                "id": g.id,
                "name": g.name,
                "target_amount": g.target_amount,
                "current_amount": g.current_amount,
                "progress_percentage": round((g.current_amount / g.target_amount * 100), 1) if g.target_amount > 0 else 0.0
            } for g in goals
        ]
    }

    # 11. Investments Summary (Task 14)
    investments_summary = {
        "total_value": round(total_investments_current, 2),
        "total_returns": round(investment_returns, 2),
        "investments_list": [
            {
                "id": inv.id,
                "asset_name": inv.asset_name,
                "asset_type": inv.asset_type,
                "quantity": inv.quantity,
                "purchase_price": inv.purchase_price,
                "current_price": inv.current_price,
                "value": round(inv.quantity * inv.current_price, 2)
            } for inv in investments_db
        ]
    }

    return {
        "monthly_spending": round(current_month_expense, 2),
        "monthly_income": round(current_month_income, 2),
        "current_balance": round(current_balance, 2),
        "net_worth": round(net_worth, 2),
        "budget_remaining": round(budget_remaining, 2),
        "total_budget_limit": round(total_budget_limit, 2),
        "has_budget": has_budget,
        "savings_rate": savings_rate,
        "health_score": health_score,
        "monthly_comparison": {
            "income_diff_pct": income_diff_pct,
            "expense_diff_pct": expense_diff_pct
        },
        "ai_insight": {
            "insight_text": insight_text,
            "insight_type": insight_type,
            "savings_rate_diff": savings_rate_diff
        },
        "unread_notifications_count": unread_notifications_count,
        "notifications": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "type": n.type,
                "is_read": n.is_read,
                "created_at": n.created_at.strftime("%Y-%m-%d %H:%M")
            } for n in notifications
        ],
        "recent_transactions": recent_transactions,
        "upcoming_bills": [
            {
                "id": s.id,
                "name": s.name,
                "amount": s.amount,
                "billing_cycle": s.billing_cycle,
                "next_payment_date": s.next_billing_date.strftime("%Y-%m-%d") if s.next_billing_date else "N/A"
            } for s in upcoming_subscriptions
        ],
        "upcoming_bills_cost": round(upcoming_bills_cost, 2),
        "goals_summary": goals_summary,
        "investments_summary": investments_summary,
        "top_categories": top_categories,
        "spending_by_merchant": spending_by_merchant
    }

# Dynamic Notification Operations (Task 5)
@router.get("/notifications", response_model=List[Dict])
def get_user_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    notifs = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).all()
    
    return [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "is_read": n.is_read,
            "created_at": n.created_at.strftime("%Y-%m-%d %H:%M")
        } for n in notifs
    ]

@router.post("/notifications/{id}/read")
def mark_notification_read(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    notif = db.query(Notification).filter(
        Notification.id == id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notif.is_read = True
    db.add(notif)
    db.commit()
    return {"status": "success", "id": id}

@router.post("/notifications/mark-all-read")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({Notification.is_read: True}, synchronize_session=False)
    
    db.commit()
    return {"status": "success"}

@router.get("/trends")
def get_spending_trends(
    days: int = Query(30, ge=1, le=366),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    now = datetime.now()
    
    # Check if there are any transactions for the user in the current month/year
    has_current_month_tx = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.date >= datetime(now.year, now.month, 1)
    ).first()
    
    # If no transactions in the current month, fallback to the latest transaction's month and year
    if not has_current_month_tx:
        latest_tx = db.query(Transaction).filter(
            Transaction.user_id == current_user.id
        ).order_by(Transaction.date.desc()).first()
        if latest_tx:
            now = latest_tx.date

    # Aggregated spending by category (last 30 days)
    start_date = now - timedelta(days=days)
    
    category_sums = db.query(
        Category.name,
        func.sum(Transaction.amount)
    ).join(Transaction, Transaction.category_id == Category.id).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == "expense",
        Transaction.date >= start_date
    ).group_by(Category.name).all()

    cat_subcat_sums = db.query(
        Category.name,
        Transaction.subcategory,
        func.sum(Transaction.amount)
    ).join(Transaction, Transaction.category_id == Category.id).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == "expense",
        Transaction.date >= start_date
    ).group_by(Category.name, Transaction.subcategory).all()

    cat_map = {}
    for name, val in category_sums:
        cat_map[name] = {"name": name, "value": round(float(val or 0.0), 2), "subcategories": []}

    for c_name, s_name, s_val in cat_subcat_sums:
        if c_name in cat_map:
            cat_map[c_name]["subcategories"].append({
                "name": s_name or "Uncategorized",
                "value": round(float(s_val or 0.0), 2)
            })

    category_data = list(cat_map.values())

    # Daily sums of income and expense
    if db.bind.dialect.name == "sqlite":
        daily_sums = db.query(
            func.strftime('%Y-%m-%d', Transaction.date).label('day'),
            Transaction.type,
            func.sum(Transaction.amount)
        ).filter(
            Transaction.user_id == current_user.id,
            Transaction.date >= start_date
        ).group_by('day', Transaction.type).order_by('day').all()
    else:
        daily_sums = db.query(
            func.date_trunc('day', Transaction.date).label('day'),
            Transaction.type,
            func.sum(Transaction.amount)
        ).filter(
            Transaction.user_id == current_user.id,
            Transaction.date >= start_date
        ).group_by('day', Transaction.type).order_by('day').all()

    # Smart step-bucket aggregation based on requested timeframe
    step = 1
    if days > 180:
        step = 14
    elif days > 60:
        step = 7
    elif days > 30:
        step = 3

    daily_dict = {}
    curr = start_date
    while curr <= now:
        day_str = curr.strftime("%Y-%m-%d")
        daily_dict[day_str] = {"date": day_str, "income": 0.0, "expense": 0.0, "savings": 0.0}
        curr += timedelta(days=step)

    bucket_dates = sorted(daily_dict.keys())

    for row in daily_sums:
        day_val, t_type, total_val = row
        total_val = float(total_val or 0.0)
        if isinstance(day_val, datetime):
            d_obj = day_val.date()
        elif isinstance(day_val, str):
            try:
                d_obj = datetime.strptime(day_val[:10], "%Y-%m-%d").date()
            except Exception:
                d_obj = now.date()
        else:
            d_obj = now.date()

        # Assign to nearest bucket
        assigned_bucket = bucket_dates[-1]
        for i in range(len(bucket_dates)):
            b_date = datetime.strptime(bucket_dates[i], "%Y-%m-%d").date()
            next_b_date = b_date + timedelta(days=step)
            if b_date <= d_obj < next_b_date:
                assigned_bucket = bucket_dates[i]
                break

        t_type_clean = str(t_type).lower()
        if t_type_clean == "income":
            daily_dict[assigned_bucket]["income"] += total_val
        elif t_type_clean == "expense":
            daily_dict[assigned_bucket]["expense"] += total_val

    for b_str in daily_dict:
        daily_dict[b_str]["income"] = round(daily_dict[b_str]["income"], 2)
        daily_dict[b_str]["expense"] = round(daily_dict[b_str]["expense"], 2)
        daily_dict[b_str]["savings"] = round(daily_dict[b_str]["income"] - daily_dict[b_str]["expense"], 2)

    sorted_daily = sorted(daily_dict.values(), key=lambda x: x["date"])

    return {
        "categories": category_data,
        "daily_spending": sorted_daily
    }

@router.get("/forecast")
def get_forecast(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    return forecaster.forecast_spending(db, current_user.id)

@router.get("/fraud")
def get_fraud_warnings(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    return fraud_detector.scan_for_anomalies(db, current_user.id)


@router.get("/top-merchants")
def get_top_merchants(
    limit: int = Query(10, ge=1, le=100),
    days: int = Query(90, ge=1, le=366),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Return the top N merchants by total spending in the last `days` days."""
    from app.models.category_merchant import Merchant
    start_date = datetime.now() - timedelta(days=days)

    merchant_sums = db.query(
        Merchant.name,
        func.sum(Transaction.amount).label("total_spent"),
        func.count(Transaction.id).label("tx_count")
    ).join(Transaction, Transaction.merchant_id == Merchant.id).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == "expense",
        Transaction.date >= start_date
    ).group_by(Merchant.name).order_by(func.sum(Transaction.amount).desc()).limit(limit).all()

    return [
        {
            "merchant_name": row[0],
            "total_spent": round(float(row[1]), 2),
            "tx_count": row[2]
        }
        for row in merchant_sums
    ]


def get_filtered_transactions_query(
    db: Session,
    user_id: int,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    category_id: int | None = None,
    merchant_id: int | None = None,
    min_amount: float | None = None,
    max_amount: float | None = None,
    type: str | None = None,
    payment_method: str | None = None,
    search: str | None = None,
    tags: str | None = None
):
    from sqlalchemy import or_
    query = db.query(Transaction).filter(Transaction.user_id == user_id)
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    if merchant_id:
        query = query.filter(Transaction.merchant_id == merchant_id)
    if min_amount:
        query = query.filter(Transaction.amount >= min_amount)
    if max_amount:
        query = query.filter(Transaction.amount <= max_amount)
    if type:
        query = query.filter(Transaction.type == type)
    if payment_method:
        query = query.filter(Transaction.payment_method == payment_method)
    if tags:
        query = query.filter(Transaction.tags.like(f"%{tags}%"))
    if search:
        query = query.filter(
            or_(
                Transaction.description.ilike(f"%{search}%"),
                Transaction.tags.ilike(f"%{search}%")
            )
        )
    return query.order_by(Transaction.date.desc())


def sanitize_csv_cell(val):
    if val is None:
        return ""
    val_str = str(val)
    if val_str and val_str[0] in ("=", "+", "-", "@"):
        return "'" + val_str
    return val

@router.get("/export/csv")
def export_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    category_id: int | None = None,
    merchant_id: int | None = None,
    min_amount: float | None = None,
    max_amount: float | None = None,
    type: str | None = None,
    payment_method: str | None = None,
    search: str | None = None,
    tags: str | None = None
):
    query = get_filtered_transactions_query(
        db, current_user.id, start_date, end_date, category_id, merchant_id,
        min_amount, max_amount, type, payment_method, search, tags
    )
    transactions = query.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Date", "Description", "Merchant", "Category", "Amount", "Type", "Payment Method", "Tags", "Transaction ID", "Reference Number", "Bank", "Balance", "Time"])
    
    for t in transactions:
        writer.writerow([
            t.id,
            t.date.strftime("%Y-%m-%d %H:%M"),
            sanitize_csv_cell(t.description or ""),
            sanitize_csv_cell(t.merchant.name if t.merchant else "Unknown"),
            sanitize_csv_cell(t.category.name if t.category else "Uncategorized"),
            t.amount,
            sanitize_csv_cell(t.type),
            sanitize_csv_cell(t.payment_method),
            sanitize_csv_cell(t.tags or ""),
            sanitize_csv_cell(t.transaction_id or ""),
            sanitize_csv_cell(t.reference_number or ""),
            sanitize_csv_cell(t.bank or ""),
            sanitize_csv_cell(t.balance or ""),
            sanitize_csv_cell(t.time or "")
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transactions_export.csv"}
    )


@router.get("/export/excel")
def export_excel(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    category_id: int | None = None,
    merchant_id: int | None = None,
    min_amount: float | None = None,
    max_amount: float | None = None,
    type: str | None = None,
    payment_method: str | None = None,
    search: str | None = None,
    tags: str | None = None
):
    try:
        from openpyxl import Workbook
    except ImportError:
        raise HTTPException(status_code=500, detail="openpyxl library not installed")

    query = get_filtered_transactions_query(
        db, current_user.id, start_date, end_date, category_id, merchant_id,
        min_amount, max_amount, type, payment_method, search, tags
    )
    transactions = query.all()

    wb = Workbook()
    ws = wb.active
    ws.title = "Transactions"
    
    ws.append(["ID", "Date", "Description", "Merchant", "Category", "Amount", "Type", "Payment Method", "Tags", "Transaction ID", "Reference Number", "Bank", "Balance", "Time"])
    for t in transactions:
        ws.append([
            t.id,
            t.date.strftime("%Y-%m-%d %H:%M"),
            sanitize_csv_cell(t.description or ""),
            sanitize_csv_cell(t.merchant.name if t.merchant else "Unknown"),
            sanitize_csv_cell(t.category.name if t.category else "Uncategorized"),
            t.amount,
            sanitize_csv_cell(t.type),
            sanitize_csv_cell(t.payment_method),
            sanitize_csv_cell(t.tags or ""),
            sanitize_csv_cell(t.transaction_id or ""),
            sanitize_csv_cell(t.reference_number or ""),
            sanitize_csv_cell(t.bank or ""),
            sanitize_csv_cell(t.balance or ""),
            sanitize_csv_cell(t.time or "")
        ])

    file_stream = io.BytesIO()
    wb.save(file_stream)
    file_stream.seek(0)
    
    return StreamingResponse(
        file_stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=transactions_export.xlsx"}
    )


@router.get("/export/pdf")
def export_pdf(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    category_id: int | None = None,
    merchant_id: int | None = None,
    min_amount: float | None = None,
    max_amount: float | None = None,
    type: str | None = None,
    payment_method: str | None = None,
    search: str | None = None,
    tags: str | None = None
):
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors
    except ImportError:
        raise HTTPException(status_code=500, detail="reportlab library not installed")

    query = get_filtered_transactions_query(
        db, current_user.id, start_date, end_date, category_id, merchant_id,
        min_amount, max_amount, type, payment_method, search, tags
    )
    transactions = query.limit(1000).all()

    pdf_buffer = io.BytesIO()
    doc = SimpleDocTemplate(pdf_buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=15
    )
    
    body_style = styles['Normal']
    
    elements = []
    # Title
    elements.append(Paragraph(f"Financial Transaction Report", title_style))
    elements.append(Paragraph(f"Generated for: {current_user.full_name or current_user.email}", body_style))
    elements.append(Paragraph(f"Report Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}", body_style))
    elements.append(Spacer(1, 20))

    # Table representation of Transactions
    data = [["Date", "Description", "Merchant", "Category", "Amount", "Type", "Bank"]]
    for t in transactions:
        data.append([
            t.date.strftime("%Y-%m-%d"),
            t.description[:20] if t.description else "",
            t.merchant.name[:12] if t.merchant else "Unknown",
            t.category.name[:12] if t.category else "Uncategorized",
            f"{t.amount}",
            t.type.upper(),
            t.bank[:10] if t.bank else "N/A"
        ])

    table = Table(data, colWidths=[65, 120, 85, 85, 60, 55, 70])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#3B82F6')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#F8FAFC')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
    ]))
    
    elements.append(table)
    doc.build(elements)
    
    pdf_buffer.seek(0)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=transactions_export.pdf"}
    )

@router.get("/reports/generate")
def generate_custom_report(
    report_type: str,
    period: str, # e.g. "2026-07" or "2026"
    format: str = "json", # json or csv
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    from datetime import datetime
    import io
    import csv
    from app.models.savings_goal import SavingsGoal
    from app.models.investment import Investment
    from app.models.category_merchant import Category
    from app.models.budget import Budget

    # Parse period dates
    year = datetime.now().year
    month = datetime.now().month
    
    if "-" in period:
        try:
            parsed_dt = datetime.strptime(period, "%Y-%m")
            year = parsed_dt.year
            month = parsed_dt.month
            start_date = datetime(year, month, 1)
            if month == 12:
                end_date = datetime(year + 1, 1, 1)
            else:
                end_date = datetime(year, month + 1, 1)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid period format. Expected 'YYYY-MM' or 'YYYY'."
            )
    else:
        try:
            parsed_dt = datetime.strptime(period, "%Y")
            year = parsed_dt.year
            start_date = datetime(year, 1, 1)
            end_date = datetime(year + 1, 1, 1)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid period format. Expected 'YYYY-MM' or 'YYYY'."
            )

    title = f"{report_type.replace('_', ' ').title()} Report ({period})"
    headers = []
    rows = []
    summary = {}

    if report_type in ["monthly", "annual"]:
        # Summarize income, expenses, savings
        total_income = float(db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "income",
            Transaction.date >= start_date,
            Transaction.date < end_date
        ).scalar() or 0.0)

        total_expense = float(db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            Transaction.date >= start_date,
            Transaction.date < end_date
        ).scalar() or 0.0)

        net_savings = total_income - total_expense
        savings_rate = (net_savings / total_income * 100.0) if total_income > 0 else 0.0

        # Top Categories
        category_sums = db.query(
            Category.name,
            func.sum(Transaction.amount)
        ).join(Transaction, Transaction.category_id == Category.id).filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            Transaction.date >= start_date,
            Transaction.date < end_date
        ).group_by(Category.name).order_by(func.sum(Transaction.amount).desc()).all()

        summary = {
            "Total Income": f"₹{total_income:,.2f}",
            "Total Expenses": f"₹{total_expense:,.2f}",
            "Net Savings": f"₹{net_savings:,.2f}",
            "Savings Rate": f"{savings_rate:.1f}%",
            "Top Spend Category": category_sums[0][0] if category_sums else "N/A"
        }

        headers = ["Category", "Amount Spent", "Percentage of Budget"]
        total_spent = sum(float(val or 0.0) for name, val in category_sums)
        for name, val in category_sums:
            val_f = float(val or 0.0)
            pct = (val_f / total_spent * 100.0) if total_spent > 0 else 0.0
            rows.append([name, f"₹{val_f:,.2f}", f"{pct:.1f}%"])

    elif report_type in ["income", "expense"]:
        tx_type = "income" if report_type == "income" else "expense"
        transactions = db.query(Transaction).filter(
            Transaction.user_id == current_user.id,
            Transaction.type == tx_type,
            Transaction.date >= start_date,
            Transaction.date < end_date
        ).order_by(Transaction.date.desc()).all()

        total_amt = sum(t.amount for t in transactions)
        summary = {
            f"Total {report_type.title()}": f"₹{total_amt:,.2f}",
            "Transaction Count": len(transactions)
        }

        headers = ["Date", "Description", "Merchant", "Category", "Amount", "Method"]
        for t in transactions:
            rows.append([
                t.date.strftime("%Y-%m-%d"),
                t.description or "",
                t.merchant.name if t.merchant else "N/A",
                t.category.name if t.category else "N/A",
                f"₹{t.amount:,.2f}",
                t.payment_method
            ])

    elif report_type == "tax":
        # Calculate income
        total_income = float(db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "income",
            Transaction.date >= start_date,
            Transaction.date < end_date
        ).scalar() or 0.0)

        # Calculate deductions from PPF and NPS investments (scoped to fiscal year period)
        ppf_deduction = float(db.query(func.sum(Investment.quantity * Investment.purchase_price)).filter(
            Investment.user_id == current_user.id,
            Investment.asset_type == "PPF",
            Investment.purchase_date >= start_date,
            Investment.purchase_date < end_date
        ).scalar() or 0.0)

        nps_deduction = float(db.query(func.sum(Investment.quantity * Investment.purchase_price)).filter(
            Investment.user_id == current_user.id,
            Investment.asset_type == "NPS",
            Investment.purchase_date >= start_date,
            Investment.purchase_date < end_date
        ).scalar() or 0.0)

        sec_80c = min(ppf_deduction, 150000.0)
        sec_80ccd = min(nps_deduction, 50000.0)
        standard_deduction = 75000.0
        total_deductions = sec_80c + sec_80ccd + standard_deduction

        taxable_income = max(total_income - total_deductions, 0.0)

        # Simplified New Tax Regime Calculation
        tax = 0.0
        temp_income = taxable_income
        
        # FY 2025-26 New Regime Brackets:
        # Up to 3L: Nil
        # 3L - 7L: 5%
        # 7L - 10L: 10%
        # 10L - 14L: 15%
        # 14L - 15L: 20%
        # Above 15L: 30%
        if temp_income > 1500000:
            tax += (temp_income - 1500000) * 0.30
            temp_income = 1500000
        if temp_income > 1400000:
            tax += (temp_income - 1400000) * 0.20
            temp_income = 1400000
        if temp_income > 1000000:
            tax += (temp_income - 1000000) * 0.15
            temp_income = 1000000
        if temp_income > 700000:
            tax += (temp_income - 700000) * 0.10
            temp_income = 700000
        if temp_income > 300000:
            tax += (temp_income - 300000) * 0.05

        # Tax Rebate under Section 87A: if taxable income is <= 7L, tax is NIL (fully rebated)
        if taxable_income <= 700000:
            tax = 0.0

        summary = {
            "Gross Annual Income": f"₹{total_income:,.2f}",
            "Standard Deduction": f"₹{standard_deduction:,.2f}",
            "80C Deductions (PPF)": f"₹{sec_80c:,.2f}",
            "80CCD Deductions (NPS)": f"₹{sec_80ccd:,.2f}",
            "Taxable Net Income": f"₹{taxable_income:,.2f}",
            "Estimated Income Tax": f"₹{tax:,.2f}"
        }

        headers = ["Tax Deduction Type", "Declared Invested Amount", "Applicable Deduction Cap"]
        rows.append(["Standard Deduction", f"₹{standard_deduction:,.2f}", f"₹{standard_deduction:,.2f}"])
        rows.append(["Section 80C (PPF)", f"₹{ppf_deduction:,.2f}", "₹1,50,000.00"])
        rows.append(["Section 80CCD (NPS)", f"₹{nps_deduction:,.2f}", "₹50,000.00"])

    elif report_type == "investment":
        investments = db.query(Investment).filter(Investment.user_id == current_user.id).all()
        
        total_p = Decimal("0.00")
        total_c = Decimal("0.00")
        total_divs = Decimal("0.00")
        
        headers = ["Asset Name", "Type", "Holdings", "Purchase Value", "Current Value", "CAGR %", "Dividends Received"]
        for inv in investments:
            qty = Decimal(str(inv.quantity or 0))
            p_price = Decimal(str(inv.purchase_price or 0))
            c_price = Decimal(str(inv.current_price or inv.purchase_price or 0))
            divs = Decimal(str(inv.dividends_received or 0))

            p_val = qty * p_price
            c_val = qty * c_price
            total_p += p_val
            total_c += c_val
            total_divs += divs
            
            # CAGR
            years = 1.0
            if inv.purchase_date:
                delta = datetime.utcnow() - inv.purchase_date.replace(tzinfo=None)
                years = max(delta.days / 365.25, 0.1)

            p_float = float(p_val)
            c_float = float(c_val)
            cagr = ((c_float / p_float) ** (1 / years) - 1.0) * 100.0 if p_float > 0 and c_float > 0 else 0.0
            
            rows.append([
                inv.asset_name,
                inv.asset_type,
                f"{float(qty):.2f}",
                f"₹{p_val:,.2f}",
                f"₹{c_val:,.2f}",
                f"{cagr:.1f}%",
                f"₹{divs:,.2f}"
            ])
            
        pl = total_c - total_p
        pl_pct = (float(pl) / float(total_p) * 100.0) if total_p > Decimal("0") else 0.0
        
        summary = {
            "Total Invested Capital": f"₹{total_p:,.2f}",
            "Current Portfolio Value": f"₹{total_c:,.2f}",
            "Total Dividend Inflow": f"₹{total_divs:,.2f}",
            "Cumulative Returns (P/L)": f"₹{pl:,.2f} ({pl_pct:+.1f}%)"
        }

    elif report_type == "savings":
        goals = db.query(SavingsGoal).filter(SavingsGoal.user_id == current_user.id).all()
        
        total_saved = sum((Decimal(str(g.current_amount or 0)) for g in goals), Decimal("0.00"))
        total_target = sum((Decimal(str(g.target_amount or 0)) for g in goals), Decimal("0.00"))
        overall_progress = (float(total_saved) / float(total_target) * 100.0) if total_target > Decimal("0") else 0.0

        summary = {
            "Active Savings Plans": len(goals),
            "Total Amount Saved": f"₹{total_saved:,.2f}",
            "Aggregate Target Reserve": f"₹{total_target:,.2f}",
            "Aggregate Completion Progress": f"{overall_progress:.1f}%"
        }

        headers = ["Goal Objective", "Target Amount", "Current Amount Saved", "% Completed", "Target Date"]
        for g in goals:
            g_tgt = Decimal(str(g.target_amount or 0))
            g_curr = Decimal(str(g.current_amount or 0))
            pct = (float(g_curr) / float(g_tgt) * 100.0) if g_tgt > Decimal("0") else 0.0
            rows.append([
                g.name,
                f"₹{g_tgt:,.2f}",
                f"₹{g_curr:,.2f}",
                f"{pct:.1f}%",
                g.target_date.strftime("%Y-%m-%d") if g.target_date else "N/A"
            ])

    elif report_type == "budget_performance":
        budgets = db.query(Budget).filter(
            Budget.user_id == current_user.id,
            Budget.month == month,
            Budget.year == year
        ).all()

        summary = {
            "Configured Budget Caps": len(budgets),
            "Report Period": f"{month:02d}/{year}"
        }

        headers = ["Category", "Spend Limit Cap", "Actual Monthly Spending", "Variance Amount", "Performance Status"]
        for b in budgets:
            actual_spent = float(db.query(func.sum(Transaction.amount)).filter(
                Transaction.user_id == current_user.id,
                Transaction.category_id == b.category_id,
                Transaction.type == "expense",
                Transaction.date >= start_date,
                Transaction.date < end_date
            ).scalar() or 0.0)

            variance = float(b.amount) - actual_spent
            status_text = "OVERSPENT ⚠️" if variance < 0 else "Under Budget ✅"
            rows.append([
                b.category.name if b.category else "Unknown",
                f"₹{b.amount:,.2f}",
                f"₹{actual_spent:,.2f}",
                f"₹{variance:,.2f}",
                status_text
            ])

    # Format return
    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([sanitize_csv_cell(title)])
        writer.writerow([])
        writer.writerow(["SUMMARY METRICS"])
        for k, v in summary.items():
            writer.writerow([sanitize_csv_cell(k), sanitize_csv_cell(v)])
        writer.writerow([])
        writer.writerow([sanitize_csv_cell(h) for h in headers])
        for row in rows:
            writer.writerow([sanitize_csv_cell(c) for c in row])
        
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={report_type}_report_{period}.csv"}
        )
        
    elif format == "excel":
        try:
            from openpyxl import Workbook
        except ImportError:
            raise HTTPException(status_code=500, detail="openpyxl library not installed")
            
        wb = Workbook()
        ws = wb.active
        ws.title = report_type.title()[:30]
        
        ws.append([sanitize_csv_cell(title)])
        ws.append([])
        ws.append(["SUMMARY METRICS"])
        for k, v in summary.items():
            ws.append([sanitize_csv_cell(k), sanitize_csv_cell(v)])
        ws.append([])
        ws.append([sanitize_csv_cell(h) for h in headers])
        for row in rows:
            ws.append([sanitize_csv_cell(c) for c in row])
            
        file_stream = io.BytesIO()
        wb.save(file_stream)
        file_stream.seek(0)
        
        return StreamingResponse(
            file_stream,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={report_type}_report_{period}.xlsx"}
        )
        
    elif format == "pdf":
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib import colors
        except ImportError:
            raise HTTPException(status_code=500, detail="reportlab library not installed")
            
        pdf_buffer = io.BytesIO()
        doc = SimpleDocTemplate(pdf_buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=22,
            textColor=colors.HexColor('#1E293B'),
            spaceAfter=15
        )
        
        section_style = ParagraphStyle(
            'SectionStyle',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=14,
            textColor=colors.HexColor('#2563EB'),
            spaceAfter=10
        )
        
        body_style = styles['Normal']
        
        elements = []
        elements.append(Paragraph(title, title_style))
        elements.append(Paragraph(f"Generated for: {current_user.full_name or current_user.email}", body_style))
        elements.append(Paragraph(f"Report Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}", body_style))
        elements.append(Spacer(1, 20))
        
        elements.append(Paragraph("Summary Metrics", section_style))
        summary_data = [["Metric", "Value"]]
        for k, v in summary.items():
            summary_data.append([k, str(v)])
            
        summary_table = Table(summary_data, colWidths=[200, 200])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#334155')),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 9),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 25))
        
        elements.append(Paragraph("Details", section_style))
        table_data = [headers]
        for row in rows:
            table_data.append([str(c) for c in row])
            
        num_cols = len(headers)
        col_width = 480 / num_cols if num_cols > 0 else 100
        col_widths = [col_width] * num_cols
        
        details_table = Table(table_data, colWidths=col_widths)
        details_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#3B82F6')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 9),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(details_table)
        
        doc.build(elements)
        pdf_buffer.seek(0)
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={report_type}_report_{period}.pdf"}
        )
        
    return {
        "title": title,
        "summary": summary,
        "headers": headers,
        "rows": rows
    }

def _to_naive_datetime(dt):
    if dt is None:
        return None
    if isinstance(dt, datetime):
        return dt.replace(tzinfo=None)
    if hasattr(dt, "year") and hasattr(dt, "month") and hasattr(dt, "day"):
        return datetime(dt.year, dt.month, dt.day)
    return None

@router.get("/dashboard/ai-summary")
def get_dashboard_ai_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    try:
        now = datetime.now()
        
        # Check if there are any transactions for the user in the current month/year
        has_current_month_tx = db.query(Transaction).filter(
            Transaction.user_id == current_user.id,
            Transaction.date >= datetime(now.year, now.month, 1)
        ).first()
        
        # If no transactions in the current month, fallback to the latest transaction's month and year
        if not has_current_month_tx:
            latest_tx = db.query(Transaction).filter(
                Transaction.user_id == current_user.id
            ).order_by(Transaction.date.desc()).first()
            if latest_tx and latest_tx.date:
                latest_naive = _to_naive_datetime(latest_tx.date)
                if latest_naive:
                    now = latest_naive

        month_start = datetime(now.year, now.month, 1)
        today_start = datetime(now.year, now.month, now.day)
        
        # Calculate next month start
        if now.month == 12:
            next_month_start = datetime(now.year + 1, 1, 1)
            prev_month_start = datetime(now.year, 11, 1)
            prev_month_end = datetime(now.year, 12, 1) - timedelta(seconds=1)
        else:
            next_month_start = datetime(now.year, now.month + 1, 1)
            if now.month == 1:
                prev_month_start = datetime(now.year - 1, 12, 1)
                prev_month_end = datetime(now.year, 1, 1) - timedelta(seconds=1)
            else:
                prev_month_start = datetime(now.year, now.month - 1, 1)
                prev_month_end = datetime(now.year, now.month, 1) - timedelta(seconds=1)

        insights = []

        # Check if the user has any transactions at all. If not, return empty list (to trigger empty state)
        total_tx_count = db.query(Transaction).filter(Transaction.user_id == current_user.id).count()
        if total_tx_count == 0:
            return {"insights": []}

        # 1. Income calculations
        current_month_income = float(db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "income",
            Transaction.date >= month_start,
            Transaction.date < next_month_start
        ).scalar() or 0.0)

        current_month_expense = float(db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            Transaction.date >= month_start,
            Transaction.date < next_month_start
        ).scalar() or 0.0)

        # Previous Month Comparisons
        prev_month_expense = float(db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            Transaction.date >= prev_month_start,
            Transaction.date <= prev_month_end
        ).scalar() or 0.0)

        # 2. Income Source Count (Section 2)
        income_sources = db.query(Transaction.description).filter(
            Transaction.user_id == current_user.id, 
            Transaction.type == "income"
        ).distinct().count()
        if income_sources >= 2:
            insights.append({
                "title": "Multiple Income Streams",
                "description": f"You received income from {income_sources} different sources this month.",
                "priority": "Low",
                "category": "Income",
                "confidence": 98,
                "action": "View Transaction"
            })

        # 3. Savings Rate Calculations (Section 2)
        current_savings = current_month_income - current_month_expense
        if current_savings > 0:
            insights.append({
                "title": "Monthly Savings Track",
                "description": f"You saved ₹{int(current_savings):,} this month.",
                "priority": "Medium",
                "category": "Savings",
                "confidence": 95,
                "action": "View Transaction"
            })

        # 4. Budget Check (Section 2) - Eager load category and batch spending to prevent N+1
        budgets = db.query(Budget).options(joinedload(Budget.category)).filter(
            Budget.user_id == current_user.id, 
            Budget.month == now.month, 
            Budget.year == now.year
        ).all()
        
        cat_spending = {}
        if budgets:
            cat_ids = [b.category_id for b in budgets if b.category_id]
            if cat_ids:
                spending_rows = db.query(
                    Transaction.category_id,
                    func.sum(Transaction.amount)
                ).filter(
                    Transaction.user_id == current_user.id,
                    Transaction.category_id.in_(cat_ids),
                    Transaction.type == "expense",
                    Transaction.date >= month_start,
                    Transaction.date < next_month_start
                ).group_by(Transaction.category_id).all()
                cat_spending = {row[0]: float(row[1] or 0.0) for row in spending_rows}

        for b in budgets:
            spent = cat_spending.get(b.category_id, 0.0)
            b_amount = float(b.amount)
            if b_amount > 0:
                cat_name = b.category.name if b.category else "Category"
                if spent > b_amount:
                    insights.append({
                        "title": f"Budget Exceeded",
                        "description": f"You have exceeded your {cat_name} budget limit by ₹{int(spent - b_amount):,}.",
                        "priority": "Critical",
                        "category": "Budget",
                        "confidence": 100,
                        "action": "Create Budget"
                    })
                elif spent >= 0.8 * b_amount:
                    insights.append({
                        "title": f"Budget Limit Alert",
                        "description": f"You have spent {int((spent/b_amount)*100)}% of your {cat_name} budget limit.",
                        "priority": "High",
                        "category": "Budget",
                        "confidence": 99,
                        "action": "Create Budget"
                    })

        # 5. Goal Check (Section 2)
        goals = db.query(SavingsGoal).filter(SavingsGoal.user_id == current_user.id).all()
        for g in goals:
            g_target = float(g.target_amount)
            g_current = float(g.current_amount)
            pct = (g_current / g_target) * 100 if g_target > 0 else 0
            if 50 <= pct < 100:
                insights.append({
                    "title": f"Savings Goal Progress",
                    "description": f"You are {int(pct)}% closer to your savings goal '{g.name}'.",
                    "priority": "Medium",
                    "category": "Goals",
                    "confidence": 97,
                    "action": "Increase Goal"
                })
            elif pct >= 100:
                insights.append({
                    "title": f"Savings Goal Completed",
                    "description": f"Congratulations! You've achieved your savings goal '{g.name}'!",
                    "priority": "Low",
                    "category": "Goals",
                    "confidence": 100,
                    "action": "Mark Done"
                })

        # 6. Investment Check (Section 2)
        investments_db = db.query(Investment).filter(Investment.user_id == current_user.id).all()
        total_current = sum(float(i.quantity) * float(i.current_price) for i in investments_db)
        total_cost = sum(float(i.quantity) * float(i.purchase_price) for i in investments_db)
        returns = total_current - total_cost
        if returns > 0:
            insights.append({
                "title": "Investment Growth Tracker",
                "description": f"Your investments generated ₹{int(returns):,} profit this month.",
                "priority": "Medium",
                "category": "Investment",
                "confidence": 96,
                "action": "Open Investments"
            })
        elif len(investments_db) == 0:
            insights.append({
                "title": "Zero Investments Logged",
                "description": "You haven't invested this month. Move idle cash to investments.",
                "priority": "High",
                "category": "Investment",
                "confidence": 94,
                "action": "Open Investments"
            })

        # 7. Subscriptions Check (Section 2)
        subs = db.query(Subscription).filter(Subscription.user_id == current_user.id, Subscription.is_active == True).all()
        if subs:
            total_sub_cost = sum(float(s.amount) for s in subs)
            insights.append({
                "title": "Recurring Subscription Costs",
                "description": f"You spent ₹{int(total_sub_cost):,} on subscriptions this month.",
                "priority": "Medium",
                "category": "Subscriptions",
                "confidence": 98,
                "action": "Renew Subscription"
            })
            for s in subs:
                if s.next_billing_date:
                    nbd_naive = _to_naive_datetime(s.next_billing_date)
                    if nbd_naive:
                        days_rem = (nbd_naive - now).days
                        if 0 <= days_rem <= 5:
                            insights.append({
                                "title": f"Upcoming Renewal",
                                "description": f"{s.name} subscription renews in {days_rem} days.",
                                "priority": "High",
                                "category": "Upcoming Payments",
                                "confidence": 99,
                                "action": "Renew Subscription"
                            })

        # 8. Dining Out vs Groceries (Section 2)
        food_spent = float(db.query(func.sum(Transaction.amount)).join(Category, Transaction.category_id == Category.id).filter(
            Transaction.user_id == current_user.id,
            Category.name.ilike("%food%"),
            Transaction.type == "expense",
            Transaction.date >= month_start
        ).scalar() or 0.0)

        groceries_spent = float(db.query(func.sum(Transaction.amount)).join(Category, Transaction.category_id == Category.id).filter(
            Transaction.user_id == current_user.id,
            Category.name.ilike("%groceries%"),
            Transaction.type == "expense",
            Transaction.date >= month_start
        ).scalar() or 0.0)

        if food_spent > groceries_spent and food_spent > 0:
            dining_tx = db.query(Transaction).options(joinedload(Transaction.merchant)).join(Category, Transaction.category_id == Category.id).filter(
                Transaction.user_id == current_user.id,
                Category.name.ilike("%food%"),
                Transaction.type == "expense",
                Transaction.date >= month_start,
                Transaction.date < next_month_start
            ).order_by(Transaction.amount.desc()).first()

            merchant_name = dining_tx.merchant.name if (dining_tx and dining_tx.merchant) else None
            if merchant_name:
                desc = f"You spent more on {merchant_name} / dining out than groceries this month."
            else:
                desc = "You spent more on dining out than groceries this month."

            insights.append({
                "title": "High Dining Expenses",
                "description": desc,
                "priority": "Medium",
                "category": "Expense",
                "confidence": 93,
                "action": "Create Budget"
            })

        # 9. Suspicious Spending Alerts (Section 2)
        avg_daily_spent = prev_month_expense / 30.0 if prev_month_expense > 0 else 500.0
        yesterday_start = today_start - timedelta(days=1)
        yesterday_spent = float(db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            Transaction.date >= yesterday_start,
            Transaction.date < today_start
        ).scalar() or 0.0)

        if yesterday_spent > 3 * avg_daily_spent and yesterday_spent > 1000:
            insights.append({
                "title": "High Spending Detected",
                "description": f"Detected unusually high spending yesterday: ₹{int(yesterday_spent):,}.",
                "priority": "High",
                "category": "Fraud Detection",
                "confidence": 90,
                "action": "View Transaction"
            })
        else:
            insights.append({
                "title": "Account Activity Guard",
                "description": "No suspicious spending patterns detected recently.",
                "priority": "Low",
                "category": "Fraud Detection",
                "confidence": 95,
                "action": "Ignore"
            })

        # 10. India Post / FD Maturity Alert
        post_office_investments = db.query(IndiaPostInvestment).filter(
            IndiaPostInvestment.user_id == current_user.id,
            IndiaPostInvestment.status == "Active"
        ).all()
        for p in post_office_investments:
            if p.maturity_date:
                mat_naive = _to_naive_datetime(p.maturity_date)
                if mat_naive:
                    days_to_mat = (mat_naive - now).days
                    if 0 <= days_to_mat <= 15:
                        insights.append({
                            "title": "Investment Reaching Maturity",
                            "description": f"Your Post Office investment '{p.scheme_name}' matures in {days_to_mat} days.",
                            "priority": "High",
                            "category": "Upcoming Payments",
                            "confidence": 99,
                            "action": "Open Investments"
                        })

        return {"insights": insights}
    except Exception as e:
        import logging
        logging.error(f"Error generating dashboard AI summary: {e}")
        return {"insights": []}

