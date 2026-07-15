def test_analytics_endpoints(client):
    # Register & Login
    client.post(
        "/api/v1/auth/register",
        json={"email": "analytics@example.com", "password": "testpassword", "full_name": "Analytics User"}
    )
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "analytics@example.com", "password": "testpassword"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create category and transaction to populate data
    cat_res = client.post(
        "/api/v1/transactions/categories/all?name=Utilities&type=expense",
        headers=headers
    )
    assert cat_res.status_code == 200
    cat_id = cat_res.json()["id"]

    merch_res = client.post(
        "/api/v1/transactions/merchants/all?name=Electricity",
        headers=headers
    )
    assert merch_res.status_code == 200
    merch_id = merch_res.json()["id"]

    client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "amount": 1500.0,
            "date": "2026-07-10T10:00:00",
            "description": "Electric bill",
            "category_id": cat_id,
            "merchant_id": merch_id,
            "payment_method": "UPI",
            "type": "expense",
            "is_recurring": False
        }
    )

    # 2. Test summary
    res = client.get("/api/v1/analytics/summary", headers=headers)
    assert res.status_code == 200

    # 3. Test trends
    res = client.get("/api/v1/analytics/trends?days=30", headers=headers)
    assert res.status_code == 200

    # 4. Test forecast
    res = client.get("/api/v1/analytics/forecast", headers=headers)
    assert res.status_code == 200

    # 5. Test top-merchants
    res = client.get("/api/v1/analytics/top-merchants?limit=5", headers=headers)
    assert res.status_code == 200

    # 6. Test exports with query parameters
    res = client.get("/api/v1/analytics/export/csv?search=Electric", headers=headers)
    assert res.status_code == 200
    
    res = client.get("/api/v1/analytics/export/excel", headers=headers)
    assert res.status_code == 200

    res = client.get("/api/v1/analytics/export/pdf", headers=headers)
    assert res.status_code == 200

    # 7. Test report generator formats
    res = client.get("/api/v1/analytics/reports/generate?report_type=monthly&period=2026-07&format=json", headers=headers)
    assert res.status_code == 200

    res = client.get("/api/v1/analytics/reports/generate?report_type=monthly&period=2026-07&format=csv", headers=headers)
    assert res.status_code == 200

    res = client.get("/api/v1/analytics/reports/generate?report_type=monthly&period=2026-07&format=excel", headers=headers)
    assert res.status_code == 200

    res = client.get("/api/v1/analytics/reports/generate?report_type=monthly&period=2026-07&format=pdf", headers=headers)
    assert res.status_code == 200


def test_pdf_parser_classification():
    from app.services.pdf_parser import pdf_parser

    # Header Row
    headers = [
        {"text": "Date", "color": 0},
        {"text": "Description", "color": 0},
        {"text": "Ref", "color": 0},
        {"text": "Withdrawals (Debit)", "color": 0},
        {"text": "Deposits (Credit)", "color": 0},
        {"text": "Balance", "color": 0}
    ]

    # Row 1: Debit transaction (black text, no minus sign)
    row_debit = [
        {"text": "2026-07-15", "color": 0},
        {"text": "UPI Payment to Swiggy", "color": 0},
        {"text": "123456789012", "color": 0},
        {"text": "345.50", "color": 0},
        {"text": "", "color": 0},
        {"text": "5000.00", "color": 0}
    ]

    # Row 2: Credit transaction (green text, no plus sign)
    row_credit = [
        {"text": "2026-07-15", "color": 0},
        {"text": "Salary Credit", "color": 0},
        {"text": "123456789013", "color": 0},
        {"text": "", "color": 0},
        {"text": "45000.00", "color": 65280},  # Green text
        {"text": "50000.00", "color": 0}
    ]

    # Parse rows
    rows = [headers, row_debit, row_credit]
    transactions, invalid = pdf_parser.parse_table_rows(rows, "Test Bank")

    assert len(transactions) == 2
    
    # Verify Row 1: Debit (Expense)
    t_debit = transactions[0]
    assert t_debit["type"] == "expense"
    assert t_debit["amount"] == 345.50
    assert t_debit["description"] == "UPI Payment to Swiggy"
    
    # Verify Row 2: Credit (Income)
    t_credit = transactions[1]
    assert t_credit["type"] == "income"
    assert t_credit["amount"] == 45000.00
    assert t_credit["description"] == "Salary Credit"

