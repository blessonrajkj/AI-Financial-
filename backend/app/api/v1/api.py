from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    transactions,
    budgets,
    receipts,
    ai,
    analytics,
    settings,
    savings,
    investments,
    subscriptions,
    india_post_investments,
    profile_router,
    accounts,
    transfers,
    liabilities,
    user_privacy,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
api_router.include_router(transfers.router, prefix="/transfers", tags=["transfers"])
api_router.include_router(liabilities.router, prefix="/liabilities", tags=["liabilities"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(budgets.router, prefix="/budgets", tags=["budgets"])
api_router.include_router(receipts.router, prefix="/receipts", tags=["receipts"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(savings.router, prefix="/savings", tags=["savings"])
api_router.include_router(investments.router, prefix="/investments", tags=["investments"])
api_router.include_router(subscriptions.router, prefix="/subscriptions", tags=["subscriptions"])
api_router.include_router(india_post_investments.router, prefix="/india-post-investments", tags=["india-post-investments"])
api_router.include_router(user_privacy.router, prefix="/user", tags=["user_privacy"])
api_router.include_router(profile_router.router, tags=["profile"])
