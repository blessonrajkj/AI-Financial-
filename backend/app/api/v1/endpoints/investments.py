from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timezone
import random

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.investment import Investment
from app.schemas.investment import InvestmentCreate, InvestmentUpdate, InvestmentOut

router = APIRouter()

RISK_SCORES = {
    "Stocks": 7,
    "Mutual Funds": 4,
    "SIPs": 3,
    "ETFs": 3,
    "Gold": 2,
    "Crypto": 9,
    "Fixed Deposits": 1,
    "Bonds": 2,
    "PPF": 1,
    "NPS": 3
}

@router.get("", response_model=dict)
def get_investments(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    from app.services.market_data import market_data_service
    is_demo_mode, live_api_working, last_updated_time = market_data_service.update_prices_for_user(db, current_user.id)
    
    investments = db.query(Investment).filter(Investment.user_id == current_user.id).all()
    
    total_purchase_val = 0.0
    total_current_val = 0.0
    total_dividends = 0.0
    weighted_risk_sum = 0.0
    portfolio_today_pl = 0.0
    
    items = []
    for inv in investments:
        qty = float(inv.quantity)
        p_price = float(inv.purchase_price)
        c_price = float(inv.current_price)
        prev_close = float(inv.previous_close or inv.current_price)
        divs = float(inv.dividends_received or 0.0)

        p_val = qty * p_price
        c_val = qty * c_price
        pl = c_val - p_val
        pl_pct = (pl / p_val * 100.0) if p_val > 0 else 0.0
        
        years = 1.0
        if inv.purchase_date:
            p_date = inv.purchase_date
            if p_date.tzinfo is not None:
                p_date = p_date.replace(tzinfo=None)
            delta = datetime.utcnow() - p_date
            years = max(delta.days / 365.25, 0.08)
            
        cagr = 0.0
        if p_val > 0 and c_val > 0:
            cagr = ((c_val / p_val) ** (1 / years) - 1.0) * 100.0
            
        xirr = 0.0
        total_return_with_divs = c_val + divs
        if p_val > 0 and total_return_with_divs > 0:
            xirr = ((total_return_with_divs / p_val) ** (1 / years) - 1.0) * 100.0
            
        risk = RISK_SCORES.get(inv.asset_type, 4)
        
        today_pl = qty * (c_price - prev_close)
        portfolio_today_pl += today_pl
        
        total_purchase_val += p_val
        total_current_val += c_val
        total_dividends += divs
        weighted_risk_sum += (risk * c_val)
        
        items.append({
            "id": inv.id,
            "asset_name": inv.asset_name,
            "asset_type": inv.asset_type,
            "symbol": inv.symbol,
            "exchange": inv.exchange,
            "quantity": qty,
            "purchase_price": p_price,
            "current_price": c_price,
            "purchase_date": inv.purchase_date.isoformat() if inv.purchase_date else None,
            "dividends_received": divs,
            "purchase_value": round(p_val, 2),
            "current_value": round(c_val, 2),
            "profit_loss": round(pl, 2),
            "profit_loss_percentage": round(pl_pct, 2),
            "cagr": round(cagr, 2),
            "xirr": round(xirr, 2),
            "risk_score": risk,
            "today_gain_loss": round(today_pl, 2),
            "previous_close": prev_close,
            "price_last_updated": inv.price_last_updated.isoformat() if inv.price_last_updated else None
        })
        
    portfolio_pl = total_current_val - total_purchase_val
    portfolio_pl_pct = (portfolio_pl / total_purchase_val * 100.0) if total_purchase_val > 0 else 0.0
    
    portfolio_risk = (weighted_risk_sum / total_current_val) if total_current_val > 0 else 0.0
    
    allocation = {}
    for inv in investments:
        c_val = float(inv.quantity) * float(inv.current_price)
        pct = (c_val / total_current_val * 100.0) if total_current_val > 0 else 0.0
        allocation[inv.asset_type] = allocation.get(inv.asset_type, 0.0) + pct
        
    allocation_list = [{"name": k, "value": round(v, 1)} for k, v in allocation.items()]
 
    return {
        "summary": {
            "total_investment": round(total_purchase_val, 2),
            "total_current_value": round(total_current_val, 2),
            "total_profit_loss": round(portfolio_pl, 2),
            "total_profit_loss_percentage": round(portfolio_pl_pct, 2),
            "today_gain_loss": round(portfolio_today_pl, 2),
            "total_dividends": round(total_dividends, 2),
            "portfolio_risk_score": round(portfolio_risk, 1)
        },
        "allocation": allocation_list,
        "items": items,
        "is_demo_mode": is_demo_mode,
        "live_api_working": live_api_working,
        "last_updated_time": last_updated_time
    }

@router.post("", response_model=InvestmentOut, status_code=status.HTTP_201_CREATED)
def create_investment(
    inv_in: InvestmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    db_inv = Investment(
        user_id=current_user.id,
        asset_name=inv_in.asset_name,
        asset_type=inv_in.asset_type,
        symbol=inv_in.symbol,
        exchange=inv_in.exchange,
        quantity=inv_in.quantity,
        purchase_price=inv_in.purchase_price,
        current_price=inv_in.current_price or inv_in.purchase_price,
        purchase_date=inv_in.purchase_date or datetime.utcnow(),
        dividends_received=inv_in.dividends_received
    )
    db.add(db_inv)
    db.commit()
    
    if db_inv.symbol:
        from app.services.market_data import market_data_service
        market_data_service.update_prices_for_user(db, current_user.id, force=True)
        db.refresh(db_inv)
        
    return db_inv

@router.put("/{inv_id}", response_model=InvestmentOut)
def update_investment(
    inv_id: int,
    inv_in: InvestmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    db_inv = db.query(Investment).filter(
        Investment.id == inv_id,
        Investment.user_id == current_user.id
    ).first()
    if not db_inv:
        raise HTTPException(status_code=404, detail="Investment not found")
        
    update_data = inv_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(db_inv, field, val)
        
    db.commit()
    
    if "symbol" in update_data or "exchange" in update_data:
        from app.services.market_data import market_data_service
        market_data_service.update_prices_for_user(db, current_user.id, force=True)
        db.refresh(db_inv)
        
    return db_inv

@router.delete("/{inv_id}")
def delete_investment(
    inv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    db_inv = db.query(Investment).filter(
        Investment.id == inv_id,
        Investment.user_id == current_user.id
    ).first()
    if not db_inv:
        raise HTTPException(status_code=404, detail="Investment not found")
        
    db.delete(db_inv)
    db.commit()
    return {"message": "Investment record deleted successfully."}
