"""FastAPI application entry point for RepoHunter."""

import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Request, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .analyzer import analyze_repository, test_ai_connection
from .config import config_manager
from .models import (
    TrendingResponse,
    LanguagesResponse,
    AnalysisRequest,
    AnalysisResponse,
    SettingsResponse,
    SettingsUpdateRequest,
    TestConnectionRequest,
    TestConnectionResponse,
)
from .scraper import fetch_trending, get_languages
from .security import analysis_rate_limiter, validate_api_base

app = FastAPI(
    title="RepoHunter API",
    description="Minimal single-purpose AI agent for GitHub Trending discovery and analysis",
    version="1.0.0",
)

# CORS middleware for development flexibility.
# Note: allow_credentials=True cannot be combined with a wildcard origin
# (browsers reject that combination), so explicit local dev origins are used.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    """Health check endpoint for Docker / orchestration."""
    return {
        "status": "healthy",
        "app": "RepoHunter",
        "version": "1.0.0",
    }


@app.get("/api/languages", response_model=LanguagesResponse)
def list_languages():
    """Retrieve supported programming languages for filtering trending repos."""
    return LanguagesResponse(languages=get_languages())


@app.get("/api/trending", response_model=TrendingResponse)
def get_trending(
    since: str = Query("daily", pattern="^(daily|weekly|monthly)$", description="Trending interval"),
    language: Optional[str] = Query(None, description="Programming language slug (e.g. 'python', 'rust')"),
    refresh: bool = Query(False, description="Force live re-fetch from GitHub bypassing cache"),
):
    """Fetch trending repositories from GitHub Trending."""
    try:
        data = fetch_trending(since=since, language=language, force_refresh=refresh)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch trending repositories: {str(e)}",
        )


@app.post("/api/analyze", response_model=AnalysisResponse)
def analyze(req: AnalysisRequest, request: Request):
    """Analyze a single repository using configured AI provider."""
    # 1. Rate limiting by client IP
    client_ip = request.client.host if request.client else "127.0.0.1"
    if not analysis_rate_limiter.is_allowed(client_ip):
        retry_after = analysis_rate_limiter.retry_after(client_ip)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Please wait {retry_after} seconds before requesting another AI analysis.",
            headers={"Retry-After": str(retry_after)},
        )

    # 2. Execute analysis
    try:
        return analyze_repository(req)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Repository analysis failed: {str(e)}",
        )


@app.get("/api/settings", response_model=SettingsResponse)
def get_settings():
    """Retrieve current AI provider configuration (with masked API key)."""
    return config_manager.get_public_settings()


@app.post("/api/settings", response_model=SettingsResponse)
def update_settings(payload: SettingsUpdateRequest):
    """Update AI provider settings locally."""
    # Validate API base URL if provided
    if payload.api_base:
        url_err = validate_api_base(payload.api_base)
        if url_err:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid API base URL: {url_err}",
            )

    try:
        config_manager.update_settings(
            provider=payload.provider,
            model=payload.model,
            api_key=payload.api_key,
            api_base=payload.api_base,
        )
        return config_manager.get_public_settings()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save settings: {str(e)}",
        )


@app.post("/api/settings/test", response_model=TestConnectionResponse)
def test_settings(payload: TestConnectionRequest):
    """Test connection to the AI provider with supplied or saved credentials."""
    return test_ai_connection(
        provider=payload.provider,
        model=payload.model,
        api_key=payload.api_key,
        api_base=payload.api_base,
    )


# Serve Static Frontend in Production / Docker
# Look for built frontend in dist directory
STATIC_DIR = Path(os.environ.get("REPOHUNTER_STATIC_DIR", Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"))

if STATIC_DIR.exists() and (STATIC_DIR / "index.html").exists():
    # Mount assets directory for css/js chunks
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    # SPA catch-all fallback
    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        file_path = STATIC_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(STATIC_DIR / "index.html"))
