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
from app.models.india_post_investment import IndiaPostInvestment
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
    # Include India Post summary for complete wealth engine integration
    india_post_items = db.query(IndiaPostInvestment).filter(
        IndiaPostInvestment.user_id == current_user.id
    ).all()
    
    active_ip = [ip for ip in india_post_items if ip.status == "Active"]
    total_india_post_val = sum(float(ip.amount) for ip in active_ip)
    
    # Categorize India Post schemes into asset allocation if present
    for ip in active_ip:
        scheme_name = ip.scheme_name or "Post Office"
        amt = float(ip.amount)
        if total_current_val > 0:
            pct = (amt / (total_current_val + total_india_post_val)) * 100.0
        else:
            pct = 100.0 / max(len(active_ip), 1)
        # Add post office allocation cleanly
        found = False
        for alloc_item in allocation_list:
            if alloc_item["name"] == "Post Office":
                alloc_item["value"] = round(alloc_item["value"] + pct, 1)
                found = True
                break
        if not found and amt > 0:
            allocation_list.append({"name": "Post Office", "value": round(pct, 1)})

    return {
        "summary": {
            "total_investment": round(total_purchase_val, 2),
            "total_current_value": round(total_current_val, 2),
            "total_profit_loss": round(portfolio_pl, 2),
            "total_profit_loss_percentage": round(portfolio_pl_pct, 2),
            "today_gain_loss": round(portfolio_today_pl, 2),
            "total_dividends": round(total_dividends, 2),
            "portfolio_risk_score": round(portfolio_risk, 1),
            "total_india_post_value": round(total_india_post_val, 2),
            "grand_total_wealth": round(total_current_val + total_india_post_val, 2)
        },
        "allocation": allocation_list,
        "items": items,
        "is_demo_mode": is_demo_mode,
        "live_api_working": live_api_working,
        "last_updated_time": last_updated_time
    }

@router.get("/activity", response_model=List[dict])
def get_investment_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    from app.models.investment_transaction import InvestmentTransaction
    txs = db.query(InvestmentTransaction).filter(
        InvestmentTransaction.user_id == current_user.id
    ).order_by(InvestmentTransaction.transaction_date.desc()).all()
    
    activity = []
    for tx in txs:
        inv = db.query(Investment).filter(Investment.id == tx.investment_id).first()
        activity.append({
            "id": tx.id,
            "investment_id": tx.investment_id,
            "asset_name": inv.asset_name if inv else "Asset",
            "symbol": inv.symbol if inv else "",
            "transaction_type": tx.transaction_type,
            "units": float(tx.units),
            "price_per_unit": float(tx.price_per_unit),
            "total_amount": float(tx.total_amount),
            "transaction_date": tx.transaction_date.isoformat() if tx.transaction_date else None,
            "notes": tx.notes
        })
        
    # If no explicit transactions exist, generate activity list from user's investment holdings
    if not activity:
        investments = db.query(Investment).filter(Investment.user_id == current_user.id).all()
        for inv in investments:
            qty = float(inv.quantity)
            p_price = float(inv.purchase_price)
            divs = float(inv.dividends_received or 0.0)
            
            activity.append({
                "id": f"buy-{inv.id}",
                "investment_id": inv.id,
                "asset_name": inv.asset_name,
                "symbol": inv.symbol or "",
                "transaction_type": "BUY",
                "units": qty,
                "price_per_unit": p_price,
                "total_amount": round(qty * p_price, 2),
                "transaction_date": inv.purchase_date.isoformat() if inv.purchase_date else datetime.utcnow().isoformat(),
                "notes": f"Initial purchase of {inv.asset_name}"
            })
            
            if divs > 0:
                activity.append({
                    "id": f"div-{inv.id}",
                    "investment_id": inv.id,
                    "asset_name": inv.asset_name,
                    "symbol": inv.symbol or "",
                    "transaction_type": "DIVIDEND",
                    "units": 0,
                    "price_per_unit": 0,
                    "total_amount": round(divs, 2),
                    "transaction_date": inv.purchase_date.isoformat() if inv.purchase_date else datetime.utcnow().isoformat(),
                    "notes": f"Dividend received for {inv.asset_name}"
                })
                
        activity.sort(key=lambda x: x["transaction_date"] or "", reverse=True)

    return activity

@router.post("", response_model=InvestmentOut, status_code=status.HTTP_201_CREATED)
def create_investment(
    inv_in: InvestmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    from app.models.investment_transaction import InvestmentTransaction
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
    db.refresh(db_inv)
    
    # Log corresponding InvestmentTransaction
    total_cost = float(inv_in.quantity) * float(inv_in.purchase_price)
    inv_tx = InvestmentTransaction(
        investment_id=db_inv.id,
        user_id=current_user.id,
        transaction_type="BUY",
        units=inv_in.quantity,
        price_per_unit=inv_in.purchase_price,
        total_amount=total_cost,
        transaction_date=db_inv.purchase_date,
        notes=f"Purchased {db_inv.asset_name}"
    )
    db.add(inv_tx)
    
    if inv_in.dividends_received and float(inv_in.dividends_received) > 0:
        div_tx = InvestmentTransaction(
            investment_id=db_inv.id,
            user_id=current_user.id,
            transaction_type="DIVIDEND",
            units=0,
            price_per_unit=0,
            total_amount=inv_in.dividends_received,
            transaction_date=db_inv.purchase_date,
            notes=f"Dividend payout from {db_inv.asset_name}"
        )
        db.add(div_tx)
        
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
