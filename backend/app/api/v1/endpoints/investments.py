from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from decimal import Decimal

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.investment import Investment
from app.models.investment_transaction import InvestmentTransaction
from app.models.india_post_investment import IndiaPostInvestment
from app.schemas.investment import (
    InvestmentCreate, 
    InvestmentUpdate, 
    InvestmentOut, 
    InvestmentLotCreate, 
    InvestmentTransactionOut
)
from app.services.investment_service import (
    find_matching_investment,
    add_buy_transaction,
    add_sell_transaction,
    add_dividend_transaction,
    ensure_legacy_transactions,
    calculate_real_xirr
)

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

@router.get("/check-existing")
def check_existing_investment(
    asset_type: str = Query(...),
    symbol: Optional[str] = Query(None),
    asset_name: Optional[str] = Query(None),
    exchange: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Check if user already has an existing holding matching asset identity.
    """
    matched = find_matching_investment(
        db=db,
        user_id=current_user.id,
        asset_type=asset_type,
        symbol=symbol,
        asset_name=asset_name,
        exchange=exchange
    )
    if matched:
        qty = float(matched.quantity)
        p_price = float(matched.purchase_price)
        c_price = float(matched.current_price or matched.purchase_price)
        return {
            "exists": True,
            "holding": {
                "id": matched.id,
                "asset_name": matched.asset_name,
                "asset_type": matched.asset_type,
                "symbol": matched.symbol,
                "exchange": matched.exchange,
                "quantity": qty,
                "purchase_price": p_price,
                "current_price": c_price,
                "total_cost": round(qty * p_price, 2),
                "current_value": round(qty * c_price, 2)
            }
        }
    return {"exists": False, "holding": None}


@router.get("", response_model=dict)
def get_investments(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    from app.services.market_data import market_data_service
    is_demo_mode, live_api_working, last_updated_time = market_data_service.update_prices_for_user(db, current_user.id)
    
    investments = db.query(Investment).filter(Investment.user_id == current_user.id).all()
    
    # Backfill legacy transactions if needed
    for inv in investments:
        ensure_legacy_transactions(db, inv)
    
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
            
        # Collect investment transactions for real XIRR calculation
        inv_txs = db.query(InvestmentTransaction).filter(
            InvestmentTransaction.investment_id == inv.id,
            InvestmentTransaction.user_id == current_user.id
        ).order_by(InvestmentTransaction.transaction_date.asc()).all()

        cashflows = []
        for itx in inv_txs:
            t_amt = float(itx.total_amount)
            if itx.transaction_type == "BUY":
                cashflows.append((itx.transaction_date, -t_amt))
            elif itx.transaction_type in ("SELL", "DIVIDEND"):
                cashflows.append((itx.transaction_date, t_amt))

        # Add current terminal value as an inflow today
        if c_val > 0:
            cashflows.append((datetime.utcnow(), c_val))

        xirr = calculate_real_xirr(cashflows, fallback_cagr=cagr)
            
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
    
    # Include India Post summary for complete wealth engine integration
    india_post_items = db.query(IndiaPostInvestment).filter(
        IndiaPostInvestment.user_id == current_user.id
    ).all()
    
    active_ip = [ip for ip in india_post_items if ip.status == "Active"]
    total_india_post_val = sum(float(ip.amount) for ip in active_ip)
    
    grand_total = total_current_val + total_india_post_val
    allocation = {}
    for inv in investments:
        c_val = float(inv.quantity) * float(inv.current_price)
        pct = (c_val / grand_total * 100.0) if grand_total > 0 else 0.0
        allocation[inv.asset_type] = allocation.get(inv.asset_type, 0.0) + pct
        
    allocation_list = [{"name": k, "value": round(v, 1)} for k, v in allocation.items()]
    
    if total_india_post_val > 0 and grand_total > 0:
        post_office_pct = (total_india_post_val / grand_total) * 100.0
        allocation_list.append({"name": "Post Office", "value": round(post_office_pct, 1)})

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
    investments = db.query(Investment).filter(Investment.user_id == current_user.id).all()
    for inv in investments:
        ensure_legacy_transactions(db, inv)

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
        
    return activity


@router.get("/{inv_id}/transactions", response_model=List[InvestmentTransactionOut])
def get_investment_transactions(
    inv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    db_inv = db.query(Investment).filter(
        Investment.id == inv_id,
        Investment.user_id == current_user.id
    ).first()
    if not db_inv:
        raise HTTPException(status_code=404, detail="Investment holding not found")
        
    ensure_legacy_transactions(db, db_inv)
    
    txs = db.query(InvestmentTransaction).filter(
        InvestmentTransaction.investment_id == inv_id,
        InvestmentTransaction.user_id == current_user.id
    ).order_by(InvestmentTransaction.transaction_date.desc()).all()
    
    return txs


@router.post("", response_model=InvestmentOut, status_code=status.HTTP_201_CREATED)
def create_investment(
    inv_in: InvestmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Creates a new investment OR adds a BUY lot transaction if matching holding already exists.
    Enforces duplicate holding prevention & weighted average cost calculation.
    """
    if inv_in.quantity <= 0 or inv_in.purchase_price <= 0:
        raise HTTPException(status_code=400, detail="Quantity and purchase price must be greater than zero")

    matched_inv = find_matching_investment(
        db=db,
        user_id=current_user.id,
        asset_type=inv_in.asset_type,
        symbol=inv_in.symbol,
        asset_name=inv_in.asset_name,
        exchange=inv_in.exchange
    )
    
    if matched_inv:
        # Existing holding found -> execute BUY lot transaction
        add_buy_transaction(
            db=db,
            user_id=current_user.id,
            investment=matched_inv,
            units=Decimal(str(inv_in.quantity)),
            price_per_unit=Decimal(str(inv_in.purchase_price)),
            transaction_date=inv_in.purchase_date,
            notes=f"Purchased lot of {inv_in.quantity} units @ {inv_in.purchase_price}"
        )
        if inv_in.current_price and float(inv_in.current_price) > 0:
            matched_inv.current_price = Decimal(str(inv_in.current_price))
            db.commit()
            
        if matched_inv.symbol:
            from app.services.market_data import market_data_service
            market_data_service.update_prices_for_user(db, current_user.id, force=True)
            db.refresh(matched_inv)
            
        return matched_inv
        
    # New holding creation
    db_inv = Investment(
        user_id=current_user.id,
        asset_name=inv_in.asset_name,
        asset_type=inv_in.asset_type,
        symbol=inv_in.symbol,
        exchange=inv_in.exchange,
        quantity=Decimal(str(inv_in.quantity)),
        purchase_price=Decimal(str(inv_in.purchase_price)),
        current_price=Decimal(str(inv_in.current_price or inv_in.purchase_price)),
        purchase_date=inv_in.purchase_date or datetime.now(timezone.utc),
        dividends_received=Decimal(str(inv_in.dividends_received or 0))
    )
    db.add(db_inv)
    db.commit()
    db.refresh(db_inv)
    
    # Log initial BUY transaction
    qty_dec = Decimal(str(inv_in.quantity))
    price_dec = Decimal(str(inv_in.purchase_price))
    init_tx = InvestmentTransaction(
        investment_id=db_inv.id,
        user_id=current_user.id,
        transaction_type="BUY",
        units=qty_dec,
        price_per_unit=price_dec,
        total_amount=qty_dec * price_dec,
        transaction_date=db_inv.purchase_date,
        notes=f"Initial purchase of {db_inv.asset_name}"
    )
    db.add(init_tx)
    
    if inv_in.dividends_received and float(inv_in.dividends_received) > 0:
        add_dividend_transaction(
            db=db,
            user_id=current_user.id,
            investment=db_inv,
            total_amount=Decimal(str(inv_in.dividends_received)),
            transaction_date=db_inv.purchase_date,
            notes=f"Initial dividend history for {db_inv.asset_name}"
        )
        
    if db_inv.symbol:
        from app.services.market_data import market_data_service
        market_data_service.update_prices_for_user(db, current_user.id, force=True)
        db.refresh(db_inv)
        
    return db_inv


@router.post("/{inv_id}/buy", response_model=InvestmentOut)
def buy_investment_lot(
    inv_id: int,
    lot_in: InvestmentLotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Adds a new BUY lot to an existing holding.
    """
    if lot_in.units <= 0 or lot_in.price_per_unit <= 0:
        raise HTTPException(status_code=400, detail="Units and price per unit must be greater than zero")

    db_inv = db.query(Investment).filter(
        Investment.id == inv_id,
        Investment.user_id == current_user.id
    ).first()
    if not db_inv:
        raise HTTPException(status_code=404, detail="Investment holding not found")

    add_buy_transaction(
        db=db,
        user_id=current_user.id,
        investment=db_inv,
        units=Decimal(str(lot_in.units)),
        price_per_unit=Decimal(str(lot_in.price_per_unit)),
        transaction_date=lot_in.transaction_date,
        notes=lot_in.notes
    )

    if db_inv.symbol:
        from app.services.market_data import market_data_service
        market_data_service.update_prices_for_user(db, current_user.id, force=True)
        db.refresh(db_inv)

    return db_inv


@router.post("/{inv_id}/sell", response_model=dict)
def sell_investment_lot(
    inv_id: int,
    lot_in: InvestmentLotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Executes a SELL lot from an existing holding using Weighted Average Cost Basis.
    """
    if lot_in.units <= 0 or lot_in.price_per_unit <= 0:
        raise HTTPException(status_code=400, detail="Units and price per unit must be greater than zero")

    db_inv = db.query(Investment).filter(
        Investment.id == inv_id,
        Investment.user_id == current_user.id
    ).first()
    if not db_inv:
        raise HTTPException(status_code=404, detail="Investment holding not found")

    try:
        tx, realized_gain = add_sell_transaction(
            db=db,
            user_id=current_user.id,
            investment=db_inv,
            units=Decimal(str(lot_in.units)),
            price_per_unit=Decimal(str(lot_in.price_per_unit)),
            transaction_date=lot_in.transaction_date,
            notes=lot_in.notes
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if db_inv.symbol:
        from app.services.market_data import market_data_service
        market_data_service.update_prices_for_user(db, current_user.id, force=True)
        db.refresh(db_inv)

    return {
        "holding": InvestmentOut.model_validate(db_inv),
        "transaction": InvestmentTransactionOut.model_validate(tx),
        "realized_gain": float(realized_gain)
    }


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
        if field in ["quantity", "purchase_price", "current_price", "dividends_received"] and val is not None:
            setattr(db_inv, field, Decimal(str(val)))
        else:
            setattr(db_inv, field, val)
        
    db.commit()

    # Sync opening/primary InvestmentTransaction if quantity or purchase price changed
    if "quantity" in update_data or "purchase_price" in update_data:
        ensure_legacy_transactions(db, db_inv)
        buy_tx = db.query(InvestmentTransaction).filter(
            InvestmentTransaction.investment_id == db_inv.id,
            InvestmentTransaction.transaction_type == "BUY"
        ).order_by(InvestmentTransaction.transaction_date.asc()).first()
        if buy_tx:
            if "quantity" in update_data and update_data["quantity"] is not None:
                buy_tx.units = db_inv.quantity
            if "purchase_price" in update_data and update_data["purchase_price"] is not None:
                buy_tx.price_per_unit = db_inv.purchase_price
            buy_tx.total_amount = buy_tx.units * buy_tx.price_per_unit
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
