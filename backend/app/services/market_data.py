from decimal import Decimal
import io
import os
import re
import asyncio
import logging
import requests
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.config import settings

logger = logging.getLogger("market_data")

class MarketDataService:
    def __init__(self):
        self.api_key = os.getenv("ALPHA_VANTAGE_API_KEY", "")
        self.yahoo_headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }

    def fetch_price_for_symbol(self, symbol: str) -> Dict[str, Any]:
        if not symbol:
            return {"success": False, "error": "No symbol provided"}

        clean_symbol = symbol.strip().upper()

        try:
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{clean_symbol}"
            response = requests.get(url, headers=self.yahoo_headers, timeout=5)

            if response.status_code == 200:
                data = response.json()
                result = data.get("chart", {}).get("result", [])
                if result:
                    meta = result[0].get("meta", {})
                    current_price = meta.get("regularMarketPrice")
                    previous_close = meta.get("previousClose", current_price)

                    if current_price is not None:
                        return {
                            "success": True,
                            "symbol": clean_symbol,
                            "price": float(current_price),
                            "previous_close": float(previous_close) if previous_close else float(current_price),
                            "source": "Yahoo Finance"
                        }
        except Exception as e:
            logger.warning(f"Yahoo Finance fetch failed for {clean_symbol}: {e}")

        return {"success": False, "error": "Failed to fetch live market price"}

    def update_prices_for_user(self, db: Session, user_id: int, force: bool = False) -> Tuple[bool, bool, str]:
        from app.models.investment import Investment

        investments = db.query(Investment).filter(Investment.user_id == user_id).all()
        if not investments:
            return False, True, datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

        now = datetime.now(timezone.utc)
        needs_update = False
        for inv in investments:
            if inv.symbol:
                if not inv.price_last_updated or force:
                    needs_update = True
                    break
                else:
                    last_up = inv.price_last_updated
                    if last_up.tzinfo is None:
                        last_up = last_up.replace(tzinfo=timezone.utc)
                    if (now - last_up).total_seconds() > 900:  # 15 minutes threshold
                        needs_update = True
                        break

        if not needs_update:
            return False, True, now.strftime("%Y-%m-%d %H:%M:%S")

        live_api_working = False
        for inv in investments:
            if not inv.symbol:
                continue

            try:
                res = self.fetch_price_for_symbol(inv.symbol)
                if res.get("success"):
                    live_api_working = True
                    inv.current_price = Decimal(str(res["price"]))
                    inv.previous_close = Decimal(str(res["previous_close"]))
                    inv.price_last_updated = now
            except Exception as e:
                logger.warning(f"Error fetching price for {inv.symbol}: {e}")

        try:
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Error committing price updates: {e}")

        last_updated_str = now.strftime("%Y-%m-%d %H:%M:%S")
        return False, live_api_working, last_updated_str

market_data_service = MarketDataService()

def check_and_update_investments_from_transaction(db: Session, tx):
    """
    Checks if a transaction is an investment purchase and updates investment holdings accordingly.
    """
    from app.models.investment import Investment

    if tx.type != "expense":
        return

    desc = (tx.description or "").lower()

    is_investment = False
    if tx.category_id:
        from app.models.category_merchant import Category as DBCategory
        category = db.query(DBCategory).filter(DBCategory.id == tx.category_id).first()
        if category and category.name.lower() in ["investment", "investments", "portfolio", "mutual fund", "stock"]:
            is_investment = True

    if not is_investment:
        keywords = ["buy", "bought", "purchase", "invest", "mutual fund", "sip", "shares", "units"]
        if any(kw in desc for kw in keywords):
            is_investment = True

    if not is_investment:
        return

    user_investments = db.query(Investment).filter(Investment.user_id == tx.user_id).all()

    matched_inv = None
    for inv in user_investments:
        symbol_match = inv.symbol and inv.symbol.lower() in desc
        name_match = inv.asset_name and inv.asset_name.lower() in desc
        if symbol_match or name_match:
            matched_inv = inv
            break

    if not matched_inv:
        return

    qty = 0.0
    qty_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:shares|units|qty|quantity|nos|co)', desc)
    if qty_match:
        qty = float(qty_match.group(1))
    else:
        numbers = [float(n) for n in re.findall(r'\b\d+(?:\.\d+)?\b', desc)]
        valid_qtys = [n for n in numbers if n != float(tx.amount) and n < 100000]
        if valid_qtys:
            qty = valid_qtys[0]

    if qty <= 0:
        price = float(matched_inv.current_price or matched_inv.purchase_price)
        if price > 0:
            qty = float(tx.amount) / price

    if qty <= 0:
        qty = 1.0

    tx_amt = Decimal(str(tx.amount))
    unit_price = tx_amt / Decimal(str(qty)) if qty > 0 else Decimal(str(matched_inv.purchase_price))

    from app.services.investment_service import add_buy_transaction
    add_buy_transaction(
        db=db,
        user_id=tx.user_id,
        investment=matched_inv,
        units=Decimal(str(qty)),
        price_per_unit=unit_price,
        transaction_date=tx.date,
        notes=f"Auto-logged from transaction: {tx.description or ''}"
    )

