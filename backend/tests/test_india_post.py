from datetime import datetime
from app.services.india_post_service import calculate_india_post_yield, get_applicable_rate

def test_india_post_calculations():
    # Test PPF annual compounding calculation
    start = datetime(2021, 4, 1)
    maturity = datetime(2026, 4, 1)
    ppf_res = calculate_india_post_yield("PPF", 100000.0, 7.10, start, maturity)
    
    assert ppf_res["principal"] == 100000.0
    assert ppf_res["annual_rate"] == 7.10
    assert ppf_res["maturity_amount"] > 100000.0
    assert ppf_res["total_interest_earned"] > 0

def test_india_post_fallback_rates():
    rate = get_applicable_rate(None, "PPF")
    assert rate == 7.10
    ssy_rate = get_applicable_rate(None, "SSY")
    assert ssy_rate == 8.20
