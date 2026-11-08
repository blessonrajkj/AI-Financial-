def test_register_user(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "test@example.com", "password": "TestPassword@123", "full_name": "Test User"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["full_name"] == "Test User"
    assert "id" in data

def test_login_user(client):
    # Register first
    client.post(
        "/api/v1/auth/register",
        json={"email": "login@example.com", "password": "TestPassword@123", "full_name": "Login User"}
    )
    
    # Login
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "login@example.com", "password": "TestPassword@123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_get_me(client):
    # Register and Login
    client.post(
        "/api/v1/auth/register",
        json={"email": "me@example.com", "password": "TestPassword@123", "full_name": "Me User"}
    )
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "me@example.com", "password": "TestPassword@123"}
    )
    token = login_res.json()["access_token"]
    
    # Query me
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "me@example.com"
