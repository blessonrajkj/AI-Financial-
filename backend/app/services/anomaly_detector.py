import numpy as np
from typing import List, Dict, Any, Optional

# Minimum meaningful deviation floors by category (in primary currency units, e.g. INR / USD)
CATEGORY_DEVIATION_FLOORS: dict[str, float] = {
    "utilities": 100.0,
    "bills": 100.0,
    "subscription": 100.0,
    "subscriptions": 100.0,
    "rent": 500.0,
    "housing": 500.0,
    "groceries": 150.0,
    "grocery": 150.0,
    "food & dining": 100.0,
    "dining": 100.0,
    "food": 100.0,
    "entertainment": 150.0,
    "shopping": 200.0,
    "travel": 300.0,
    "transportation": 100.0,
    "healthcare": 250.0,
    "medical": 250.0,
    "education": 500.0,
    "investment": 500.0,
    "default": 100.0,
}

MODIFIED_Z_THRESHOLD = 3.5

def get_category_floor(category: Optional[str]) -> float:
    if not category:
        return CATEGORY_DEVIATION_FLOORS["default"]
    cat_clean = category.strip().lower()
    return CATEGORY_DEVIATION_FLOORS.get(cat_clean, CATEGORY_DEVIATION_FLOORS["default"])

def calculate_robust_mad_scale(amounts: np.ndarray, category: Optional[str] = None) -> tuple[float, float, str]:
    """
    Calculates median, robust dispersion scale, and scale computation method.
    Handles MAD == 0 using a statistically defensible fallback:
    1. Robust IQR equivalent (IQR / 1.349)
    2. Mean Absolute Deviation (MeanAD)
    3. Category-specific empirical floor
    4. Proportional minimum (10% of median)
    """
    if len(amounts) == 0:
        return 0.0, 1.0, "none"
        
    med = float(np.median(amounts))
    abs_deviations = np.abs(amounts - med)
    raw_mad = float(np.median(abs_deviations))
    category_floor = get_category_floor(category)

    if raw_mad > 0:
        return med, raw_mad, "standard_mad"

    # Explicit Zero-MAD handling (e.g. repeated identical bills)
    # 1. Interquartile Range (IQR / 1.349 is asymptotically normal equivalent)
    q75, q25 = np.percentile(amounts, [75, 25])
    iqr = float(q75 - q25)
    iqr_scale = iqr / 1.349 if iqr > 0 else 0.0

    # 2. Mean Absolute Deviation from Median
    mean_ad = float(np.mean(abs_deviations)) if len(abs_deviations) > 0 else 0.0

    # 3. Proportional scale (10% of median baseline)
    proportional_scale = abs(med) * 0.10

    # Defensible robust scale fallback: take the maximum of robust alternatives
    candidate_scales = [iqr_scale, mean_ad, proportional_scale, category_floor]
    chosen_scale = max(candidate_scales)

    if chosen_scale <= 0:
        chosen_scale = max(category_floor, 1.0)

    return med, chosen_scale, "zero_mad_fallback"

def detect_anomalies_mad(transactions: List[Any], category_override: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Detects expenditure anomalies using mathematically correct Median Absolute Deviation (MAD)
    and Modified Z-score.
    
    Requirements satisfied:
    - Minimum sample size >= 5 for statistical validity.
    - Modified Z-Score initial threshold of 3.5.
    - Explicit zero-MAD handling with defensible fallback (never tiny epsilon).
    - Minimum meaningful deviation floor to avoid false alarms on minor bill variations.
    - Recurring subscription protection.
    - Explainable anomaly payload (never describes unusual spending as confirmed fraud).
    """
    if not transactions or len(transactions) < 5:
        return []

    # Filter to expenses with positive amounts
    valid_txs = [
        t for t in transactions 
        if (getattr(t, "type", "") or "").lower() == "expense" and float(getattr(t, "amount", 0)) > 0
    ]
    if len(valid_txs) < 5:
        return []

    amounts = np.array([float(t.amount) for t in valid_txs], dtype=np.float64)
    med, scale, scale_type = calculate_robust_mad_scale(amounts, category_override)

    category_floor = get_category_floor(category_override)
    # Deviation floor: at least category floor or 25% of typical median
    min_meaningful_deviation = max(category_floor, abs(med) * 0.25)

    anomalies = []
    for t in valid_txs:
        amt = float(t.amount)
        deviation = amt - med
        abs_dev = abs(deviation)

        # 1. Suppress if deviation is below the minimum meaningful floor
        if abs_dev < min_meaningful_deviation:
            continue

        # 2. Modified Z-score calculation: 0.6745 * |x_i - med| / scale
        modified_z = 0.6745 * abs_dev / scale

        # 3. Anomaly threshold test
        if modified_z >= MODIFIED_Z_THRESHOLD:
            # Check recurring subscription protection
            # If description notes known recurring/subscription service, check relative variance
            desc = (getattr(t, "description", "") or "").lower()
            is_recurring = any(kw in desc for kw in ["netflix", "spotify", "subscription", "recurring", "aws", "gsuite"])
            if is_recurring and abs_dev <= (med * 0.35):
                # Minor recurring adjustment (taxes, currency exchange fluctuation), not an anomaly
                continue

            # Severity classification
            if modified_z >= 7.0:
                severity = "critical"
            elif modified_z >= 5.0:
                severity = "high"
            else:
                severity = "medium"

            cat_name = getattr(t, "category", None)
            if hasattr(cat_name, "name"):
                cat_label = cat_name.name
            elif isinstance(cat_name, str):
                cat_label = cat_name
            else:
                cat_label = category_override or "expense"

            t_date = getattr(t, "date", None)
            date_str = t_date.isoformat() if hasattr(t_date, "isoformat") else str(t_date) if t_date else None

            # Explainable detection reason (neutral language, never "confirmed fraud")
            direction = "higher" if deviation > 0 else "lower"
            reason = (
                f"Expenditure of {amt:,.2f} is {abs_dev:,.2f} {direction} than your typical {cat_label} "
                f"baseline of {med:,.2f} (Modified Z-Score: {modified_z:.2f}, scale: {scale_type})."
            )

            anomalies.append({
                "transaction_id": getattr(t, "id", None),
                "id": getattr(t, "id", None),
                "observed_amount": round(amt, 2),
                "amount": round(amt, 2),
                "expected_amount": round(med, 2),
                "median_baseline": round(med, 2),
                "deviation": round(deviation, 2),
                "anomaly_score": round(float(modified_z), 2),
                "severity": severity,
                "detection_reason": reason,
                "category": cat_label,
                "date": date_str,
                "description": getattr(t, "description", None)
            })

    return anomalies
