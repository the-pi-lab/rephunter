"""API Integration tests for RepoHunter."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "RepoHunter"


def test_languages_endpoint():
    response = client.get("/api/languages")
    assert response.status_code == 200
    data = response.json()
    assert "languages" in data
    assert len(data["languages"]) > 0


def test_settings_get_and_post():
    # GET settings
    get_res = client.get("/api/settings")
    assert get_res.status_code == 200
    settings = get_res.json()
    assert "provider" in settings
    assert "model" in settings
    assert "available_providers" in settings

    # POST settings
    update_res = client.post(
        "/api/settings",
        json={
            "provider": "gemini",
            "model": "gemini/gemini-2.0-flash",
            "api_key": "test-key-12345",
            "api_base": None,
        },
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["provider"] == "gemini"
    assert updated["model"] == "gemini/gemini-2.0-flash"
    assert updated["has_api_key"] is True
    # Crucial security check: raw API key must NEVER be exposed
    assert updated["masked_api_key"] is not None
    assert "test-key-12345" not in str(updated)


def test_trending_endpoint_validation():
    # Valid interval
    res = client.get("/api/trending?since=daily")
    assert res.status_code == 200
    data = res.json()
    assert data["since"] == "daily"
    assert "repositories" in data

    # Invalid interval
    res_bad = client.get("/api/trending?since=yearly")
    assert res_bad.status_code == 422  # validation error


def test_analyze_endpoint_validation():
    # Missing required field 'repo'
    bad_req = client.post("/api/analyze", json={"description": "Missing repo"})
    assert bad_req.status_code == 422
