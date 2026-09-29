from datetime import date, datetime
from decimal import Decimal
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.india_post_rate import IndiaPostRate

# Standard baseline India Post interest rates as of Q3/Q4 2026
DEFAULT_RATES: Dict[str, float] = {
    "PPF": 7.10,
    "NSC": 7.70,
    "KVP": 7.50,
    "SSY": 8.20,
    "SCSS": 8.20,
    "MIS": 7.40,
    "POTD_1YR": 6.90,
    "POTD_2YR": 7.00,
    "POTD_3YR": 7.10,
    "POTD_5YR": 7.50,
    "PORD": 6.70,
}

def get_applicable_rate(db: Optional[Session], scheme_code: str, query_date: Optional[date] = None) -> float:
    """Fetches exact quarterly interest rate from DB or fallback table."""
    if db:
        q_date = query_date or date.today()
        rate_entry = db.query(IndiaPostRate).filter(
            IndiaPostRate.scheme_code == scheme_code.upper(),
            IndiaPostRate.start_date <= q_date,
            IndiaPostRate.end_date >= q_date
        ).first()
        if rate_entry:
            return float(rate_entry.annual_rate)

    return DEFAULT_RATES.get(scheme_code.upper(), 7.10)

def calculate_india_post_yield(
    scheme_name: str,
    principal: float,
    annual_rate: float,
    start_date: datetime,
    maturity_date: datetime,
    frequency: str = "One Time"
) -> Dict[str, Any]:
    """
    Computes exact maturity amount and total interest for India Post schemes
    using official compounding and payout conventions.
    """
    days = (maturity_date - start_date).days
    years = max(days / 365.25, 0.0)
    r = annual_rate / 100.0
    P = float(principal)

    scheme_upper = scheme_name.upper()

    if "PPF" in scheme_upper or "SSY" in scheme_upper:
        # Annual compounding at FY end
        maturity_amount = P * ((1 + r) ** years)
        total_interest = maturity_amount - P
    elif "NSC" in scheme_upper or "KVP" in scheme_upper:
        # Annual compounding payable at maturity
        maturity_amount = P * ((1 + r) ** years)
        total_interest = maturity_amount - P
    elif "MIS" in scheme_upper:
        # Monthly simple interest payout
        monthly_payout = (P * r) / 12.0
        total_interest = monthly_payout * 12 * years
        maturity_amount = P
    elif "SCSS" in scheme_upper:
        # Quarterly simple interest payout
        quarterly_payout = (P * r) / 4.0
        total_interest = quarterly_payout * 4 * years
        maturity_amount = P
    elif "PORD" in scheme_upper or "RECURRING" in scheme_upper:
        # Quarterly compound monthly installment formula
        n = max(int(years * 12), 1)
        # Approximate RD compounding formula: A = P * ((1+r/4)^(4t) - 1) / (1 - (1+r/4)^(-1/3))
        # Simplified standard RD multiplier:
        q_rate = r / 4.0
        total_deposited = P * n
        maturity_amount = 0.0
        for i in range(1, n + 1):
            months_left = n - i + 1
            quarters = months_left / 3.0
            maturity_amount += P * ((1 + q_rate) ** quarters)
        total_interest = maturity_amount - total_deposited
        P = total_deposited
    else:
        # Default Quarterly Compound Time Deposit (POTD)
        maturity_amount = P * ((1 + r / 4.0) ** (4 * years))
        total_interest = maturity_amount - P

    return {
        "principal": round(P, 2),
        "annual_rate": annual_rate,
        "tenure_years": round(years, 2),
        "maturity_amount": round(maturity_amount, 2),
        "total_interest_earned": round(total_interest, 2),
    }
