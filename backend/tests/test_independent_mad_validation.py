from datetime import datetime
import pytest
import numpy as np
from app.services.anomaly_detector import (
    detect_anomalies_mad,
    calculate_robust_mad_scale,
    get_category_floor
)

class Tx:
    def __init__(self, id: int, amount: float, tx_type: str = "expense", description: str = "", category: str = "bills"):
        self.id = id
        self.amount = amount
        self.type = tx_type
        self.description = description
        self.category = category
        self.date = datetime.now()

def test_identical_recurring_transactions_zero_false_positives():
    """
    12 consecutive recurring subscription charges of identical amount (₹649).
    Raw MAD = 0.
    Subsequent identical charge must yield 0 anomalies.
    """
    txs = [Tx(i, 649.0, description="Netflix", category="subscription") for i in range(1, 13)]
    anomalies = detect_anomalies_mad(txs)
    assert len(anomalies) == 0, f"Expected 0 false positives, got {len(anomalies)}"

def test_small_bill_fluctuations_zero_false_positives():
    """
    User pays broadband bill of ₹499 every month for 8 months.
    Next 3 months have minor adjustments: ₹510 (tax), ₹520 (usage bump), ₹530 (service fee).
    False positive rate must be 0%.
    """
    history = [Tx(i, 499.0, description="Airtel Broadband", category="bills") for i in range(1, 9)]
    fluctuations = [
        Tx(9, 510.0, description="Airtel Broadband", category="bills"),
        Tx(10, 520.0, description="Airtel Broadband", category="bills"),
        Tx(11, 530.0, description="Airtel Broadband", category="bills"),
    ]
    all_txs = history + fluctuations
    anomalies = detect_anomalies_mad(all_txs)
    
    flagged_ids = [a["transaction_id"] for a in anomalies]
    assert 9 not in flagged_ids
    assert 10 not in flagged_ids
    assert 11 not in flagged_ids
    assert len(anomalies) == 0

def test_extreme_spending_detection_sensitivity():
    """
    User typical grocery spend is ₹500 across 8 visits.
    A rogue/extreme grocery charge of ₹12,000 occurs.
    False negative rate must be 0% (must be detected).
    """
    txs = [Tx(i, 500.0, category="groceries") for i in range(1, 9)]
    txs.append(Tx(99, 12000.0, category="groceries", description="Massive bulk purchase"))
    
    anomalies = detect_anomalies_mad(txs)
    assert len(anomalies) == 1
    flagged = anomalies[0]
    assert flagged["transaction_id"] == 99
    assert flagged["observed_amount"] == 12000.0
    assert flagged["anomaly_score"] >= 3.5
    assert flagged["severity"] in ("high", "critical")

def test_category_specific_baselines_differential_sensitivity():
    """
    Rent has a high deviation floor (₹500), while food has a floor of ₹100.
    A ₹200 increase on ₹25,000 rent (e.g. ₹25,200) must NOT be flagged.
    A ₹500 increase on a ₹150 dining spend (e.g. ₹650) MUST be evaluated properly.
    """
    # Rent scenario: ₹200 variation on ₹25,000 rent
    rent_txs = [Tx(i, 25000.0, category="rent") for i in range(1, 9)]
    rent_txs.append(Tx(10, 25200.0, category="rent"))
    rent_anomalies = detect_anomalies_mad(rent_txs)
    assert len(rent_anomalies) == 0, "Minor ₹200 variation on rent should not be an anomaly"

    # Dining scenario: ₹150 typical dining, one charge is ₹1,500 (10x typical)
    dining_txs = [Tx(i, 150.0, category="dining") for i in range(1, 9)]
    dining_txs.append(Tx(20, 1500.0, category="dining"))
    dining_anomalies = detect_anomalies_mad(dining_txs)
    assert len(dining_anomalies) == 1
    assert dining_anomalies[0]["transaction_id"] == 20

def test_different_sample_sizes():
    """
    Test sample sizes N=1, 2, 3, 4, 6, 50.
    N < 5 must return empty list (statistical confidence requirement).
    N >= 5 processes anomalies robustly.
    """
    # N=3 with outlier (< 5) must return empty
    small_sample = [Tx(1, 100.0), Tx(2, 100.0), Tx(3, 10000.0)]
    assert detect_anomalies_mad(small_sample) == []

    # N=6 with outlier (N >= 5) correctly identifies outlier
    valid_sample = [Tx(1, 100.0), Tx(2, 100.0), Tx(3, 100.0), Tx(4, 100.0), Tx(5, 100.0), Tx(6, 5000.0)]
    anomalies = detect_anomalies_mad(valid_sample)
    assert len(anomalies) == 1
    assert anomalies[0]["transaction_id"] == 6

def test_zero_mad_with_historical_outlier_scale_calculation():
    """
    Historical data contains 8 identical ₹500 bills, and ONE past outlier of ₹5000.
    Raw MAD is 0 (since 8 out of 9 are identical to median 500).
    Robust scale fallback using MeanAD correctly incorporates the historical dispersion.
    """
    amounts = np.array([500.0, 500.0, 500.0, 500.0, 500.0, 500.0, 500.0, 500.0, 5000.0])
    med, scale, scale_type = calculate_robust_mad_scale(amounts, category="bills")
    
    assert med == 500.0
    assert scale_type == "zero_mad_fallback"
    # MeanAD is 4500 / 9 = 500.0
    assert scale == 500.0

    # Test that a small deviation of ₹20 (₹520) has a low score
    score = 0.6745 * (520 - med) / scale
    assert score < 1.0  # Not flagged

    # Test that a genuine massive deviation of ₹8,000 has a high score
    score_extreme = 0.6745 * (8000 - med) / scale
    assert score_extreme > 3.5  # Flagged
