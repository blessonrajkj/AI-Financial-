from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.core import security
from app.services.storage import storage_service
from app.models.user import User
from app.models.transaction import Transaction
from app.models.account import Account
from app.models.transfer import Transfer
from app.models.liability import Liability
from app.models.budget import Budget
from app.models.investment import Investment
from app.models.savings_goal import SavingsGoal
from app.models.subscription import Subscription
from app.schemas.profile_schema import DeleteAccountIn
from app.services.audit_service import log_audit_event

router = APIRouter()

@router.get("/export-data")
def export_user_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Export all user financial records (GDPR Data Portability compliant).
    """
    transactions = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    transfers = db.query(Transfer).filter(Transfer.user_id == current_user.id).all()
    liabilities = db.query(Liability).filter(Liability.user_id == current_user.id).all()
    budgets = db.query(Budget).filter(Budget.user_id == current_user.id).all()
    investments = db.query(Investment).filter(Investment.user_id == current_user.id).all()
    savings_goals = db.query(SavingsGoal).filter(SavingsGoal.user_id == current_user.id).all()
    subscriptions = db.query(Subscription).filter(Subscription.user_id == current_user.id).all()

    log_audit_event(
        db, user_id=current_user.id, action="EXPORT", resource_type="UserData", details={"records_exported": len(transactions)}
    )

    return {
        "user_profile": {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        },
        "accounts": [
            {"id": a.id, "name": a.account_name, "bank": a.bank_name, "balance": float(a.balance), "type": a.account_type}
            for a in accounts
        ],
        "transactions": [
            {
                "id": t.id,
                "amount": float(t.amount),
                "type": t.type,
                "date": t.date.isoformat() if t.date else None,
                "description": t.description,
                "payment_method": t.payment_method,
            }
            for t in transactions
        ],
        "transfers": [
            {"id": tr.id, "source": tr.source_account_id, "dest": tr.destination_account_id, "amount": float(tr.amount)}
            for tr in transfers
        ],
        "liabilities": [
            {"id": l.id, "name": l.name, "remaining": float(l.remaining_amount), "rate": float(l.interest_rate)}
            for l in liabilities
        ],
        "budgets": [{"id": b.id, "category_id": b.category_id, "amount": float(b.amount)} for b in budgets],
        "investments": [
            {"id": i.id, "asset_name": i.asset_name, "quantity": float(i.quantity), "purchase_price": float(i.purchase_price)}
            for i in investments
        ],
        "savings_goals": [{"id": s.id, "name": s.name, "target_amount": float(s.target_amount)} for s in savings_goals],
        "subscriptions": [{"id": sub.id, "name": sub.name, "amount": float(sub.amount)} for sub in subscriptions],
    }

@router.delete("/delete-account", status_code=status.HTTP_200_OK)
def delete_user_account(
    data: DeleteAccountIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Permanently delete user account with password confirmation (Right to be Forgotten).
    """
    if not security.verify_password(data.password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect password. Account deletion aborted.")

    log_audit_event(
        db, user_id=current_user.id, action="DELETE_ACCOUNT", resource_type="User", resource_id=str(current_user.id)
    )

    if current_user.avatar_url:
        old_key = current_user.avatar_url.replace("/uploads/", "")
        try:
            storage_service.delete_file(old_key)
        except Exception:
            pass

    try:
        security.revoke_user_sessions(current_user.id)
    except Exception:
        pass

    db.delete(current_user)
    db.commit()
    return {"message": "Account and all associated financial records have been permanently deleted."}
