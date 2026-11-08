def test_create_and_read_transactions(client):
    # Register & Login
    client.post(
        "/api/v1/auth/register",
        json={"email": "trans@example.com", "password": "TestPassword@123", "full_name": "Trans User"}
    )
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "trans@example.com", "password": "TestPassword@123"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Category
    cat_res = client.post(
        "/api/v1/transactions/categories/all?name=Food&type=expense",
        headers=headers
    )
    assert cat_res.status_code == 200
    cat_id = cat_res.json()["id"]

    # 2. Create Merchant
    merch_res = client.post(
        "/api/v1/transactions/merchants/all?name=Starbucks",
        headers=headers
    )
    assert merch_res.status_code == 200
    merch_id = merch_res.json()["id"]

    # 3. Create Transaction
    trans_res = client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "amount": 250.50,
            "date": "2026-07-08T12:00:00Z",
            "description": "Starbucks Coffee",
            "category_id": cat_id,
            "merchant_id": merch_id,
            "payment_method": "UPI",
            "type": "expense",
            "is_recurring": False
        }
    )
    assert trans_res.status_code == 201
    trans_data = trans_res.json()
    assert trans_data["amount"] == 250.50
    assert trans_data["description"] == "Starbucks Coffee"
    assert trans_data["payment_method"] == "UPI"

    # 4. Fetch list
    list_res = client.get("/api/v1/transactions", headers=headers)
    assert list_res.status_code == 200
    transactions_list = list_res.json()
    assert len(transactions_list) == 1
    assert transactions_list[0]["amount"] == 250.50
