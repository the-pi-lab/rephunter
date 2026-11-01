"""Data models for RepoHunter API."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class TrendingRepo(BaseModel):
    name: str = Field(..., description="Full repository name: owner/repo")
    owner: str = Field(..., description="Repository owner")
    repo: str = Field(..., description="Repository name")
    description: Optional[str] = Field(None, description="Repository description")
    language: Optional[str] = Field(None, description="Primary programming language")
    language_color: Optional[str] = Field(None, description="Hex color code for the language")
    stars: int = Field(0, description="Total stargazers count")
    forks: int = Field(0, description="Total forks count")
    period_stars: Optional[str] = Field(None, description="Stars gained in the selected period (e.g., '350 stars today')")
    url: str = Field(..., description="GitHub repository URL")
    built_by: List[str] = Field(default_factory=list, description="Avatar URLs of top contributors")


class TrendingResponse(BaseModel):
    since: str
    language: Optional[str] = None
    count: int
    repositories: List[TrendingRepo]
    cached: bool = False
    timestamp: str


class LanguageItem(BaseModel):
    name: str
    slug: str


class LanguagesResponse(BaseModel):
    languages: List[LanguageItem]


class AnalysisRequest(BaseModel):
    repo: str = Field(..., min_length=1, max_length=150, description="owner/repo")
    description: Optional[str] = Field(None, max_length=1000)
    language: Optional[str] = Field(None, max_length=50)
    stars: Optional[int] = Field(0, ge=0)
    forks: Optional[int] = Field(0, ge=0)
    url: Optional[str] = Field(None, max_length=300)
    period_stars: Optional[str] = Field(None, max_length=100)


class AnalysisResponse(BaseModel):
    repo: str
    what_it_does: str
    why_trending: str
    use_cases: List[str]
    target_audience: str
    technical_summary: str
    model_used: str
    analyzed_at: str


class ProviderOption(BaseModel):
    id: str
    name: str
    default_model: str
    available_models: List[str]
    requires_api_key: bool
    requires_base_url: bool
    base_url_placeholder: Optional[str] = None
    description: str


class SettingsUpdateRequest(BaseModel):
    provider: str = Field(..., description="Provider ID (e.g. openai, gemini, anthropic, ollama, groq)")
    model: str = Field(..., description="Model identifier")
    api_key: Optional[str] = Field(None, description="New API key or None/empty to keep existing")
    api_base: Optional[str] = Field(None, description="Custom API base URL")


class SettingsResponse(BaseModel):
    provider: str
    model: str
    api_base: Optional[str] = None
    has_api_key: bool
    masked_api_key: Optional[str] = None
    available_providers: List[ProviderOption]


class TestConnectionRequest(BaseModel):
    provider: Optional[str] = None
    model: Optional[str] = None
    api_key: Optional[str] = None
    api_base: Optional[str] = None


class TestConnectionResponse(BaseModel):
    success: bool
    message: str
    details: Optional[str] = None
    model_used: Optional[str] = None
