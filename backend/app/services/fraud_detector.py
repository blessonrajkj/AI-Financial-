from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Dict, Any
from app.models.transaction import Transaction
from app.models.category_merchant import Merchant
from app.services.anomaly_detector import detect_anomalies_mad

class FraudDetector:
    """
    Financial Anomaly Detection Service.
    Uses robust Median Absolute Deviation (MAD) with Modified Z-scores to identify
    statistically irregular spending, duplicate charges, and unusual time patterns.
    Never describes unverified unusual spending as confirmed fraud.
    """
    def __init__(self):
        pass

    def scan_for_anomalies(self, db: Session, user_id: int) -> List[Dict[str, Any]]:
        transactions = db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense"
        ).order_by(Transaction.date.desc()).all()

        if not transactions:
            return []

        # 1. Run robust MAD Anomaly Detector across user expenses
        mad_anomalies = detect_anomalies_mad(transactions)
        mad_by_tx_id = {a["transaction_id"]: a for a in mad_anomalies}

        # 2. Check for duplicate charges within 24 hours
        seen_duplicates = set()
        duplicate_tx_ids = set()
        
        for idx, t in enumerate(transactions):
            for other_t in transactions[idx + 1:min(idx + 15, len(transactions))]:
                time_diff = abs(t.date - other_t.date)
                if (
                    time_diff <= timedelta(hours=24)
                    and t.amount == other_t.amount
                    and t.merchant_id is not None
                    and t.merchant_id == other_t.merchant_id
                    and t.id != other_t.id
                ):
                    dup_key = tuple(sorted([t.id, other_t.id]))
                    if dup_key not in seen_duplicates:
                        seen_duplicates.add(dup_key)
                        duplicate_tx_ids.add(t.id)

        warnings = []
        for t in transactions:
            mad_info = mad_by_tx_id.get(t.id)
            is_dup = t.id in duplicate_tx_ids
            is_late_night = (t.date.hour >= 1 and t.date.hour <= 5)

            reasons = []
            score = 0.0
            expected = round(float(t.amount), 2)
            deviation = 0.0
            severity = "low"

            if mad_info:
                reasons.append(mad_info["detection_reason"])
                score = mad_info["anomaly_score"]
                expected = mad_info["expected_amount"]
                deviation = mad_info["deviation"]
                severity = mad_info["severity"]

            if is_dup:
                reasons.append("Potential duplicate charge detected with identical merchant and amount within 24 hours.")
                score = max(score, 4.0)
                if severity == "low":
                    severity = "medium"

            if is_late_night and (mad_info or is_dup):
                reasons.append("Transaction occurred during atypical late night hours (1:00 AM – 5:00 AM).")

            if reasons:
                merchant_name = t.merchant.name if getattr(t, "merchant", None) else (t.description or "Unknown")
                primary_reason = "; ".join(reasons)
                
                warnings.append({
                    "transaction_id": t.id,
                    "observed_amount": round(float(t.amount), 2),
                    "expected_amount": expected,
                    "deviation": deviation,
                    "anomaly_score": score,
                    "severity": severity,
                    "detection_reason": primary_reason,
                    # Backward-compatibility fields:
                    "amount": round(float(t.amount), 2),
                    "merchant": merchant_name,
                    "date": t.date.strftime("%Y-%m-%d %H:%M") if t.date else None,
                    "reasons": reasons
                })

        return warnings

fraud_detector = FraudDetector()
