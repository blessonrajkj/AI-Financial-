from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import numpy as np
from app.models.transaction import Transaction
from app.models.category_merchant import Merchant

class FraudDetector:
    def __init__(self):
        pass

    def scan_for_anomalies(self, db: Session, user_id: int) -> list:
        # Fetch user's recent transactions (last 100 or so)
        transactions = db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense"
        ).order_by(Transaction.date.desc()).all()

        warnings = []
        if not transactions:
            return warnings

        # Extract amounts for statistical analysis
        amounts = [t.amount for t in transactions]
        mean_amount = np.mean(amounts) if amounts else 0.0
        std_amount = np.std(amounts) if amounts else 0.0
        
        # Calculate outlier threshold (mean + 2.5 * std or a minimum threshold)
        large_purchase_threshold = max(500.0, mean_amount + 2.5 * std_amount)

        # Map to find duplicate bills (amount and merchant name match within 24 hours)
        seen_duplicates = set()

        for idx, t in enumerate(transactions):
            reasons = []
            
            # 1. Flag abnormally large purchase
            if t.amount >= large_purchase_threshold:
                reasons.append(f"Abnormal large purchase: amount is {t.amount} (average is {round(mean_amount, 2)})")

            # 2. Flag duplicates
            for other_t in transactions[idx + 1:idx + 10]:  # Compare with subsequent transactions
                time_diff = abs(t.date - other_t.date)
                if (
                    time_diff <= timedelta(hours=24)
                    and t.amount == other_t.amount
                    and t.merchant_id == other_t.merchant_id
                    and t.id != other_t.id
                ):
                    dup_key = tuple(sorted([t.id, other_t.id]))
                    if dup_key not in seen_duplicates:
                        seen_duplicates.add(dup_key)
                        reasons.append("Potential duplicate transaction within 24 hours")

            # 3. Unusual hours
            if t.date.hour >= 1 and t.date.hour <= 5:
                reasons.append("Late night activity (between 1:00 AM and 5:00 AM)")

            # If anomalies found, construct warning card payload
            if reasons:
                warnings.append({
                    "transaction_id": t.id,
                    "amount": t.amount,
                    "merchant": t.merchant.name if t.merchant else "Unknown",
                    "date": t.date.strftime("%Y-%m-%d %H:%M"),
                    "reasons": reasons,
                    "severity": "high" if t.amount >= large_purchase_threshold else "medium"
                })

        return warnings

fraud_detector = FraudDetector()
