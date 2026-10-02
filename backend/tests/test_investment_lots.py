import pytest
from decimal import Decimal
from app.services.investment_service import (
    add_buy_transaction,
    add_sell_transaction,
    ensure_legacy_transactions,
    to_decimal
)
from app.models.investment import Investment
from app.models.investment_transaction import InvestmentTransaction

def test_stock_weighted_average_cost_and_sell(db):
    """
    Scenario from Prompt Section 18 & 30:
    HDFC Bank:
    1. BUY 10 @ ₹700  => Qty=10, Cost=₹7000, Avg=₹700
    2. BUY 5 @ ₹730   => Qty=15, Cost=₹10650, Avg=₹710
    3. SELL 2 @ ₹750  => Qty=13, Cost=₹9230, Avg=₹710, Proceeds=₹1500, Realized Gain=₹80
    4. BUY 3 @ ₹740   => Qty=16, Cost=₹11450, Avg=₹715.625
    """
    user_id = 999
    # Create initial holding with 10 shares @ 700
    inv = Investment(
        user_id=user_id,
        asset_name="HDFC Bank",
        asset_type="Stocks",
        symbol="HDFCBANK",
        exchange="NSE",
        quantity=Decimal('10.0'),
        purchase_price=Decimal('700.0'),
        current_price=Decimal('722.0')
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)

    # Backfill opening transaction
    ensure_legacy_transactions(db, inv)

    assert float(inv.quantity) == 10.0
    assert float(inv.purchase_price) == 700.0

    # 2. Second BUY: 5 shares @ ₹730
    add_buy_transaction(db, user_id, inv, Decimal('5'), Decimal('730'))

    db.refresh(inv)
    assert float(inv.quantity) == 15.0
    # Total cost = 10*700 + 5*730 = 7000 + 3650 = 10650
    # Avg = 10650 / 15 = 710
    assert float(inv.purchase_price) == 710.0

    # 3. SELL: 2 shares @ ₹750
    tx_sell, realized_gain = add_sell_transaction(db, user_id, inv, Decimal('2'), Decimal('750'))

    db.refresh(inv)
    assert float(inv.quantity) == 13.0
    # Proceeds = 2 * 750 = 1500
    # Cost basis = 2 * 710 = 1420
    # Realized gain = 80
    assert float(realized_gain) == 80.0
    # Remaining cost basis = 10650 - 1420 = 9230
    # Avg price remains 710 (9230 / 13 = 710)
    assert float(inv.purchase_price) == 710.0

    # 4. Third BUY: 3 shares @ ₹740
    add_buy_transaction(db, user_id, inv, Decimal('3'), Decimal('740'))

    db.refresh(inv)
    assert float(inv.quantity) == 16.0
    # New total cost = 9230 + 3*740 = 9230 + 2220 = 11450
    # New avg price = 11450 / 16 = 715.625
    assert float(inv.purchase_price) == 715.625

    # Check transaction history count
    txs = db.query(InvestmentTransaction).filter(
        InvestmentTransaction.investment_id == inv.id
    ).all()
    # Initial + BUY5 + SELL2 + BUY3 = 4 transactions
    assert len(txs) == 4


def test_mutual_fund_lots_and_nav(db):
    """
    Scenario from Prompt Section 19:
    UTI Nifty 50 Index Fund:
    1. BUY 20 units @ NAV ₹250 => Units=20, Cost=₹5000, Avg NAV=₹250
    2. BUY 10 units @ NAV ₹270 => Units=30, Cost=₹7700, Avg NAV=₹256.6667
    """
    user_id = 998
    inv = Investment(
        user_id=user_id,
        asset_name="UTI Nifty 50 Index Fund",
        asset_type="Mutual Funds",
        symbol="UTINIFT50",
        quantity=Decimal('20.0'),
        purchase_price=Decimal('250.0'),
        current_price=Decimal('280.0')
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)

    ensure_legacy_transactions(db, inv)

    add_buy_transaction(db, user_id, inv, Decimal('10'), Decimal('270'))

    db.refresh(inv)
    assert float(inv.quantity) == 30.0
    # Total cost = 20*250 + 10*270 = 5000 + 2700 = 7700
    # Avg NAV = 7700 / 30 = 256.666666...
    assert round(float(inv.purchase_price), 4) == 256.6667


def test_sell_more_than_owned_fails(db):
    user_id = 997
    inv = Investment(
        user_id=user_id,
        asset_name="Test Stock",
        asset_type="Stocks",
        symbol="TST",
        quantity=Decimal('5.0'),
        purchase_price=Decimal('100.0'),
        current_price=Decimal('110.0')
    )
    db.add(inv)
    db.commit()

    with pytest.raises(ValueError, match="Cannot sell 10"):
        add_sell_transaction(db, user_id, inv, Decimal('10'), Decimal('120'))


def test_duplicate_holding_prevention_api(client):
    """
    Test API automatically detects existing holding and adds lot transaction
    instead of creating a duplicate Investment holding.
    """
    # Register & login
    client.post(
        "/api/v1/auth/register",
        json={"email": "lots@example.com", "password": "testpassword", "full_name": "Lot User"}
    )
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "lots@example.com", "password": "testpassword"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Check existing before adding -> should be False
    chk = client.get("/api/v1/investments/check-existing?asset_type=Stocks&symbol=INFY&exchange=NSE", headers=headers)
    assert chk.status_code == 200
    assert chk.json()["exists"] is False

    # 2. Add first lot of Infosys (10 shares @ 1400)
    res1 = client.post(
        "/api/v1/investments",
        headers=headers,
        json={
            "asset_name": "Infosys Ltd",
            "symbol": "INFY",
            "asset_type": "Stocks",
            "exchange": "NSE",
            "quantity": 10.0,
            "purchase_price": 1400.0,
            "current_price": 1450.0
        }
    )
    assert res1.status_code in [200, 201]
    inv1_id = res1.json()["id"]
    assert res1.json()["quantity"] == 10.0

    # 3. Check existing -> should now be True
    chk2 = client.get("/api/v1/investments/check-existing?asset_type=Stocks&symbol=INFY&exchange=NSE", headers=headers)
    assert chk2.status_code == 200
    assert chk2.json()["exists"] is True
    assert chk2.json()["holding"]["id"] == inv1_id

    # 4. Add second lot of Infosys via POST /api/v1/investments (5 shares @ 1500)
    res2 = client.post(
        "/api/v1/investments",
        headers=headers,
        json={
            "asset_name": "Infosys Ltd",
            "symbol": "INFY",
            "asset_type": "Stocks",
            "exchange": "NSE",
            "quantity": 5.0,
            "purchase_price": 1500.0,
            "current_price": 1450.0
        }
    )
    assert res2.status_code in [200, 201]
    # MUST return the SAME investment ID (no duplicate holding record created!)
    assert res2.json()["id"] == inv1_id
    # Quantity must be 15.0 (10 + 5)
    assert res2.json()["quantity"] == 15.0

    # 5. Verify total holdings count for user is still ONE
    all_invs = client.get("/api/v1/investments", headers=headers).json()["items"]
    infosys_holdings = [inv for inv in all_invs if inv["symbol"] == "INFY"]
    assert len(infosys_holdings) == 1
    assert infosys_holdings[0]["quantity"] == 15.0

    # 6. Test GET transactions for Infosys holding
    txs_res = client.get(f"/api/v1/investments/{inv1_id}/transactions", headers=headers)
    assert txs_res.status_code == 200
    txs = txs_res.json()
    assert len(txs) == 2

    # 7. Test POST /api/v1/investments/{id}/sell
    sell_res = client.post(
        f"/api/v1/investments/{inv1_id}/sell",
        headers=headers,
        json={"units": 3.0, "price_per_unit": 1600.0}
    )
    assert sell_res.status_code == 200
    assert sell_res.json()["holding"]["quantity"] == 12.0
    assert sell_res.json()["realized_gain"] > 0
