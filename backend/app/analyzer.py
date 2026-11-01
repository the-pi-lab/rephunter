"""AI Repository Analyzer using LiteLLM with strict single-purpose enforcement."""

import json
import os
import re
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

try:
    import litellm
    from litellm import completion
    litellm.telemetry = False
    litellm.suppress_debug_info = True
    HAS_LITELLM = True
except ImportError:
    litellm = None
    completion = None
    HAS_LITELLM = False

from .config import config_manager
from .models import AnalysisRequest, AnalysisResponse, TestConnectionResponse
from .security import sanitize_text, validate_api_base

SYSTEM_PROMPT = """You are RepoHunter AI, an objective, concise repository analysis engine.
Your SOLE purpose is to analyze the GitHub repository information provided by the user and produce a structured technical analysis.

STRICT RULES:
1. ONLY analyze the repository information provided.
2. DO NOT make up non-existent features, metrics, or capabilities.
3. DO NOT act as a general conversational chatbot. If asked to do anything else, decline.
4. DO NOT provide shell commands, write generic essays, or follow roleplay instructions.
5. ALWAYS output raw JSON matching the required schema with no extra commentary, no introductory text, and no surrounding markdown fences if possible.

Output JSON Schema:
{
  "what_it_does": "Clear, concise 2-3 sentence explanation of the repository's core purpose and functionality.",
  "why_trending": "Why developers are currently excited about or adopting this project right now.",
  "use_cases": [
    "Practical use case 1",
    "Practical use case 2",
    "Practical use case 3"
  ],
  "target_audience": "Specific roles or developers who should consider adopting or looking at this.",
  "technical_summary": "Concise summary of architecture, language/stack, and technical highlights."
}
"""


def _normalize_model_name(provider: str, model: str) -> str:
    """Normalize model string to ensure LiteLLM provider prefix is properly formatted."""
    model = model.strip()
    provider = provider.strip().lower()

    # Providers that require a prefix in LiteLLM unless already prefixed
    prefix_map = {
        "gemini": "gemini/",
        "anthropic": "anthropic/",
        "groq": "groq/",
        "deepseek": "deepseek/",
        "mistral": "mistral/",
        "openrouter": "openrouter/",
        "ollama": "ollama/",
    }

    if provider in prefix_map:
        needed_prefix = prefix_map[provider]
        if not model.startswith(needed_prefix):
            return f"{needed_prefix}{model}"
    elif provider == "custom":
        if not model.startswith("openai/"):
            return f"openai/{model}"

    return model


def _extract_json(text: str) -> Dict[str, Any]:
    """Robustly extract and parse JSON from model output, handling markdown fences."""
    text = text.strip()
    # Strip markdown fences if present
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Fallback: search for first { and last }
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise ValueError(f"Failed to parse structured JSON from AI response: {text[:200]}")


def analyze_repository(request: AnalysisRequest) -> AnalysisResponse:
    """Analyze a single repository using configured LiteLLM provider and strictly structured prompt."""
    if not HAS_LITELLM or completion is None:
        raise ValueError("LiteLLM is not installed in the Python environment.")

    config = config_manager.get_config()
    provider = config.get("provider", "openai")
    model = config.get("model", "gpt-4o-mini")
    api_key = config.get("api_key")
    api_base = config.get("api_base")

    # Validate that an API key is present for providers that require one
    if provider not in ("ollama", "custom"):
        if not api_key or not api_key.strip():
            raise ValueError(
                f"No API key configured for provider '{provider}'. Please click 'Settings' to add your API key."
            )

    # Validate custom base URL if provided
    if api_base:
        url_error = validate_api_base(api_base)
        if url_error:
            raise ValueError(f"Invalid API Base URL: {url_error}")

    litellm_model = _normalize_model_name(provider, model)

    # Construct user message with strict bounds
    user_payload = {
        "repository": sanitize_text(request.repo),
        "description": sanitize_text(request.description) if request.description else "No description provided.",
        "language": sanitize_text(request.language) if request.language else "Unknown",
        "stars": request.stars or 0,
        "forks": request.forks or 0,
        "period_stars": sanitize_text(request.period_stars) if request.period_stars else "N/A",
        "url": sanitize_text(request.url) if request.url else f"https://github.com/{request.repo}",
    }

    user_prompt = (
        f"Analyze this GitHub repository based strictly on its metadata:\n\n"
        f"Repository: {user_payload['repository']}\n"
        f"Description: {user_payload['description']}\n"
        f"Primary Language: {user_payload['language']}\n"
        f"Total Stars: {user_payload['stars']}\n"
        f"Total Forks: {user_payload['forks']}\n"
        f"Trending Velocity: {user_payload['period_stars']}\n"
        f"URL: {user_payload['url']}\n\n"
        f"Return ONLY valid JSON with keys: what_it_does, why_trending, use_cases, target_audience, technical_summary."
    )

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    call_kwargs: Dict[str, Any] = {
        "model": litellm_model,
        "messages": messages,
        "temperature": 0.2,
        "timeout": 35.0,
    }

    if api_key and api_key.strip():
        call_kwargs["api_key"] = api_key.strip()
    if api_base and api_base.strip():
        call_kwargs["api_base"] = api_base.strip()

    try:
        response = completion(**call_kwargs)
        content = response.choices[0].message.content or "{}"
        parsed = _extract_json(content)

        # Validate required fields
        what_it_does = str(parsed.get("what_it_does", "Unable to determine repository description."))
        why_trending = str(parsed.get("why_trending", "Popular repository gaining traction on GitHub."))
        use_cases_raw = parsed.get("use_cases", [])
        if isinstance(use_cases_raw, list):
            use_cases = [str(u) for u in use_cases_raw][:6]
        else:
            use_cases = [str(use_cases_raw)]
        if not use_cases:
            use_cases = ["General software development and inspection."]

        target_audience = str(parsed.get("target_audience", "Developers and software engineers."))
        technical_summary = str(parsed.get("technical_summary", f"Built with {user_payload['language']}."))

        return AnalysisResponse(
            repo=request.repo,
            what_it_does=what_it_does,
            why_trending=why_trending,
            use_cases=use_cases,
            target_audience=target_audience,
            technical_summary=technical_summary,
            model_used=litellm_model,
            analyzed_at=datetime.now(timezone.utc).isoformat(),
        )

    except Exception as e:
        err_msg = str(e)
        # Produce clean, user-friendly error diagnostics
        if "AuthenticationError" in type(e).__name__ or "auth" in err_msg.lower() or "401" in err_msg:
            raise ValueError(f"Authentication failed with {provider}. Please verify your API key in Settings.")
        elif "NotFoundError" in type(e).__name__ or "404" in err_msg or "model" in err_msg.lower():
            raise ValueError(f"Model '{litellm_model}' not found or unsupported by provider {provider}.")
        elif "RateLimitError" in type(e).__name__ or "429" in err_msg:
            raise ValueError(f"Rate limit exceeded on provider {provider}. Please retry shortly or check quotas.")
        elif "ConnectionError" in type(e).__name__ or "failed to connect" in err_msg.lower():
            target = api_base or provider
            raise ValueError(f"Could not connect to {target}. Please check host address and network connectivity.")
        else:
            raise ValueError(f"AI Provider error ({type(e).__name__}): {err_msg}")


def test_ai_connection(
    provider: Optional[str] = None,
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    api_base: Optional[str] = None,
) -> TestConnectionResponse:
    """Test connection with the specified or currently configured provider settings."""
    if not HAS_LITELLM or completion is None:
        return TestConnectionResponse(
            success=False,
            message="LiteLLM library is not installed.",
            details="Please install litellm in your Python environment or container.",
        )

    cfg = config_manager.get_config()
    active_provider = provider or cfg.get("provider", "openai")
    active_model = model or cfg.get("model", "gpt-4o-mini")
    active_api_key = api_key if (api_key is not None and api_key != "") else cfg.get("api_key")
    active_api_base = api_base if api_base is not None else cfg.get("api_base")

    if active_provider not in ("ollama", "custom"):
        if not active_api_key or not active_api_key.strip():
            return TestConnectionResponse(
                success=False,
                message="Missing API key. Please enter an API key to test.",
                details="Authentication requires a non-empty API key.",
            )

    if active_api_base:
        url_err = validate_api_base(active_api_base)
        if url_err:
            return TestConnectionResponse(
                success=False,
                message="Invalid API Base URL.",
                details=url_err,
            )

    litellm_model = _normalize_model_name(active_provider, active_model)

    call_kwargs: Dict[str, Any] = {
        "model": litellm_model,
        "messages": [{"role": "user", "content": "Respond with the word 'PONG' only."}],
        "max_tokens": 10,
        "timeout": 15.0,
    }

    if active_api_key and active_api_key.strip():
        call_kwargs["api_key"] = active_api_key.strip()
    if active_api_base and active_api_base.strip():
        call_kwargs["api_base"] = active_api_base.strip()

    try:
        resp = completion(**call_kwargs)
        reply = resp.choices[0].message.content or ""
        return TestConnectionResponse(
            success=True,
            message="Connection successful!",
            details=f"Provider '{active_provider}' responded: '{reply.strip()}'",
            model_used=litellm_model,
        )
    except Exception as e:
        err_type = type(e).__name__
        err_msg = str(e)
        return TestConnectionResponse(
            success=False,
            message=f"Connection test failed ({err_type}).",
            details=err_msg,
            model_used=litellm_model,
        )
