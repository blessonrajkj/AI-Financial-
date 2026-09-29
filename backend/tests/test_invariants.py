from decimal import Decimal
from app.services.fingerprint_service import compute_transaction_fingerprint

def test_fingerprint_determinism():
    fp1 = compute_transaction_fingerprint(1, "2026-09-29", 1500.0, "GROCERY STORE", "REF123")
    fp2 = compute_transaction_fingerprint("1", "2026-09-29T10:00:00", "1500.00", " grocery store ", "ref123")
    assert fp1 == fp2

def test_fingerprint_uniqueness_on_different_amount():
    fp1 = compute_transaction_fingerprint(1, "2026-09-29", 1500.0, "GROCERY STORE", "REF123")
    fp3 = compute_transaction_fingerprint(1, "2026-09-29", 1501.0, "GROCERY STORE", "REF123")
    assert fp1 != fp3
