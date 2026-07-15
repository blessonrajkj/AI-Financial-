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
