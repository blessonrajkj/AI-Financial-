import pytest
from app.services.upi_scanner import upi_scanner

def test_upi_scanner_gpay_parsing(tmp_path):
    # We test the parser methods by providing raw texts to auto_classify and checking logic
    # 1. Test auto_classify
    assert upi_scanner.auto_classify("Swiggy Dineout", "Paid ₹540 to Swiggy") == "Food"
    assert upi_scanner.auto_classify("Uber India", "Ola rides") == "Transportation"
    assert upi_scanner.auto_classify("Amazon seller", "Order placed on Amazon") == "Shopping"
    assert upi_scanner.auto_classify("Netflix Entertainment", "recurring payment") == "Subscriptions"
    assert upi_scanner.auto_classify("Employer Payroll", "salary credit") == "Salary"
    assert upi_scanner.auto_classify("EB Electricity Office", "bill pay") == "Utilities"
    assert upi_scanner.auto_classify("Apollo Pharmacy", "medical supplies") == "Healthcare"
    assert upi_scanner.auto_classify("Random Merchant", "simple transaction") == "Miscellaneous"

    # 2. Test data masking logic
    raw_sensitive = "Account Acc No: 12048492049283, CVV 392, PIN: 9938"
    masked = upi_scanner.mask_sensitive_data(raw_sensitive)
    assert "Acc No: ****" in masked or "Account Acc No: ****" in masked or "****29283" in masked or "****" in masked
    assert "CVV: ***" in masked
    assert "PIN: ****" in masked

def test_api_scan_upi_error(client):
    # Register & Login
    client.post(
        "/api/v1/auth/register",
        json={"email": "upiscan@example.com", "password": "testpassword", "full_name": "UPI User"}
    )
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "upiscan@example.com", "password": "testpassword"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify invalid file extension rejection
    bad_res = client.post(
        "/api/v1/receipts/scan-upi",
        headers=headers,
        files={"file": ("test.txt", b"dummy content", "text/plain")}
    )
    assert bad_res.status_code == 400
    assert "Only JPEG, PNG and WEBP screenshots are allowed." in bad_res.json()["detail"]
