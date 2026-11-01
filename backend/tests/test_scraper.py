"""Unit tests for GitHub Trending scraper logic."""

from app.scraper import _clean_number, get_languages, POPULAR_LANGUAGES
from bs4 import BeautifulSoup
from app.models import TrendingRepo


def test_clean_number():
    assert _clean_number(None) == 0
    assert _clean_number("") == 0
    assert _clean_number("123") == 123
    assert _clean_number(" 1,450 ") == 1450
    assert _clean_number("12.5k") == 12500
    assert _clean_number("2K") == 2000
    assert _clean_number("invalid") == 0


def test_get_languages():
    languages = get_languages()
    assert len(languages) > 10
    slugs = [l.slug for l in languages]
    assert "" in slugs  # All languages
    assert "python" in slugs
    assert "typescript" in slugs
    assert "rust" in slugs


def test_parser_sample_html():
    sample_html = """
    <article class="Box-row">
        <h2 class="h3 lh-condensed">
            <a href="/anthropics/claude-code">
                <span>anthropics / </span>claude-code
            </a>
        </h2>
        <p class="col-9 color-fg-muted my-1 pr-4">An agentic coding tool by Anthropic</p>
        <div class="f6 color-fg-muted mt-2">
            <span class="d-inline-block ml-0 mr-3">
                <span class="repo-language-color" style="background-color: #3178c6"></span>
                <span itemprop="programmingLanguage">TypeScript</span>
            </span>
            <a href="/anthropics/claude-code/stargazers" class="LinkLink--muted d-inline-block mr-3">
                12,500
            </a>
            <a href="/anthropics/claude-code/forks" class="LinkLink--muted d-inline-block mr-3">
                850
            </a>
            <span class="d-inline-block float-sm-right">
                450 stars today
            </span>
        </div>
    </article>
    """
    soup = BeautifulSoup(sample_html, "html.parser")
    art = soup.find("article", class_="Box-row")
    assert art is not None

    h2_tag = art.find("h2")
    a_tag = h2_tag.find("a")
    repo_path = a_tag["href"].strip().strip("/")
    parts = repo_path.split("/")
    owner, repo_name = parts[0], parts[1]
    assert owner == "anthropics"
    assert repo_name == "claude-code"

    desc = art.find("p").get_text(strip=True)
    assert "agentic coding tool" in desc

    lang = art.find("span", itemprop="programmingLanguage").get_text(strip=True)
    assert lang == "TypeScript"

    stars = _clean_number(art.find("a", href=lambda h: h and h.endswith("/stargazers")).get_text(strip=True))
    assert stars == 12500

    forks = _clean_number(art.find("a", href=lambda h: h and h.endswith("/forks")).get_text(strip=True))
    assert forks == 850
