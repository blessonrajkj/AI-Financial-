import pytest
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from app.models.user import User
from app.models.account import Account
from app.models.transaction import Transaction
from app.models.transfer import Transfer
from app.models.liability import Liability
from app.models.investment import Investment
from app.models.investment_transaction import InvestmentTransaction
from app.models.india_post_investment import IndiaPostInvestment
from app.services.india_post_service import calculate_india_post_yield
from app.services.forecaster import detect_anomalies_mad, Forecaster
from app.services.fingerprint_service import compute_transaction_fingerprint

@pytest.fixture
def test_user(db):
    user = User(
        email="reconciliation_user@example.com",
        hashed_password="hashed_pwd_placeholder",
        full_name="Reconciliation User",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def test_decimal_monetary_precision():
    """Verify Decimal math prevents float 0.1 + 0.2 precision loss."""
    val1 = Decimal("0.1")
    val2 = Decimal("0.2")
    res = val1 + val2
    assert res == Decimal("0.3")
    assert str(res) == "0.3"

def test_internal_transfer_with_fee(db, test_user):
    """Verify internal transfer principal movement and transfer fee expense tracking."""
    account_a = Account(
        user_id=test_user.id,
        account_name="Savings Account A",
        bank_name="HDFC",
        balance=Decimal("10000.00"),
        account_type="Savings"
    )
    account_b = Account(
        user_id=test_user.id,
        account_name="Checking Account B",
        bank_name="ICICI",
        balance=Decimal("1000.00"),
        account_type="Checking"
    )
    db.add_all([account_a, account_b])
    db.commit()

    transfer_amount = Decimal("2000.00")
    transfer_fee = Decimal("15.00")

    transfer = Transfer(
        user_id=test_user.id,
        source_account_id=account_a.id,
        destination_account_id=account_b.id,
        amount=transfer_amount,
        fee=transfer_fee,
        notes="Transfer to Checking"
    )
    db.add(transfer)

    # Deduct principal + fee from source, add principal to destination
    account_a.balance -= (transfer_amount + transfer_fee)
    account_b.balance += transfer_amount
    db.commit()

    assert account_a.balance == Decimal("7985.00")
    assert account_b.balance == Decimal("3000.00")

def test_transaction_account_foreign_key_relationship(db, test_user):
    """Verify Transaction properly links to Account via account_id foreign key."""
    account = Account(
        user_id=test_user.id,
        account_name="Main Bank",
        bank_name="SBI",
        balance=Decimal("5000.00")
    )
    db.add(account)
    db.commit()

    txn = Transaction(
        user_id=test_user.id,
        account_id=account.id,
        amount=Decimal("150.50"),
        type="expense",
        description="Grocery Store"
    )
    db.add(txn)
    db.commit()

    assert txn.account_id == account.id
    assert txn.account.account_name == "Main Bank"
    assert len(account.transactions) == 1

def test_duplicate_fingerprint_matching(db, test_user):
    """Verify SHA-256 fingerprint generation for duplicate protection."""
    dt = datetime(2026, 9, 29, 10, 0, 0, tzinfo=timezone.utc)
    fp1 = compute_transaction_fingerprint(1, dt, Decimal("500.00"), "Amazon Web Services", "REF12345")
    fp2 = compute_transaction_fingerprint(1, dt, Decimal("500.00"), "Amazon Web Services", "REF12345")
    fp3 = compute_transaction_fingerprint(1, dt, Decimal("500.01"), "Amazon Web Services", "REF12345")

    assert fp1 == fp2
    assert fp1 != fp3

def test_india_post_scheme_compounding():
    """Verify scheme-specific India Post compounding math."""
    p_date = datetime(2025, 1, 1, tzinfo=timezone.utc)
    m_date = datetime(2040, 1, 1, tzinfo=timezone.utc)
    
    # PPF (Quarterly interest compounding, annual credit)
    ppf_res = calculate_india_post_yield(
        scheme_name="Public Provident Fund (PPF)",
        principal=100000.0,
        annual_rate=7.10,
        start_date=p_date,
        maturity_date=m_date
    )
    assert ppf_res["maturity_amount"] > 100000.0

    # NSC (Annual compounding)
    nsc_res = calculate_india_post_yield(
        scheme_name="National Savings Certificate (NSC)",
        principal=10000.0,
        annual_rate=7.70,
        start_date=p_date,
        maturity_date=datetime(2030, 1, 1, tzinfo=timezone.utc)
    )
    assert nsc_res["maturity_amount"] > 10000.0

def test_mad_anomaly_detection(db, test_user):
    """Verify Median Absolute Deviation (MAD) expenditure outlier detection."""
    txns = []
    base_date = datetime.now(timezone.utc)
    for i, amt in enumerate([100.00, 105.00, 98.00, 102.00, 101.00, 5000.00]):
        t = Transaction(
            user_id=test_user.id,
            amount=Decimal(str(amt)),
            type="expense",
            description=f"Item {i}",
            date=base_date - timedelta(days=i)
        )
        db.add(t)
        txns.append(t)
    db.commit()

    anomalies = detect_anomalies_mad(txns)
    assert len(anomalies) == 1
    assert anomalies[0]["amount"] == 5000.00

def test_three_tier_savings_forecast(db, test_user):
    """Verify 3-tier forecast calculation via Forecaster engine."""
    forecaster = Forecaster()
    forecast = forecaster.forecast_spending(db, test_user.id)
    assert "status" in forecast
    assert "metrics" in forecast
    three_tier = forecast["metrics"]["savings_three_tier"]
    assert three_tier["conservative"] <= three_tier["expected"]
    assert three_tier["expected"] <= three_tier["optimistic"]

def test_debt_liability_scoring(db, test_user):
    """Verify debt liability APR interest impact and minimum monthly calculation."""
    liability = Liability(
        user_id=test_user.id,
        name="Credit Card Loan",
        liability_type="Credit Card",
        total_amount=Decimal("50000.00"),
        remaining_amount=Decimal("30000.00"),
        interest_rate=Decimal("18.00"),
        minimum_payment=Decimal("1500.00")
    )
    db.add(liability)
    db.commit()

    monthly_interest = liability.remaining_amount * (liability.interest_rate / Decimal("100")) / Decimal("12")
    assert monthly_interest == Decimal("450.00")
    assert liability.minimum_payment > monthly_interest
