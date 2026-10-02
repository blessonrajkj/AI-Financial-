from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.investment import Investment
from app.models.investment_transaction import InvestmentTransaction

def to_decimal(val) -> Decimal:
    if val is None:
        return Decimal('0')
    if isinstance(val, Decimal):
        return val
    return Decimal(str(val))

def find_matching_investment(
    db: Session,
    user_id: int,
    asset_type: str,
    symbol: str | None = None,
    asset_name: str | None = None,
    exchange: str | None = None
) -> Investment | None:
    """
    Find existing investment holding for a user by asset identity.
    For Stocks/ETFs/Crypto: symbol + asset_type (+ exchange if provided) or exact asset_name.
    For Mutual Funds/SIPs: asset_name/symbol + asset_type.
    """
    user_investments = db.query(Investment).filter(Investment.user_id == user_id).all()
    
    clean_type = (asset_type or "").strip().lower()
    clean_symbol = (symbol or "").strip().lower() if symbol else ""
    clean_name = (asset_name or "").strip().lower() if asset_name else ""
    clean_exchange = (exchange or "").strip().lower() if exchange else ""

    for inv in user_investments:
        inv_type = (inv.asset_type or "").strip().lower()
        inv_symbol = (inv.symbol or "").strip().lower() if inv.symbol else ""
        inv_name = (inv.asset_name or "").strip().lower() if inv.asset_name else ""
        inv_exchange = (inv.exchange or "").strip().lower() if inv.exchange else ""

        # Types must match (or both be stock-like / mutual fund-like)
        type_match = (inv_type == clean_type)
        if not type_match:
            # Group similar types: Stocks & ETFs, Mutual Funds & SIPs
            stock_group = {"stocks", "stock", "etfs", "etf", "crypto"}
            mf_group = {"mutual funds", "mutual fund", "sips", "sip"}
            if (clean_type in stock_group and inv_type in stock_group) or \
               (clean_type in mf_group and inv_type in mf_group):
                type_match = True

        if not type_match:
            continue

        # Symbol match takes priority if present for both
        if clean_symbol and inv_symbol:
            if clean_symbol == inv_symbol:
                if clean_exchange and inv_exchange and clean_exchange != inv_exchange:
                    continue
                return inv

        # Asset name match
        if clean_name and inv_name:
            if clean_name == inv_name:
                return inv

    return None


def ensure_legacy_transactions(db: Session, investment: Investment) -> None:
    """
    Ensures that legacy investments created without explicit InvestmentTransaction records
    have an initial BUY record representing their opening position.
    """
    existing_count = db.query(InvestmentTransaction).filter(
        InvestmentTransaction.investment_id == investment.id
    ).count()

    if existing_count == 0 and float(investment.quantity) > 0:
        qty = to_decimal(investment.quantity)
        price = to_decimal(investment.purchase_price)
        total = qty * price
        
        initial_tx = InvestmentTransaction(
            investment_id=investment.id,
            user_id=investment.user_id,
            transaction_type="BUY",
            units=qty,
            price_per_unit=price,
            total_amount=total,
            transaction_date=investment.purchase_date or datetime.now(timezone.utc),
            notes=f"Initial aggregate position for {investment.asset_name}"
        )
        db.add(initial_tx)
        
        divs = to_decimal(investment.dividends_received)
        if divs > Decimal('0'):
            div_tx = InvestmentTransaction(
                investment_id=investment.id,
                user_id=investment.user_id,
                transaction_type="DIVIDEND",
                units=Decimal('0'),
                price_per_unit=Decimal('0'),
                total_amount=divs,
                transaction_date=investment.purchase_date or datetime.now(timezone.utc),
                notes=f"Dividend payout history for {investment.asset_name}"
            )
            db.add(div_tx)

        db.commit()


def add_buy_transaction(
    db: Session,
    user_id: int,
    investment: Investment,
    units: Decimal,
    price_per_unit: Decimal,
    transaction_date: datetime | None = None,
    notes: str | None = None
) -> InvestmentTransaction:
    """
    Executes a BUY lot transaction:
    1. Recalculates aggregate quantity and weighted average cost basis.
    2. Updates Investment record.
    3. Adds InvestmentTransaction record.
    """
    ensure_legacy_transactions(db, investment)

    old_qty = to_decimal(investment.quantity)
    old_avg_price = to_decimal(investment.purchase_price)
    old_cost = old_qty * old_avg_price

    buy_qty = to_decimal(units)
    buy_price = to_decimal(price_per_unit)
    buy_cost = buy_qty * buy_price

    new_qty = old_qty + buy_qty
    new_cost = old_cost + buy_cost
    new_avg_price = (new_cost / new_qty) if new_qty > Decimal('0') else Decimal('0')

    # Update investment record
    investment.quantity = new_qty
    investment.purchase_price = new_avg_price
    if transaction_date:
        investment.purchase_date = transaction_date

    # Create transaction log
    tx = InvestmentTransaction(
        investment_id=investment.id,
        user_id=user_id,
        transaction_type="BUY",
        units=buy_qty,
        price_per_unit=buy_price,
        total_amount=buy_cost,
        transaction_date=transaction_date or datetime.now(timezone.utc),
        notes=notes or f"Purchased {buy_qty} units @ {buy_price}"
    )
    db.add(tx)
    db.commit()
    db.refresh(investment)
    db.refresh(tx)
    return tx


def add_sell_transaction(
    db: Session,
    user_id: int,
    investment: Investment,
    units: Decimal,
    price_per_unit: Decimal,
    transaction_date: datetime | None = None,
    notes: str | None = None
) -> tuple[InvestmentTransaction, Decimal]:
    """
    Executes a SELL lot transaction using Weighted Average Cost Basis:
    1. Validates available units.
    2. Calculates cost basis of sold units and realized P&L gain/loss.
    3. Updates Investment holding remaining quantity and cost basis.
    4. Adds InvestmentTransaction record.
    Returns (InvestmentTransaction, realized_gain).
    """
    ensure_legacy_transactions(db, investment)

    old_qty = to_decimal(investment.quantity)
    old_avg_price = to_decimal(investment.purchase_price)

    sell_qty = to_decimal(units)
    sell_price = to_decimal(price_per_unit)

    if sell_qty > old_qty:
        raise ValueError(f"Cannot sell {sell_qty} units. You currently hold {old_qty} units.")

    sell_proceeds = sell_qty * sell_price
    cost_basis_sold = sell_qty * old_avg_price
    realized_gain = sell_proceeds - cost_basis_sold

    new_qty = old_qty - sell_qty
    # Under weighted average cost basis, average cost per unit remains unchanged unless qty reaches 0
    new_avg_price = old_avg_price if new_qty > Decimal('0') else Decimal('0')

    investment.quantity = new_qty
    investment.purchase_price = new_avg_price

    gain_str = f"+₹{round(realized_gain, 2)}" if realized_gain >= Decimal('0') else f"-₹{round(abs(realized_gain), 2)}"
    note_text = notes or f"Sold {sell_qty} units @ ₹{sell_price}. Realized Gain: {gain_str}"

    tx = InvestmentTransaction(
        investment_id=investment.id,
        user_id=user_id,
        transaction_type="SELL",
        units=sell_qty,
        price_per_unit=sell_price,
        total_amount=sell_proceeds,
        transaction_date=transaction_date or datetime.now(timezone.utc),
        notes=note_text
    )
    db.add(tx)
    db.commit()
    db.refresh(investment)
    db.refresh(tx)
    return tx, realized_gain


def add_dividend_transaction(
    db: Session,
    user_id: int,
    investment: Investment,
    total_amount: Decimal,
    transaction_date: datetime | None = None,
    notes: str | None = None
) -> InvestmentTransaction:
    """
    Executes a DIVIDEND payout transaction.
    """
    ensure_legacy_transactions(db, investment)

    div_amt = to_decimal(total_amount)
    old_divs = to_decimal(investment.dividends_received or 0)
    investment.dividends_received = old_divs + div_amt

    tx = InvestmentTransaction(
        investment_id=investment.id,
        user_id=user_id,
        transaction_type="DIVIDEND",
        units=Decimal('0'),
        price_per_unit=Decimal('0'),
        total_amount=div_amt,
        transaction_date=transaction_date or datetime.now(timezone.utc),
        notes=notes or f"Dividend payout of ₹{div_amt}"
    )
    db.add(tx)
    db.commit()
    db.refresh(investment)
    db.refresh(tx)
    return tx
