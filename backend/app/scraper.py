"""GitHub Trending Scraper with caching, resilient error handling, and language lists."""

import re
import time
import urllib.parse
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
import requests
from bs4 import BeautifulSoup

from .models import TrendingRepo, TrendingResponse, LanguageItem
from .security import sanitize_text

# Popular languages list for filtering
POPULAR_LANGUAGES: List[LanguageItem] = [
    LanguageItem(name="All Languages", slug=""),
    LanguageItem(name="Python", slug="python"),
    LanguageItem(name="TypeScript", slug="typescript"),
    LanguageItem(name="JavaScript", slug="javascript"),
    LanguageItem(name="Rust", slug="rust"),
    LanguageItem(name="Go", slug="go"),
    LanguageItem(name="C++", slug="c++"),
    LanguageItem(name="C", slug="c"),
    LanguageItem(name="C#", slug="c#"),
    LanguageItem(name="Java", slug="java"),
    LanguageItem(name="PHP", slug="php"),
    LanguageItem(name="Ruby", slug="ruby"),
    LanguageItem(name="Swift", slug="swift"),
    LanguageItem(name="Kotlin", slug="kotlin"),
    LanguageItem(name="Dart", slug="dart"),
    LanguageItem(name="Zig", slug="zig"),
    LanguageItem(name="Elixir", slug="elixir"),
    LanguageItem(name="Lua", slug="lua"),
    LanguageItem(name="Scala", slug="scala"),
    LanguageItem(name="Haskell", slug="haskell"),
    LanguageItem(name="Shell", slug="shell"),
    LanguageItem(name="HTML", slug="html"),
    LanguageItem(name="CSS", slug="css"),
    LanguageItem(name="Jupyter Notebook", slug="jupyter-notebook"),
    LanguageItem(name="R", slug="r"),
    LanguageItem(name="Julia", slug="julia"),
    LanguageItem(name="Solidity", slug="solidity"),
    LanguageItem(name="Vue", slug="vue"),
    LanguageItem(name="Svelte", slug="svelte"),
]

# Browser headers to emulate standard navigation
REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://github.com/",
}

# In-memory cache: (since, language) -> (timestamp, List[TrendingRepo])
CACHE_TTL_SECONDS = 300  # 5 minutes
_trending_cache: Dict[Tuple[str, str], Tuple[float, List[TrendingRepo]]] = {}


def _clean_number(text: Optional[str]) -> int:
    """Parse string number with commas or 'k' suffix into an integer."""
    if not text:
        return 0
    clean = text.strip().replace(",", "")
    if clean.endswith("k") or clean.endswith("K"):
        try:
            return int(float(clean[:-1]) * 1000)
        except ValueError:
            return 0
    try:
        return int(clean)
    except ValueError:
        return 0


def fetch_trending(
    since: str = "daily",
    language: Optional[str] = None,
    force_refresh: bool = False,
    timeout_sec: int = 10,
) -> TrendingResponse:
    """Scrapes GitHub trending repositories for the given since period and language."""
    # Normalize since
    since = since.lower().strip()
    if since not in ("daily", "weekly", "monthly"):
        since = "daily"

    # Normalize language
    lang_slug = (language or "").strip().lower()
    # Handle language slug URL encoding (e.g. c++ -> c%2B%2B or c# -> c%23)
    cache_key = (since, lang_slug)
    now = time.time()

    # Check cache if not forcing refresh
    if not force_refresh and cache_key in _trending_cache:
        cached_time, cached_repos = _trending_cache[cache_key]
        if now - cached_time < CACHE_TTL_SECONDS:
            return TrendingResponse(
                since=since,
                language=lang_slug or None,
                count=len(cached_repos),
                repositories=cached_repos,
                cached=True,
                timestamp=datetime.fromtimestamp(cached_time, tz=timezone.utc).isoformat(),
            )

    # Build GitHub trending URL
    base_url = "https://github.com/trending"
    if lang_slug:
        encoded_lang = urllib.parse.quote(lang_slug)
        url = f"{base_url}/{encoded_lang}?since={since}"
    else:
        url = f"{base_url}?since={since}"

    try:
        response = requests.get(url, headers=REQUEST_HEADERS, timeout=timeout_sec)
        response.raise_for_status()
        html_content = response.text
    except Exception as e:
        # If request failed but we have a stale cache, return it with a note
        if cache_key in _trending_cache:
            cached_time, cached_repos = _trending_cache[cache_key]
            return TrendingResponse(
                since=since,
                language=lang_slug or None,
                count=len(cached_repos),
                repositories=cached_repos,
                cached=True,
                timestamp=datetime.fromtimestamp(cached_time, tz=timezone.utc).isoformat(),
            )
        raise RuntimeError(f"Failed to fetch GitHub trending ({type(e).__name__}): {e}")

    # Parse HTML using BeautifulSoup
    soup = BeautifulSoup(html_content, "html.parser")
    articles = soup.find_all("article", class_="Box-row")

    repos: List[TrendingRepo] = []

    for art in articles:
        try:
            # 1. Repository name and owner
            h2_tag = art.find("h2")
            if not h2_tag:
                continue
            a_tag = h2_tag.find("a")
            if not a_tag or not a_tag.get("href"):
                continue

            repo_path = a_tag["href"].strip().strip("/")
            parts = repo_path.split("/")
            if len(parts) >= 2:
                owner, repo_name = parts[0], parts[1]
                full_name = f"{owner}/{repo_name}"
            else:
                full_name = repo_path
                owner = parts[0] if parts else ""
                repo_name = repo_path

            repo_url = f"https://github.com/{full_name}"

            # 2. Description
            p_desc = art.find("p")
            raw_desc = p_desc.get_text(strip=True) if p_desc else ""
            clean_desc = sanitize_text(raw_desc, max_len=1000)

            # 3. Programming language & color
            lang_span = art.find("span", itemprop="programmingLanguage")
            language_name = lang_span.get_text(strip=True) if lang_span else None
            
            lang_color = None
            color_span = art.find("span", class_="repo-language-color")
            if color_span and color_span.get("style"):
                # e.g., style="background-color: #3572A5"
                color_match = re.search(r"#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}", color_span["style"])
                if color_match:
                    lang_color = color_match.group(0)

            # 4. Total Stars and Forks
            stargazers_tag = art.find("a", href=lambda h: h and h.endswith("/stargazers"))
            stars_count = _clean_number(stargazers_tag.get_text(strip=True)) if stargazers_tag else 0

            forks_tag = art.find("a", href=lambda h: h and h.endswith("/forks"))
            forks_count = _clean_number(forks_tag.get_text(strip=True)) if forks_tag else 0

            # 5. Period stars (e.g., "1,234 stars today" or "450 stars this week")
            period_stars_span = art.find("span", class_="float-sm-right")
            if not period_stars_span:
                # Alternate selector on some GitHub layouts
                period_stars_span = art.find("span", class_="d-inline-block float-sm-right")
            period_stars = period_stars_span.get_text(strip=True) if period_stars_span else None

            # 6. Built by avatars
            # The "Built by" span contains nested child elements (the avatar
            # anchors), so its `.string` is None and `find(string=...)` never
            # matches. Match on the element's full text instead.
            built_by: List[str] = []
            built_by_container = None
            for span in art.find_all("span"):
                if span.get_text() and re.search(r"Built by", span.get_text(), re.I):
                    built_by_container = span
                    break
            if built_by_container:
                for img in built_by_container.find_all("img"):
                    src = img.get("src")
                    if src and "avatars.githubusercontent.com" in src:
                        built_by.append(src)

            repos.append(
                TrendingRepo(
                    name=full_name,
                    owner=owner,
                    repo=repo_name,
                    description=clean_desc if clean_desc else None,
                    language=language_name,
                    language_color=lang_color,
                    stars=stars_count,
                    forks=forks_count,
                    period_stars=period_stars,
                    url=repo_url,
                    built_by=built_by[:5],  # top 5 contributors
                )
            )
        except Exception as item_err:
            # Skip single broken item rather than crashing entire scrape
            continue

    # Update cache
    _trending_cache[cache_key] = (now, repos)

    return TrendingResponse(
        since=since,
        language=lang_slug or None,
        count=len(repos),
        repositories=repos,
        cached=False,
        timestamp=datetime.fromtimestamp(now, tz=timezone.utc).isoformat(),
    )


def get_languages() -> List[LanguageItem]:
    """Return the curated list of popular programming languages."""
    return POPULAR_LANGUAGES
