# RepoHunter 🎯

> **Minimal, self-hosted single-purpose AI agent that discovers GitHub trending repositories and uses LLMs to explain them.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ed.svg?logo=docker)](Dockerfile)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2019%20+%20Vite-61dafb.svg?logo=react)](https://react.dev)
[![LiteLLM](https://img.shields.io/badge/AI%20Engine-LiteLLM-8A2BE2.svg)](https://docs.litellm.ai)

---

## 1. Product Philosophy

RepoHunter is designed around one strict mission: **Discover trending GitHub repositories and generate concise, structured AI analyses of what they do, why developers care, and how they work.**

- **Strictly Single-Purpose**: This is not a general-purpose chatbot, web browser, or autonomous agent. The AI can **only** analyze repository metadata provided by the system.
- **Zero-Config Discovery**: Browsing trending repositories requires **no GitHub token** and **no AI API key**.
- **Universal Provider Support**: Powered by [LiteLLM](https://docs.litellm.ai), connect to OpenAI, Anthropic Claude, Google Gemini, Groq, DeepSeek, Mistral, OpenRouter, or **100% local Ollama** with zero code modifications.
- **Privacy & Security First**: API keys never leave your server, are never logged, and are never exposed to client-side JavaScript.
- **One-Command Deployment**: Ships as a single self-contained multi-stage Docker container serving both the API and the React SPA.

---

## 2. Quickstart: One-Command Self-Hosting

Deploy the complete application with Docker Compose:

```bash
# 1. Clone repository
git clone https://github.com/USERNAME/repohunter.git
cd repohunter

# 2. Build and run in detached mode
docker compose up -d --build
```

The application is now live at:

👉 **[http://localhost:3000](http://localhost:3000)**

That's it! Trending repositories will load immediately.

---

## 3. Core Features

### 🔍 GitHub Trending Discovery
- **Time Horizons**: Switch instantly between **Daily** (`Today`), **Weekly** (`This week`), and **Monthly** (`This month`).
- **Language Filtering**: Filter trending repositories across 30+ popular languages (Python, TypeScript, Rust, Go, C++, Zig, etc.).
- **Live Search**: Instant client-side filtering by repository title, owner, or description keywords.
- **Rich Metadata**: Stargazers, total forks, stars velocity (e.g. `+450 stars today`), primary language dot color, and top contributor avatars.
- **Resilient & Cached**: Built-in 5-minute memory caching and graceful fallback handling to prevent GitHub rate limits and temporary outages.

### 🧠 AI Repository Analysis
Click **"Explain with AI"** on any repository card to generate a structured technical breakdown:
1. **What It Does**: Core purpose, value proposition, and functionality.
2. **Why It's Trending**: Current momentum, ecosystem catalysts, and why developers are adopting it.
3. **Key Use Cases**: 3-5 concrete real-world use cases.
4. **Target Audience**: Specific roles and engineers who benefit most from the project.
5. **Technical Summary**: Architecture highlights, languages, and structural patterns.
6. **Markdown Export**: 1-click button to copy the structured analysis directly to your clipboard as clean Markdown.

---

## 4. Universal AI Provider Configuration

RepoHunter supports **9+ AI providers** out of the box via LiteLLM:

| Provider | Recommended Models | API Key Needed? | Custom Base URL |
| :--- | :--- | :---: | :--- |
| **OpenAI** | `gpt-4o-mini`, `gpt-4o` | Yes | Optional |
| **Google Gemini** | `gemini/gemini-2.5-flash`, `gemini/gemini-2.0-flash` | Yes | Not needed |
| **Anthropic Claude** | `claude-3-5-haiku-20241022`, `claude-3-5-sonnet-20241022` | Yes | Not needed |
| **Groq** | `groq/llama-3.3-70b-versatile`, `groq/mixtral-8x7b-32768` | Yes | Optional |
| **DeepSeek** | `deepseek/deepseek-chat`, `deepseek/deepseek-reasoner` | Yes | Optional |
| **Mistral AI** | `mistral/mistral-small-latest`, `mistral/mistral-large-latest` | Yes | Optional |
| **OpenRouter** | `openrouter/meta-llama/llama-3.3-70b-instruct` | Yes | Optional |
| **Ollama (Local)** | `ollama/llama3.2`, `ollama/qwen2.5-coder` | **No** | `http://host.docker.internal:11434` |
| **Custom OpenAI-Compatible** | Any model (e.g. vLLM, LocalAI, LM Studio) | Optional | `http://your-host:port/v1` |

### Setting Up Providers via Web UI
1. Click the **Settings** button in the top right navigation bar.
2. Select your AI provider from the dropdown.
3. Pick a model preset or enter a custom model identifier.
4. Paste your API key (if using an external provider).
5. Click **Test Connection** to verify credentials in real-time.
6. Click **Save Configuration** (settings are saved to `/app/data/settings.json` and persist across container restarts).

### Setting Up Providers via Environment Variables
Alternatively, configure defaults in `.env` before running Docker Compose:

```bash
cp .env.example .env
```

Edit `.env`:
```env
AI_PROVIDER=gemini
AI_MODEL=gemini/gemini-2.0-flash
AI_API_KEY=your_gemini_api_key_here
```

---

## 5. Security & Isolation Architecture

RepoHunter is hardened according to strict security guidelines:

- **Server-Side Secret Isolation**: API keys are saved exclusively in backend storage (`./data/settings.json`). Keys are never sent to the frontend JavaScript runtime and are masked in all API responses (`sk-••••••••1234`).
- **No Log Leaks**: API keys are excluded from backend logging and diagnostic messages.
- **SSRF Protection**: Custom API Base URLs are validated before execution. Access to cloud metadata endpoints (`169.254.169.254`, `metadata.google.internal`) and link-local ranges is strictly prohibited.
- **Rate Limiting**: AI analysis endpoints enforce an in-memory sliding window limiter (15 requests/minute per client IP) to protect against accidental cost overrun or denial of service.
- **Strict Sandbox / No Shell or Code Execution**: The AI engine has no terminal access, no filesystem tools, and no tool-calling loop. It strictly ingests structured repository metadata and outputs validated JSON.
- **Untrusted Data Sanitization**: All scraped text from GitHub is sanitized and length-capped to mitigate prompt injection and XSS vectors.

---

## 6. REST API Reference

### Health
```http
GET /api/health
```
Response:
```json
{
  "status": "healthy",
  "app": "RepoHunter",
  "version": "1.0.0"
}
```

### Get Trending Repositories
```http
GET /api/trending?since=daily&language=python&refresh=false
```
Parameters:
- `since`: `daily` | `weekly` | `monthly` (default: `daily`)
- `language`: Programming language slug (e.g. `python`, `rust`, `typescript`, or omit for all)
- `refresh`: `true` to force a live scrape bypassing the 5-minute memory cache

### Get Supported Languages
```http
GET /api/languages
```

### Analyze Repository
```http
POST /api/analyze
Content-Type: application/json

{
  "repo": "anthropics/claude-code",
  "description": "An agentic coding tool by Anthropic",
  "language": "TypeScript",
  "stars": 12500,
  "forks": 850,
  "period_stars": "450 stars today",
  "url": "https://github.com/anthropics/claude-code"
}
```

Response:
```json
{
  "repo": "anthropics/claude-code",
  "what_it_does": "A research-preview agentic coding tool that lives in your terminal...",
  "why_trending": "Massive developer interest in Anthropic's official terminal coding agent...",
  "use_cases": [
    "Interactive terminal-based pair programming",
    "Automated code search and refactoring",
    "Multi-step terminal workflows"
  ],
  "target_audience": "Software engineers and DevOps teams using terminal-centric workflows.",
  "technical_summary": "Built with TypeScript; interfaces with Claude 3.5 Sonnet.",
  "model_used": "gpt-4o-mini",
  "analyzed_at": "2026-11-01T12:00:00Z"
}
```

### AI Settings Management
```http
GET /api/settings
POST /api/settings
POST /api/settings/test
```

---

## 7. Operations & Maintenance

### Stopping the Application
```bash
docker compose down
```

### Viewing Logs
```bash
docker compose logs -f repohunter
```

### Updating RepoHunter
```bash
git pull origin main
docker compose up -d --build
```

### Backing Up Configuration
All provider settings and model choices are stored in `./data/settings.json`. Back up this single file or mount it into your backup workflow:
```bash
cp data/settings.json ~/backup/repohunter-settings.json
```

---

## 8. Local Development (Without Docker)

If you prefer to run the frontend and backend directly on your workstation:

### Prerequisites
- Node.js 18+ & npm
- Python 3.11+ or 3.12+

### 1. Start Backend
```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt

# Run backend API server
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173`. Vite will proxy `/api/*` calls automatically to the backend on port 8000.

### 3. Run Backend Unit Tests
```bash
pytest backend/tests -v
```

---

## 9. License

MIT License. Feel free to use, modify, and distribute.
