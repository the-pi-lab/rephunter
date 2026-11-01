"""Unit tests for RepoHunter security utilities."""

import pytest
from app.security import mask_api_key, validate_api_base, sanitize_text, RateLimiter


def test_mask_api_key():
    assert mask_api_key(None) is None
    assert mask_api_key("") is None
    assert mask_api_key("sk-123456789abcdef") == "sk-••••••••cdef"
    assert mask_api_key("short") == "••••••••"


def test_validate_api_base():
    # Valid URLs
    assert validate_api_base(None) is None
    assert validate_api_base("") is None
    assert validate_api_base("http://localhost:11434") is None
    assert validate_api_base("https://api.openai.com/v1") is None
    assert validate_api_base("http://host.docker.internal:11434") is None

    # Invalid schemes
    assert validate_api_base("ftp://example.com") is not None
    assert validate_api_base("file:///etc/passwd") is not None

    # Blocked metadata IPs / hostnames
    assert "metadata" in validate_api_base("http://169.254.169.254/latest/meta-data")
    assert "metadata" in validate_api_base("http://metadata.google.internal")


def test_sanitize_text():
    assert sanitize_text(None) == ""
    assert sanitize_text("  hello world  ") == "hello world"
    # Null byte removal
    assert sanitize_text("bad\x00data") == "baddata"
    # HTML escaping
    assert sanitize_text("<script>alert(1)</script>") == "&lt;script&gt;alert(1)&lt;/script&gt;"
    # Length truncating
    long_text = "a" * 2000
    sanitized = sanitize_text(long_text, max_len=100)
    assert len(sanitized) == 103  # 100 + "..."


def test_rate_limiter():
    limiter = RateLimiter(max_requests=3, window_seconds=10)
    ip = "192.168.1.100"

    assert limiter.is_allowed(ip) is True
    assert limiter.is_allowed(ip) is True
    assert limiter.is_allowed(ip) is True
    # 4th request in window should be blocked
    assert limiter.is_allowed(ip) is False
    assert limiter.retry_after(ip) > 0

    # Other IP is unaffected
    assert limiter.is_allowed("192.168.1.101") is True
