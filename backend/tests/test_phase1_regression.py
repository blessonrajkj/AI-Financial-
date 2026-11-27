import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import Settings
import app.services.market_data as md

client = TestClient(app)

def test_health_check_success():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"

def test_health_check_database_failure():
    with patch("app.core.database.SessionLocal") as mock_session_local:
        mock_session = MagicMock()
        mock_session.execute.side_effect = Exception("DB connection timeout")
        mock_session_local.return_value = mock_session
        
        response = client.get("/health")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "error"
        assert data["database"] == "disconnected"
        assert "DB connection timeout" in data["error"]

def test_market_data_price_updater_exists_and_callable():
    assert hasattr(md, "start_daily_price_updater")
    assert callable(md.start_daily_price_updater)
    assert hasattr(md, "update_all_market_prices")
    # Calling update_all_market_prices should not raise
    md.update_all_market_prices()

def test_cors_origins_excludes_private_ip():
    settings = Settings()
    for origin in settings.BACKEND_CORS_ORIGINS:
        assert "10.178.84.28" not in origin
