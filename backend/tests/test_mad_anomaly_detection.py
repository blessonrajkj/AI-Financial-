from datetime import datetime
from app.services.anomaly_detector import (
    detect_anomalies_mad,
    calculate_robust_mad_scale,
    get_category_floor
)
import numpy as np

class MockTx:
    def __init__(self, id: int, amount: float, tx_type: str = "expense", description: str = "", category: str = "bills", date: datetime = None):
        self.id = id
        self.amount = amount
        self.type = tx_type
        self.description = description
        self.category = category
        self.date = date or datetime.now()

def test_eight_identical_bills_with_minor_variations():
    """
    Core bug reproduction & verification:
    Eight identical ₹499 bills followed by ₹510, ₹520, and ₹530.
    In the flawed version, MAD=0 caused ₹510, ₹520, ₹530 to be flagged as extreme anomalies.
    In the robust version, NONE of ₹510, ₹520, or ₹530 should be flagged.
    """
    txs = [
        MockTx(1, 499.0, description="Internet Bill", category="bills"),
        MockTx(2, 499.0, description="Internet Bill", category="bills"),
        MockTx(3, 499.0, description="Internet Bill", category="bills"),
        MockTx(4, 499.0, description="Internet Bill", category="bills"),
        MockTx(5, 499.0, description="Internet Bill", category="bills"),
        MockTx(6, 499.0, description="Internet Bill", category="bills"),
        MockTx(7, 499.0, description="Internet Bill", category="bills"),
        MockTx(8, 499.0, description="Internet Bill", category="bills"),
        MockTx(9, 510.0, description="Internet Bill (tax adjusted)", category="bills"),
        MockTx(10, 520.0, description="Internet Bill (usage bump)", category="bills"),
        MockTx(11, 530.0, description="Internet Bill (fee bump)", category="bills"),
    ]

    anomalies = detect_anomalies_mad(txs)
    flagged_ids = [a["transaction_id"] for a in anomalies]

    # Verify that minor variations are NOT flagged
    assert 9 not in flagged_ids, "₹510 should not be flagged as an anomaly"
    assert 10 not in flagged_ids, "₹520 should not be flagged as an anomaly"
    assert 11 not in flagged_ids, "₹530 should not be flagged as an anomaly"
    assert len(anomalies) == 0

def test_genuine_extreme_spending_flagged():
    """Verify that a genuine massive outlier is flagged as high/critical anomaly."""
    txs = [
        MockTx(1, 499.0, category="bills"),
        MockTx(2, 499.0, category="bills"),
        MockTx(3, 499.0, category="bills"),
        MockTx(4, 499.0, category="bills"),
        MockTx(5, 499.0, category="bills"),
        MockTx(6, 499.0, category="bills"),
        MockTx(7, 499.0, category="bills"),
        MockTx(8, 499.0, category="bills"),
        MockTx(99, 15000.0, category="bills", description="Accidental huge charge"),
    ]

    anomalies = detect_anomalies_mad(txs)
    assert len(anomalies) == 1
    outlier = anomalies[0]
    assert outlier["transaction_id"] == 99
    assert outlier["observed_amount"] == 15000.0
    assert outlier["expected_amount"] == 499.0
    assert outlier["deviation"] == 14501.0
    assert outlier["anomaly_score"] >= 3.5
    assert outlier["severity"] in ("high", "critical")
    # Verify non-inflammatory wording
    assert "fraud" not in outlier["detection_reason"].lower()

def test_category_specific_deviation_floors():
    """Verify different categories apply their respective minimum deviation thresholds."""
    assert get_category_floor("rent") == 500.0
    assert get_category_floor("groceries") == 150.0
    assert get_category_floor("utilities") == 100.0
    assert get_category_floor("shopping") == 200.0
    assert get_category_floor("unknown_category") == 100.0

def test_small_sample_size_handling():
    """Verify samples with fewer than 5 transactions do not produce premature anomalies."""
    txs = [
        MockTx(1, 50.0),
        MockTx(2, 60.0),
        MockTx(3, 500.0),  # Potential outlier, but N=3 is statistically insufficient
    ]
    anomalies = detect_anomalies_mad(txs)
    assert anomalies == []

def test_zero_mad_scale_calculation():
    """Verify explicit zero-MAD calculation utilizes robust fallback scale without crashing or using 1e-6."""
    amounts = np.array([100.0, 100.0, 100.0, 100.0, 100.0, 100.0])
    med, scale, scale_type = calculate_robust_mad_scale(amounts, category="bills")
    assert med == 100.0
    assert scale > 0
    assert scale >= 10.0  # At least 10% of median or category floor
    assert scale_type == "zero_mad_fallback"

def test_nonzero_mad_scale_calculation():
    """Verify standard non-zero MAD is correctly calculated."""
    amounts = np.array([10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0])
    med, scale, scale_type = calculate_robust_mad_scale(amounts)
    assert med == 40.0
    assert scale == 20.0
    assert scale_type == "standard_mad"

def test_negative_and_zero_amounts_filtered():
    """Verify zero and negative amounts (credits/refunds) are safely excluded from expense anomaly detection."""
    txs = [
        MockTx(1, 0.0),
        MockTx(2, -50.0),
        MockTx(3, 100.0),
        MockTx(4, 100.0),
        MockTx(5, 100.0),
    ]
    # Only 3 positive expense transactions, so should be safely ignored
    anomalies = detect_anomalies_mad(txs)
    assert anomalies == []

def test_missing_historical_data_returns_empty():
    """Verify empty input lists or None safely return empty anomaly lists."""
    assert detect_anomalies_mad([]) == []
    assert detect_anomalies_mad(None) == []

def test_recurring_subscriptions_protection():
    """Verify known subscription charges with moderate variance are protected."""
    txs = [
        MockTx(1, 649.0, description="Netflix Premium"),
        MockTx(2, 649.0, description="Netflix Premium"),
        MockTx(3, 649.0, description="Netflix Premium"),
        MockTx(4, 649.0, description="Netflix Premium"),
        MockTx(5, 649.0, description="Netflix Premium"),
        # Price adjustment or tax increase of ~20%
        MockTx(6, 749.0, description="Netflix Subscription renewal"),
    ]
    anomalies = detect_anomalies_mad(txs)
    assert len(anomalies) == 0

def test_anomaly_output_schema_and_neutral_terminology():
    """Verify anomaly outputs conform strictly to the required schema and do not mention 'confirmed fraud'."""
    txs = [
        MockTx(1, 100.0),
        MockTx(2, 105.0),
        MockTx(3, 98.0),
        MockTx(4, 102.0),
        MockTx(5, 100.0),
        MockTx(6, 1000.0),  # Extreme spike
    ]
    anomalies = detect_anomalies_mad(txs)
    assert len(anomalies) == 1
    anom = anomalies[0]
    
    required_keys = [
        "transaction_id",
        "observed_amount",
        "expected_amount",
        "deviation",
        "anomaly_score",
        "severity",
        "detection_reason"
    ]
    for key in required_keys:
        assert key in anom, f"Missing required key: {key}"
        
    assert anom["observed_amount"] == 1000.0
    assert "fraud" not in anom["detection_reason"].lower()
    assert "confirmed fraud" not in anom["detection_reason"].lower()
