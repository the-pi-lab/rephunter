"""Security utilities: SSRF protection, input sanitization, rate limiting, and API key masking."""

import html
import re
import time
from collections import defaultdict
from typing import Dict, List, Optional
from urllib.parse import urlparse
import ipaddress


BLOCKED_HOSTNAMES = {
    "169.254.169.254",          # AWS/GCP/Azure link-local metadata
    "metadata.google.internal",  # GCP metadata
    "100.100.100.200",          # Alibaba Cloud metadata
    "instance-data",            # AWS legacy metadata
}


def mask_api_key(key: Optional[str]) -> Optional[str]:
    """Return a masked representation of an API key for safe UI display.
    
    Example: 'sk-proj-123456789abcdef' -> 'sk-...cdef'
    """
    if not key:
        return None
    key = key.strip()
    if len(key) <= 8:
        return "••••••••"
    prefix = key[:3]
    suffix = key[-4:]
    return f"{prefix}••••••••{suffix}"


def validate_api_base(url: Optional[str]) -> Optional[str]:
    """Validate a custom API base URL to guard against SSRF and malformed URLs.
    
    Returns None if valid, or an error string if invalid.
    """
    if not url or not url.strip():
        return None
    
    url = url.strip()
    try:
        parsed = urlparse(url)
    except Exception:
        return "Invalid URL format"

    if parsed.scheme not in ("http", "https"):
        return "API base URL must use http or https scheme"

    hostname = (parsed.hostname or "").lower().strip()
    if not hostname:
        return "Invalid hostname in API base URL"

    if hostname in BLOCKED_HOSTNAMES:
        return "Access to cloud metadata endpoints is prohibited"

    # Check for link-local or loopback metadata spoofing
    try:
        ip = ipaddress.ip_address(hostname)
        if ip.is_link_local:
            return "Access to link-local IP addresses is prohibited"
        if ip.is_multicast:
            return "Access to multicast IP addresses is prohibited"
    except ValueError:
        # Not an IP address, domain name is allowed
        pass

    return None


def sanitize_text(text: Optional[str], max_len: int = 1500) -> str:
    """Sanitize untrusted text: strips dangerous characters, trims length, escapes HTML."""
    if not text:
        return ""
    # Strip null bytes and control chars except newlines and tabs
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    cleaned = cleaned.strip()
    if len(cleaned) > max_len:
        cleaned = cleaned[:max_len] + "..."
    # Escape HTML entities to prevent stored or reflected XSS
    return html.escape(cleaned)


class RateLimiter:
    """Simple in-memory sliding window rate limiter per client IP."""
    
    def __init__(self, max_requests: int = 15, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, List[float]] = defaultdict(list)

    def is_allowed(self, client_ip: str) -> bool:
        now = time.time()
        cutoff = now - self.window_seconds
        # Clean older entries
        self.requests[client_ip] = [t for t in self.requests[client_ip] if t > cutoff]
        
        if len(self.requests[client_ip]) >= self.max_requests:
            return False
            
        self.requests[client_ip].append(now)
        return True

    def retry_after(self, client_ip: str) -> int:
        now = time.time()
        cutoff = now - self.window_seconds
        valid_requests = [t for t in self.requests.get(client_ip, []) if t > cutoff]
        if not valid_requests:
            return 0
        oldest = min(valid_requests)
        return max(1, int(self.window_seconds - (now - oldest)))


# Global rate limiter for AI analysis endpoint (15 requests/min per IP)
analysis_rate_limiter = RateLimiter(max_requests=15, window_seconds=60)
