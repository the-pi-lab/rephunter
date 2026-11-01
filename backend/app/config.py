"""Persistent configuration manager for RepoHunter."""

import json
import os
import threading
from pathlib import Path
from typing import Dict, Any, List, Optional
from .models import ProviderOption, SettingsResponse
from .security import mask_api_key

CONFIG_DIR = Path(os.environ.get("REPOHUNTER_DATA_DIR", "./data"))
CONFIG_FILE = CONFIG_DIR / "settings.json"

DEFAULT_PROVIDERS: List[ProviderOption] = [
    ProviderOption(
        id="openai",
        name="OpenAI",
        default_model="gpt-4o-mini",
        available_models=["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
        requires_api_key=True,
        requires_base_url=False,
        base_url_placeholder="https://api.openai.com/v1",
        description="Industry standard LLMs (GPT-4o, GPT-4o-mini)",
    ),
    ProviderOption(
        id="gemini",
        name="Google Gemini",
        default_model="gemini/gemini-2.5-flash",
        available_models=["gemini/gemini-2.5-flash", "gemini/gemini-2.0-flash", "gemini/gemini-1.5-flash", "gemini/gemini-1.5-pro"],
        requires_api_key=True,
        requires_base_url=False,
        base_url_placeholder=None,
        description="Google Gemini models with fast inference and high context",
    ),
    ProviderOption(
        id="anthropic",
        name="Anthropic Claude",
        default_model="claude-3-5-haiku-20241022",
        available_models=["claude-3-5-haiku-20241022", "claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
        requires_api_key=True,
        requires_base_url=False,
        base_url_placeholder=None,
        description="High quality reasoning and code comprehension by Anthropic",
    ),
    ProviderOption(
        id="groq",
        name="Groq",
        default_model="groq/llama-3.3-70b-versatile",
        available_models=["groq/llama-3.3-70b-versatile", "groq/llama-3.1-8b-instant", "groq/mixtral-8x7b-32768"],
        requires_api_key=True,
        requires_base_url=False,
        base_url_placeholder="https://api.groq.com/openai/v1",
        description="Ultra-fast LPU inference for open source models",
    ),
    ProviderOption(
        id="deepseek",
        name="DeepSeek",
        default_model="deepseek/deepseek-chat",
        available_models=["deepseek/deepseek-chat", "deepseek/deepseek-reasoner"],
        requires_api_key=True,
        requires_base_url=False,
        base_url_placeholder="https://api.deepseek.com",
        description="High-performance open weights models with strong reasoning",
    ),
    ProviderOption(
        id="mistral",
        name="Mistral AI",
        default_model="mistral/mistral-small-latest",
        available_models=["mistral/mistral-small-latest", "mistral/mistral-large-latest", "mistral/codestral-latest"],
        requires_api_key=True,
        requires_base_url=False,
        base_url_placeholder="https://api.mistral.ai/v1",
        description="Efficient and capable European open-weights AI foundation",
    ),
    ProviderOption(
        id="openrouter",
        name="OpenRouter",
        default_model="openrouter/meta-llama/llama-3.3-70b-instruct",
        available_models=[
            "openrouter/meta-llama/llama-3.3-70b-instruct",
            "openrouter/google/gemini-2.0-flash-001",
            "openrouter/anthropic/claude-3.5-haiku",
            "openrouter/deepseek/deepseek-chat"
        ],
        requires_api_key=True,
        requires_base_url=False,
        base_url_placeholder="https://openrouter.ai/api/v1",
        description="Unified gateway to dozens of LLM providers with one key",
    ),
    ProviderOption(
        id="ollama",
        name="Ollama (Local / Self-Hosted)",
        default_model="ollama/llama3.2",
        available_models=["ollama/llama3.2", "ollama/llama3", "ollama/mistral", "ollama/qwen2.5-coder", "ollama/phi3"],
        requires_api_key=False,
        requires_base_url=True,
        base_url_placeholder="http://host.docker.internal:11434 (or http://localhost:11434)",
        description="Run local models without sending data externally (no API key needed)",
    ),
    ProviderOption(
        id="custom",
        name="Custom OpenAI-Compatible",
        default_model="custom-model",
        available_models=["custom-model"],
        requires_api_key=False,
        requires_base_url=True,
        base_url_placeholder="http://vllm-or-localai:8000/v1",
        description="Connect to any OpenAI-compatible server (vLLM, LocalAI, TGI, LM Studio)",
    ),
]


class ConfigManager:
    """Thread-safe configuration manager stored in persistent JSON file."""

    def __init__(self):
        self._lock = threading.Lock()
        self._config: Dict[str, Any] = {}
        self._init_defaults()
        self._load_from_disk()

    def _init_defaults(self):
        # Default fallback to OpenAI gpt-4o-mini or environment variables if present
        env_provider = os.environ.get("AI_PROVIDER", "openai").lower()
        env_model = os.environ.get("AI_MODEL", "gpt-4o-mini")
        env_key = os.environ.get("AI_API_KEY", "")
        env_base = os.environ.get("AI_API_BASE", "")

        self._config = {
            "provider": env_provider,
            "model": env_model,
            "api_key": env_key,
            "api_base": env_base or None,
        }

    def _load_from_disk(self):
        try:
            CONFIG_DIR.mkdir(parents=True, exist_ok=True)
            if CONFIG_FILE.exists():
                with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        # Merge loaded data with existing defaults
                        self._config.update(data)
        except Exception as e:
            print(f"[ConfigManager] Warning: failed to load config file: {e}")

    def _save_to_disk(self):
        try:
            CONFIG_DIR.mkdir(parents=True, exist_ok=True)
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump(self._config, f, indent=2)
        except Exception as e:
            print(f"[ConfigManager] Error: failed to save config file: {e}")
            raise

    def get_config(self) -> Dict[str, Any]:
        with self._lock:
            return dict(self._config)

    def get_public_settings(self) -> SettingsResponse:
        with self._lock:
            provider = self._config.get("provider", "openai")
            model = self._config.get("model", "gpt-4o-mini")
            api_base = self._config.get("api_base")
            raw_key = self._config.get("api_key", "")
            has_api_key = bool(raw_key and raw_key.strip())
            masked = mask_api_key(raw_key) if has_api_key else None

            return SettingsResponse(
                provider=provider,
                model=model,
                api_base=api_base,
                has_api_key=has_api_key,
                masked_api_key=masked,
                available_providers=DEFAULT_PROVIDERS,
            )

    def update_settings(self, provider: str, model: str, api_key: Optional[str] = None, api_base: Optional[str] = None):
        with self._lock:
            self._config["provider"] = provider.strip()
            self._config["model"] = model.strip()
            
            # If api_key is explicitly provided (not None), update it
            if api_key is not None:
                # If non-empty, set it; if empty string, it could mean clear key or keep depending on UI
                if api_key.strip():
                    self._config["api_key"] = api_key.strip()
                elif api_key == "__CLEAR__":
                    self._config["api_key"] = ""
            
            self._config["api_base"] = api_base.strip() if api_base and api_base.strip() else None
            self._save_to_disk()


config_manager = ConfigManager()
