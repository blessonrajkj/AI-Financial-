def test_analytics_endpoints(client):
    # Register & Login
    client.post(
        "/api/v1/auth/register",
        json={"email": "analytics@example.com", "password": "TestPassword@123", "full_name": "Analytics User"}
    )
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "analytics@example.com", "password": "TestPassword@123"}
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


def test_market_data_service(db):
    from app.services.market_data import market_data_service
    from app.models.investment import Investment
    from datetime import datetime, timezone
    import unittest.mock as mock
    
    # Test fetching a mock symbol
    mock_response = mock.Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "chart": {
            "result": [
                {
                    "meta": {
                        "regularMarketPrice": 150.0,
                        "previousClose": 148.0
                    }
                }
            ]
        }
    }
    
    with mock.patch("requests.get", return_value=mock_response):
        res = market_data_service.fetch_price_for_symbol("AAPL")
        assert res["success"] is True
        assert res["price"] == 150.0
        assert res["previous_close"] == 148.0

    # Test fetching error
    mock_error = mock.Mock()
    mock_error.status_code = 404
    with mock.patch("requests.get", return_value=mock_error):
        res = market_data_service.fetch_price_for_symbol("INVALID_SYM")
        assert res["success"] is False


def test_transaction_updates_investment(client):
    # Register & Login
    client.post(
        "/api/v1/auth/register",
        json={"email": "hook@example.com", "password": "TestPassword@123", "full_name": "Hook User"}
    )
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "hook@example.com", "password": "TestPassword@123"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create an investment holding first
    inv_res = client.post(
        "/api/v1/investments",
        headers=headers,
        json={
            "asset_name": "Apple Stock",
            "symbol": "AAPL",
            "quantity": 10.0,
            "purchase_price": 150.0,
            "purchase_date": "2026-07-01T00:00:00",
            "asset_type": "Stock",
            "exchange": "NASDAQ"
        }
    )
    assert inv_res.status_code in [200, 201]

    # 2. Add an expense transaction mentioning the symbol/name
    tx_res = client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "amount": 850.0,
            "date": "2026-07-15T10:00:00",
            "description": "Bought 5 units of AAPL stock",
            "payment_method": "Brokerage",
            "type": "expense",
            "is_recurring": False
        }
    )
    assert tx_res.status_code in [200, 201]

    # 3. Retrieve the investment and check that the quantity and average price have updated
    get_res = client.get("/api/v1/investments", headers=headers)
    assert get_res.status_code == 200
    investments = get_res.json().get("items", [])
    assert len(investments) == 1
    
    apple_inv = investments[0]
    # Old total cost = 10 * 150 = 1500
    # New transaction cost = 850
    # New quantity = 10 + 5 = 15
    # New average purchase price = (1500 + 850) / 15 = 2350 / 15 = 156.67
    assert float(apple_inv["quantity"]) == 15.0
    assert round(float(apple_inv["purchase_price"]), 2) == 156.67


def test_dashboard_ai_summary_edge_cases(client):
    # Register & Login
    client.post(
        "/api/v1/auth/register",
        json={"email": "aisummary@example.com", "password": "TestPassword@123", "full_name": "AI User"}
    )
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "aisummary@example.com", "password": "TestPassword@123"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Fetch AI summary for user with zero transactions
    res = client.get("/api/v1/analytics/dashboard/ai-summary", headers=headers)
    assert res.status_code == 200
    assert "insights" in res.json()

    # 2. Add zero amount budget and recurring subscription to test edge cases
    cat_res = client.post("/api/v1/transactions/categories/all?name=Streaming&type=expense", headers=headers)
    cat_id = cat_res.json()["id"]

    client.post(
        "/api/v1/budgets",
        headers=headers,
        json={"category_id": cat_id, "amount": 0.0, "month": 9, "year": 2026}
    )

    client.post(
        "/api/v1/subscriptions",
        headers=headers,
        json={"name": "Netflix", "amount": 499.0, "billing_cycle": "monthly", "next_billing_date": "2026-09-30T00:00:00+05:30"}
    )

    client.post(
        "/api/v1/transactions",
        headers=headers,
        json={"amount": 499.0, "date": "2026-09-20T10:00:00", "description": "Netflix", "category_id": cat_id, "type": "expense", "payment_method": "Card"}
    )

    # 3. Fetch AI summary again - must return 200 OK without 500 error
    res2 = client.get("/api/v1/analytics/dashboard/ai-summary", headers=headers)
    assert res2.status_code == 200
    assert isinstance(res2.json().get("insights"), list)




