# InterviewIQ

**Enterprise-Grade Real-Time AI Interview Copilot**

> Your invisible interview copilot — personalized, context-aware answers in real-time, grounded in your experience, tailored to the role and company.

## Quick Start

### Prerequisites
- **Node.js 20+**
- **Python 3.11+** (for backend)
- API keys for at least one provider (Groq recommended)

### 1. Configure API Keys

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 2. Start Backend

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate    # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3. Start Web App

```bash
cd apps/web
npm install
npm run dev
```

### 4. Desktop App (Optional)

```bash
cd apps/desktop
npm install
npm run dev
```

## Architecture

```
InterviewIQ/
├── backend/           # FastAPI — STT, LLM routing, sessions
├── apps/
│   ├── web/           # Vite + React — browser interface
│   └── desktop/       # Electron — screen-safe overlay
├── packages/shared/   # Shared prompts, types, utils
└── docs/              # Documentation
```

## Key Features

- 🎯 **Context-Aware** — Answers tailored to your role, company, and experience
- ⚡ **Ultra-Fast** — First tokens appear in under 2 seconds (with Groq)
- 🔒 **Screen-Safe** — Invisible to screen sharing on Windows desktop
- 🧠 **Smart Detection** — Automatically detects interview questions
- 📊 **Post-Interview Debrief** — AI-generated performance analysis
- 🌍 **Multi-Language** — 50+ languages via STT + LLM

## API Providers

| Provider | Used For | Free Tier |
|----------|----------|-----------|
| **Groq** | STT + LLM (primary) | Generous free plan |
| **Google Gemini** | LLM fallback + vision | Free tier available |
| **OpenRouter** | LLM fallback | Free models available |
| **Deepgram** | Streaming STT | $200 free credit |

## License

Private — Internal use only.
