import os
import requests
import datetime
from sqlalchemy.orm import Session
from concurrent.futures import ThreadPoolExecutor
from app.models.investment import Investment
from app.core.config import settings

class MarketDataService:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        self.cache_duration_minutes = 5

    def fetch_price_for_symbol(self, symbol: str) -> dict:
        """
        Fetches live price and previous close from Yahoo Finance for a symbol.
        Returns a dict: {"price": float, "previous_close": float, "success": bool}
        """
        if not symbol:
            return {"price": 0.0, "previous_close": 0.0, "success": False}
            
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
        try:
            response = requests.get(url, headers=self.headers, timeout=5)
            if response.status_code == 200:
                data = response.json()
                if "chart" in data and "result" in data["chart"] and len(data["chart"]["result"]) > 0:
                    meta = data["chart"]["result"][0]["meta"]
                    price = meta.get("regularMarketPrice", 0.0)
                    prev_close = meta.get("previousClose", 0.0)
                    if price > 0:
                        return {
                            "price": float(price),
                            "previous_close": float(prev_close) if prev_close else float(price),
                            "success": True
                        }
        except Exception as e:
            print(f"Error fetching price for {symbol}: {e}")
        return {"price": 0.0, "previous_close": 0.0, "success": False}

    def update_prices_for_user(self, db: Session, user_id: int, force: bool = False) -> tuple:
        """
        Updates current_price in database for user's investments using threading pool.
        Returns (is_demo_mode, live_api_working, last_updated_time)
        """
        demo_mode = getattr(settings, "DEMO_MODE", False) or os.getenv("DEMO_MODE", "false").lower() == "true"
        
        investments = db.query(Investment).filter(Investment.user_id == user_id).all()
        
        # Filter investments that actually have symbols
        symbols_to_fetch = []
        investments_to_update = []
        
        now = datetime.datetime.now(datetime.timezone.utc)
        
        for inv in investments:
            if not inv.symbol:
                continue
                
            needs_update = force
            if not needs_update:
                if not inv.price_last_updated:
                    needs_update = True
                else:
                    last_updated = inv.price_last_updated
                    if last_updated.tzinfo is None:
                        last_updated = last_updated.replace(tzinfo=datetime.timezone.utc)
                    delta = now - last_updated
                    if delta.total_seconds() > (self.cache_duration_minutes * 60):
                        needs_update = True
            
            if needs_update:
                symbols_to_fetch.append(inv.symbol)
                investments_to_update.append(inv)

        if not symbols_to_fetch:
            last_times = [inv.price_last_updated for inv in investments if inv.price_last_updated]
            last_updated_str = max(last_times).strftime("%Y-%m-%d %H:%M") if last_times else None
            return demo_mode, True, last_updated_str

        live_api_working = True
        
        if demo_mode:
            import random
            for inv in investments_to_update:
                base_price = inv.purchase_price if not inv.current_price else inv.current_price
                change = random.uniform(-0.015, 0.02)
                inv.current_price = round(base_price * (1.0 + change), 2)
                inv.price_last_updated = now
                inv.previous_close = round(inv.current_price / (1.0 + random.uniform(-0.005, 0.005)), 2)
            db.commit()
        else:
            with ThreadPoolExecutor(max_workers=5) as executor:
                results = list(executor.map(self.fetch_price_for_symbol, symbols_to_fetch))
            
            success_count = 0
            for inv, res in zip(investments_to_update, results):
                if res["success"]:
                    inv.current_price = res["price"]
                    inv.previous_close = res["previous_close"]
                    inv.price_last_updated = now
                    success_count += 1
                else:
                    if not inv.current_price:
                        inv.current_price = inv.purchase_price
                    if not inv.price_last_updated:
                        inv.price_last_updated = now
            
            if len(investments_to_update) > 0 and success_count == 0:
                live_api_working = False
            
            db.commit()

        last_times = [inv.price_last_updated for inv in investments if inv.price_last_updated]
        last_updated_str = max(last_times).strftime("%Y-%m-%d %H:%M") if last_times else None
        
        return demo_mode, live_api_working, last_updated_str

market_data_service = MarketDataService()


async def start_daily_price_updater():
    """
    Background worker that runs in the event loop and updates all investment prices daily.
    """
    import asyncio
    import logging
    logger = logging.getLogger(__name__)
    logger.info("Starting background daily investment price updater...")
    # Wait a few seconds for the app to fully boot up
    await asyncio.sleep(5)
    while True:
        try:
            logger.info("Executing daily background investment price update...")
            from app.core.database import SessionLocal
            from app.models.investment import Investment
            
            db = SessionLocal()
            try:
                # Find all unique user IDs who have investments with symbols
                user_ids = [r[0] for r in db.query(Investment.user_id).filter(Investment.symbol != "").filter(Investment.symbol != None).distinct().all()]
                logger.info(f"Background pricing: updating investments for users: {user_ids}")
                for uid in user_ids:
                    # Force update to make sure we query fresh prices from Yahoo Finance
                    market_data_service.update_prices_for_user(db, uid, force=True)
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Error in background daily price updater: {e}")
            
        # Sleep for 24 hours (86400 seconds)
        await asyncio.sleep(86400)
