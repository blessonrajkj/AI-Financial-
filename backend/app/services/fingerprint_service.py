import hashlib
import re
from datetime import datetime
from typing import Union

def compute_transaction_fingerprint(
    account_id: Union[int, str, None],
    date_val: Union[datetime, str],
    amount: Union[float, str],
    narration: Union[str, None],
    reference_number: Union[str, None] = None
) -> str:
    """
    Computes a deterministic SHA-256 fingerprint for duplicate transaction detection.
    Normalizes date, amount to 2 decimal places, cleaned narration, and ref number.
    """
    if isinstance(date_val, datetime):
        formatted_date = date_val.strftime("%Y-%m-%d")
    else:
        formatted_date = str(date_val)[:10]

    try:
        amount_str = f"{float(amount):.2f}"
    except Exception:
        amount_str = "0.00"

    clean_narration = re.sub(r'\s+', ' ', (narration or "").strip().lower())
    clean_ref = (reference_number or "").strip().upper()
    acc_id_str = str(account_id or "0")

    raw_payload = f"{acc_id_str}|{formatted_date}|{amount_str}|{clean_narration}|{clean_ref}"
    return hashlib.sha256(raw_payload.encode('utf-8')).hexdigest()
