import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from app.models.account import Account
from app.models.liability import Liability
from app.models.investment import Investment
from app.models.investment_transaction import InvestmentTransaction
from app.models.india_post_investment import IndiaPostInvestment
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.models.category_merchant import Category
from app.models.subscription import Subscription
from app.services.investment_service import calculate_real_xirr, add_buy_transaction
from app.api.v1.endpoints.analytics import sanitize_csv_cell


def test_transfer_insufficient_funds_and_fee(client, normal_user_token_headers, db):
    # Setup two accounts: source with 1000, destination with 200
    src = Account(
        user_id=1,
        account_name="Source Acc",
        bank_name="Bank A",
        account_type="Savings",
        balance=Decimal("1000.00"),
        is_active=True
    )
    dst = Account(
        user_id=1,
        account_name="Dest Acc",
        bank_name="Bank B",
        account_type="Savings",
        balance=Decimal("200.00"),
        is_active=True
    )
    db.add_all([src, dst])
    db.commit()
    db.refresh(src)
    db.refresh(dst)

    # Attempt transfer of 950 with 100 fee -> total 1050 > 1000 balance -> HTTP 400
    res = client.post(
        "/api/v1/transfers/",
        headers=normal_user_token_headers,
        json={
            "source_account_id": src.id,
            "destination_account_id": dst.id,
            "amount": 950.0,
            "fee": 100.0
        }
    )
    assert res.status_code == 400
    assert "Insufficient funds" in res.json()["detail"]

    # Successful transfer: 500 with 50 fee -> total 550 deducted from src, 500 added to dst
    res = client.post(
        "/api/v1/transfers/",
        headers=normal_user_token_headers,
        json={
            "source_account_id": src.id,
            "destination_account_id": dst.id,
            "amount": 500.0,
            "fee": 50.0
        }
    )
    assert res.status_code == 201
    db.refresh(src)
    db.refresh(dst)
    assert src.balance == Decimal("450.00")
    assert dst.balance == Decimal("700.00")


def test_investment_validation_and_sync(client, normal_user_token_headers, db):
    # Non-positive quantity or price fails
    res = client.post(
        "/api/v1/investments",
        headers=normal_user_token_headers,
        json={
            "asset_name": "Test Asset",
            "asset_type": "Stocks",
            "quantity": 0,
            "purchase_price": 100.0
        }
    )
    assert res.status_code == 400

    res = client.post(
        "/api/v1/investments",
        headers=normal_user_token_headers,
        json={
            "asset_name": "Test Asset",
            "asset_type": "Stocks",
            "quantity": 10,
            "purchase_price": -5.0
        }
    )
    assert res.status_code == 400

    # Create valid investment
    t1 = datetime(2025, 1, 1, tzinfo=timezone.utc)
    res = client.post(
        "/api/v1/investments",
        headers=normal_user_token_headers,
        json={
            "asset_name": "Sync Stock",
            "asset_type": "Stocks",
            "quantity": 10,
            "purchase_price": 100.0,
            "current_price": 120.0,
            "purchase_date": t1.isoformat()
        }
    )
    assert res.status_code == 201
    inv_id = res.json()["id"]

    # Test buy lot validation
    res = client.post(
        f"/api/v1/investments/{inv_id}/buy",
        headers=normal_user_token_headers,
        json={"units": -2, "price_per_unit": 100.0}
    )
    assert res.status_code == 400

    # Test sell lot validation
    res = client.post(
        f"/api/v1/investments/{inv_id}/sell",
        headers=normal_user_token_headers,
        json={"units": 0, "price_per_unit": 100.0}
    )
    assert res.status_code == 400

    # Update investment quantity/price -> syncs InvestmentTransaction
    res = client.put(
        f"/api/v1/investments/{inv_id}",
        headers=normal_user_token_headers,
        json={"quantity": 25, "purchase_price": 150.0}
    )
    assert res.status_code == 200

    first_tx = db.query(InvestmentTransaction).filter(
        InvestmentTransaction.investment_id == inv_id,
        InvestmentTransaction.transaction_type == "BUY"
    ).first()
    assert first_tx is not None
    assert first_tx.units == Decimal("25.0000")
    assert first_tx.price_per_unit == Decimal("150.00")
    assert first_tx.total_amount == Decimal("3750.00")


def test_earliest_purchase_date_retention(db):
    inv = Investment(
        user_id=1,
        asset_name="Earliest Date Stock",
        asset_type="Stocks",
        quantity=Decimal("10"),
        purchase_price=Decimal("100"),
        current_price=Decimal("110"),
        purchase_date=datetime(2024, 6, 1, tzinfo=timezone.utc)
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)

    # Adding a later buy transaction should not overwrite earlier purchase date
    later_date = datetime(2025, 6, 1, tzinfo=timezone.utc)
    add_buy_transaction(
        db=db,
        user_id=1,
        investment=inv,
        units=Decimal("5"),
        price_per_unit=Decimal("120"),
        transaction_date=later_date
    )
    pdate = inv.purchase_date
    if pdate.tzinfo is not None:
        pdate = pdate.replace(tzinfo=None)
    assert pdate == datetime(2024, 6, 1)


def test_newton_raphson_xirr():
    d1 = datetime(2024, 1, 1)
    d2 = datetime(2025, 1, 1)
    # Cashflow: outflow of 1000 on 2024-01-01, inflow of 1100 on 2025-01-01 -> approx 10%
    cfs = [(d1, -1000.0), (d2, 1100.0)]
    rate = calculate_real_xirr(cfs)
    assert 9.5 <= rate <= 10.5

    # Non-convergent / invalid cashflows fallback to CAGR
    assert calculate_real_xirr([(d1, 100.0)], fallback_cagr=5.0) == 5.0


def test_india_post_maturity_status_and_capping(client, normal_user_token_headers, db):
    past_date = datetime(2023, 1, 1, tzinfo=timezone.utc)
    matured_date = datetime(2024, 1, 1, tzinfo=timezone.utc)

    ip = IndiaPostInvestment(
        user_id=1,
        scheme_name="POTD 1 Year",
        amount=Decimal("10000.00"),
        interest_rate=Decimal("6.90"),
        investment_date=past_date,
        maturity_date=matured_date,
        frequency="One Time",
        status="Active"
    )
    db.add(ip)
    db.commit()

    # Querying summary triggers auto-transition to Matured
    res = client.get("/api/v1/india-post-investments/summary", headers=normal_user_token_headers)
    assert res.status_code == 200
    db.refresh(ip)
    assert ip.status == "Matured"


def test_dashboard_summary_net_worth_and_budget_calc(client, normal_user_token_headers, db):
    # Setup an active liability of 5000 and account balance of 20000
    acc = Account(
        user_id=1,
        account_name="NW Account",
        bank_name="TestBank",
        balance=Decimal("20000.00"),
        is_active=True
    )
    liab = Liability(
        user_id=1,
        name="Personal Loan",
        liability_type="Loan",
        total_amount=Decimal("10000.00"),
        remaining_amount=Decimal("5000.00"),
        status="Active"
    )
    # Setup a budget for category A = 3000
    cat_a = Category(user_id=1, name="Budgeted Cat A", type="expense")
    cat_b = Category(user_id=1, name="Unbudgeted Cat B", type="expense")
    db.add_all([acc, liab, cat_a, cat_b])
    db.commit()
    db.refresh(cat_a)
    db.refresh(cat_b)

    now = datetime.now()
    budget = Budget(user_id=1, category_id=cat_a.id, amount=Decimal("3000.00"), month=now.month, year=now.year)
    db.add(budget)

    # Spend 1000 on Cat A (budgeted) and 2000 on Cat B (unbudgeted)
    tx1 = Transaction(user_id=1, amount=Decimal("1000.00"), type="expense", category_id=cat_a.id, date=now)
    tx2 = Transaction(user_id=1, amount=Decimal("2000.00"), type="expense", category_id=cat_b.id, date=now)
    # Annual subscription of 12000 -> monthly equivalent is 1000
    sub = Subscription(
        user_id=1,
        name="Annual Cloud",
        amount=Decimal("12000.00"),
        billing_cycle="yearly",
        next_billing_date=now + timedelta(days=30),
        is_active=True
    )
    db.add_all([tx1, tx2, sub])
    db.commit()

    res = client.get("/api/v1/analytics/summary", headers=normal_user_token_headers)
    assert res.status_code == 200
    data = res.json()

    # Net worth must be present
    assert "net_worth" in data
    # Budget remaining should only subtract Cat A expenses (3000 - 1000 = 2000), not Cat B
    assert data["budget_remaining"] == 2000.0
    # Upcoming bills cost for annual 12000 should be normalized to 1000
    assert data["upcoming_bills_cost"] == 1000.0


def test_csv_injection_sanitization():
    assert sanitize_csv_cell("=1+1") == "'=1+1"
    assert sanitize_csv_cell("+cmd|' /C calc'!A0") == "'+cmd|' /C calc'!A0"
    assert sanitize_csv_cell("-500") == "'-500"
    assert sanitize_csv_cell("@SUM(A1:A5)") == "'@SUM(A1:A5)"
    assert sanitize_csv_cell("Normal Text") == "Normal Text"
    assert sanitize_csv_cell(123) == 123
