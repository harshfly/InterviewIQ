# InterviewIQ

**Enterprise-Grade Real-Time AI Interview Copilot**  
**Version:** 1.0.0 (MNC Production Blueprint)  
**Classification:** Internal Product Specification  
**Last Updated:** September 2026  

> **One-sentence vision**  
> InterviewIQ is a fully undetectable, ultra-low-latency AI interview assistant that listens to live interviews, understands the exact job + company context, and streams high-quality, personalized answers on a protected overlay — available as a polished Web app and a native Windows desktop app.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Core Features (World-Class Checklist)](#2-core-features-world-class-checklist)
3. [Architecture](#3-architecture)
4. [Recommended Free / Best APIs](#4-recommended-free--best-apis)
5. [Stealth & Undetectability Techniques](#5-stealth--undetectability-techniques)
6. [Folder Structure](#6-folder-structure)
7. [System Prompts & Loop Prompting System](#7-system-prompts--loop-prompting-system)
8. [Session Flow (Job Position + Company Required)](#8-session-flow-job-position--company-required)
9. [UI / UX Design System](#9-ui--ux-design-system)
10. [Web App Specification](#10-web-app-specification)
11. [Windows Desktop App Specification](#11-windows-desktop-app-specification)
12. [Audio Pipeline](#12-audio-pipeline)
13. [Model Routing & Fallback Strategy](#13-model-routing--fallback-strategy)
14. [Environment Variables (Only Things You Change)](#14-environment-variables-only-things-you-change)
15. [Runbook (How to Build, Run & Deploy)](#15-runbook-how-to-build-run--deploy)
16. [Security, Privacy & Compliance](#16-security-privacy--compliance)
17. [Testing Matrix](#17-testing-matrix)
18. [Future Roadmap](#18-future-roadmap)
19. [Appendix – Key Code Patterns](#19-appendix--key-code-patterns)

---

## 1. Product Overview

**InterviewIQ** is designed as an MNC-grade product. It must feel like a premium, invisible co-pilot rather than a gimmick.

### Target Experience
- User starts a session → enters **Job Position** + **Company Name** (mandatory) + optional resume/JD.
- Joins Zoom / Google Meet / Teams / HackerRank / etc. as normal.
- InterviewIQ runs silently in the background.
- When the interviewer asks a question, an answer appears on a light, elegant, always-on-top overlay within 1.5–3.5 seconds.
- The overlay is **completely invisible** to screen share, recording tools, and most proctoring software.
- Answers are grounded in the user’s real experience + the specific role and company.

### Platforms
| Platform       | Form Factor                  | Stealth Level          | Primary Use Case                  |
|----------------|------------------------------|------------------------|-----------------------------------|
| Windows        | Native desktop (Tauri/Electron) | Maximum (OS-level)    | Primary product                   |
| Web            | Progressive Web App + floating overlay | High (with caveats) | Chromebooks, locked machines, quick access |
| Mobile (future)| Companion mode               | Perfect (second device)| Phone as private screen           |

---

## 2. Core Features (World-Class Checklist)

### Must-Have (v1)
- [x] Real-time system audio + microphone capture
- [x] Streaming speech-to-text with question-end detection
- [x] Mandatory **Job Position + Company** context for every session
- [x] Resume / LinkedIn / JD upload (PDF, DOCX, text)
- [x] Personalized answer generation (STAR / CAR / technical / coding)
- [x] Ultra-light, elegant, movable, semi-transparent overlay
- [x] Fully excluded from screen capture on Windows
- [x] Hotkeys: Show/Hide, Regenerate, Pause, Next Suggestion
- [x] Coding interview mode (screenshot region → solution + complexity)
- [x] Multi-language support (50+ via STT + LLM)
- [x] Session history + post-interview AI debrief
- [x] Mock interview mode
- [x] Streaming answers (first tokens appear fast)
- [x] Automatic question detection (no button press required in auto mode)

### Nice-to-Have (v1.1+)
- Live coaching on pace / filler words
- Voice cloning of user answers for practice
- Team / recruiter remote assist mode
- Offline mode with local Whisper + local LLM

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  ┌──────────────────────┐    ┌──────────────────────────────┐  │
│  │  Windows Desktop App │    │         Web App              │  │
│  │  (Tauri preferred or │    │  (Next.js / Vite + React)    │  │
│  │   Electron)          │    │                              │  │
│  │  - Overlay Window    │    │  - Floating Overlay          │  │
│  │  - System Audio      │    │  - MediaRecorder / WebSpeech │  │
│  │  - Content Protection│    │  - Limited stealth           │  │
│  └──────────┬───────────┘    └──────────────┬───────────────┘  │
└─────────────┼───────────────────────────────┼──────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              │ HTTPS / WebSocket
┌─────────────────────────────▼───────────────────────────────────┐
│                     BACKEND (FastAPI / Node)                    │
│  - Auth (optional)                                              │
│  - Session management                                           │
│  - Resume parsing & embedding store                             │
│  - Prompt assembly + Loop Prompting Engine                      │
│  - Model router (Groq → Gemini → OpenRouter fallback)           │
│  - Streaming response                                           │
│  - Post-session analysis                                        │
└─────────────────────────────┬───────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
   ┌───────────┐        ┌───────────┐        ┌───────────┐
   │  STT APIs │        │  LLM APIs │        │ Optional  │
   │ Groq Whisper│      │ Groq /    │        │ Vision    │
   │ Deepgram  │        │ Gemini /  │        │ (coding)  │
   │ Local     │        │ OpenRouter│        │           │
   └───────────┘        └───────────┘        └───────────┘
```

**Preferred Desktop Framework:** **Tauri 2** (much smaller binary, lower RAM, better security). Electron is acceptable if the team is pure JS and needs maximum plugin ecosystem.

---

## 4. Recommended Free / Best APIs

All recommendations prioritize **free tiers with no credit card** where possible, high quality, and low latency.

### Speech-to-Text (STT)

| Priority | Provider              | Model / Notes                          | Free Tier Highlights                  | Why Use It                          |
|----------|-----------------------|----------------------------------------|---------------------------------------|-------------------------------------|
| 1        | **Groq**              | Whisper Large V3 / Turbo               | Generous free plan, extremely fast    | Best speed + quality balance        |
| 2        | **Deepgram**          | Nova-2 / Nova-3                        | $200 free credit (no card)            | Best pure streaming latency         |
| 3        | **Local Whisper**     | faster-whisper / whisper.cpp           | Unlimited (your hardware)             | Privacy + zero cost at scale        |
| 4        | Cloudflare Workers AI | Whisper variants                       | 10k neurons/day                       | Edge deployment                     |
| Fallback | Browser Web Speech API| —                                      | Free                                  | Web-only prototype                  |

### Large Language Models (LLM)

| Priority | Provider              | Best Free Models                       | Strengths                             |
|----------|-----------------------|----------------------------------------|---------------------------------------|
| 1        | **Groq**              | Llama 3.3 70B, Qwen3, gpt-oss variants | Lowest latency, excellent for real-time |
| 2        | **Google AI Studio**  | Gemini 2.5 Flash / 2.5 Flash-Lite      | Huge context, multimodal, generous free |
| 3        | **OpenRouter**        | All `:free` models (Qwen3.8, Gemma, etc.) | One key → many models               |
| 4        | Cloudflare Workers AI | Llama 3.3 70B etc.                     | Serverless                             |

### Vision (for Coding Problems)
- Google Gemini (free tier has vision)
- Groq vision models (when available)
- OpenRouter free vision models

### Recommendation for InterviewIQ
**Primary stack (best quality + speed + free):**
- STT → Groq Whisper (or Deepgram for pure streaming)
- LLM → Groq (Llama 3.3 70B / Qwen) with Gemini 2.5 Flash as fallback
- Vision → Gemini

You only need to put API keys in `.env`. The system automatically routes and falls back.

---

## 5. Stealth & Undetectability Techniques

### Windows Desktop (Maximum Stealth)

1. **Content Protection (Core)**
   ```cpp
   // Win32
   SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE); // 0x00000011
   ```
   - Electron: `win.setContentProtection(true)`
   - Tauri: `window.set_content_protected(true)` (or equivalent in v2)
   - Effect: Window is completely excluded from Desktop Duplication API, Zoom, Teams, Meet, OBS, Snipping Tool, Game Bar, most proctoring tools.

2. **Additional Hardening**
   - No taskbar icon (`skipTaskbar: true`)
   - No Alt-Tab entry (or custom handling)
   - Process name can be customized (avoid obvious names)
   - Always re-apply affinity on window restore / show events
   - Click-through mode optional (`WS_EX_TRANSPARENT` + `WS_EX_LAYERED`)
   - Never steal focus

3. **What it does NOT hide**
   - Process still visible in Task Manager / Activity Monitor
   - Behavioral cues (eyes looking at overlay area, unnatural pauses)
   - Network traffic if someone inspects deeply

### Web App Stealth
- Share only a single browser tab / specific window
- Floating overlay using `position: fixed` + high z-index
- Optional: second-device mode (phone as private screen)
- Never inject into the meeting page itself

### Best Practice Recommendation
- Desktop app = primary product for “fully undetectable”
- Web app = convenient + good enough when user shares only one tab

---

## 6. Folder Structure

```
InterviewIQ/
├── README.md
├── InterviewIQ.md                    # This file
├── .env.example
├── .gitignore
├── package.json                      # Root workspace (optional)
│
├── apps/
│   ├── web/                          # Next.js or Vite + React
│   │   ├── src/
│   │   │   ├── app/ or pages/
│   │   │   ├── components/
│   │   │   │   ├── Overlay/
│   │   │   │   ├── SessionSetup/
│   │   │   │   ├── Transcript/
│   │   │   │   └── ui/               # shadcn or custom
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   └── styles/
│   │   ├── public/
│   │   └── package.json
│   │
│   └── desktop/                      # Tauri 2 (preferred) or Electron
│       ├── src-tauri/ or electron/
│       ├── src/                      # Shared React UI
│       ├── package.json
│       └── tauri.conf.json / electron-builder config
│
├── packages/
│   ├── shared/                       # Types, prompts, utils
│   │   ├── prompts/
│   │   │   ├── system.ts
│   │   │   ├── behavioral.ts
│   │   │   ├── technical.ts
│   │   │   └── coding.ts
│   │   ├── types/
│   │   └── utils/
│   │
│   └── ui/                           # Shared design system
│
├── backend/                          # FastAPI recommended
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── prompts.py
│   │   │   └── model_router.py
│   │   ├── services/
│   │   │   ├── stt.py
│   │   │   ├── llm.py
│   │   │   ├── resume.py
│   │   │   └── session.py
│   │   └── models/
│   ├── requirements.txt
│   └── Dockerfile
│
├── docs/
│   ├── architecture.md
│   ├── stealth.md
│   └── api.md
│
└── scripts/
    ├── setup.sh
    ├── build-desktop.sh
    └── deploy.sh
```

---

## 7. System Prompts & Loop Prompting System

### Core System Prompt (Master)

```text
You are InterviewIQ — an elite, invisible interview co-pilot used by top candidates at FAANG and global MNCs.

CONTEXT FOR THIS SESSION:
- Target Role: {{job_position}}
- Target Company: {{company}}
- Candidate Resume / Experience Summary:
{{resume_summary}}

RULES:
1. Answers must sound natural, confident, and human — never robotic or like a Wikipedia article.
2. Ground every answer in the candidate’s real experience when possible. If the resume lacks a specific example, create a plausible, high-quality version that fits the candidate’s background and clearly mark it as suggested.
3. Prefer structured frameworks:
   - Behavioral → STAR (Situation, Task, Action, Result) with metrics
   - Technical → Clear explanation → Approach → Trade-offs → Complexity
   - Coding → Problem understanding → Brute force → Optimized approach → Code sketch → Edge cases → Complexity
4. Keep answers concise enough to speak in 45–90 seconds unless the question demands depth.
5. Match the seniority level implied by the role.
6. Never mention that you are an AI or that you are helping in real time.
7. If the question is unclear, ask a short clarifying question first (as the candidate would).

Current conversation transcript (last few turns):
{{recent_transcript}}
```

### Loop Prompting Engine (Critical for Quality)

InterviewIQ uses a multi-stage loop:

1. **Question Classification** (fast model)
   - Type: Behavioral / Technical / Coding / System Design / Culture / Other
   - Difficulty: Junior / Mid / Senior / Staff
   - Requires resume grounding? Yes/No

2. **Context Assembly**
   - Pull relevant resume bullets (vector search or keyword)
   - Pull company-specific knowledge if available (optional)

3. **Primary Generation** (strong model, streaming)
   - Use the master system prompt + classified type prompt

4. **Optional Refinement Loop** (only if latency allows)
   - “Make this more concise and natural for spoken delivery”
   - “Add one strong metric if missing”

5. **Safety Filter**
   - Remove any accidental AI self-reference
   - Ensure length is speakable

### Type-Specific Add-ons

**Behavioral**
```
Structure the answer using STAR. Start with a one-sentence hook. End with a clear result that has a number or measurable impact whenever possible.
```

**Coding**
```
First confirm understanding. Then outline the approach. Provide clean pseudocode or language-agnostic code. State time and space complexity. Mention 1–2 edge cases.
```

**System Design**
```
Clarify requirements first. Then high-level design → key components → data flow → scaling → trade-offs.
```

---

## 8. Session Flow (Job Position + Company Required)

```
1. User opens InterviewIQ
2. Mandatory fields:
   - Job Position (e.g. “Senior Backend Engineer”)
   - Company (e.g. “Stripe”)
   - Optional: Resume upload, Job Description paste, Custom instructions
3. User clicks “Start Session”
4. System builds the session context object
5. Audio capture starts (system + mic)
6. Continuous STT → question detection
7. On question end:
   - Classify
   - Generate streaming answer
   - Display on overlay
8. User can:
   - Hide / show overlay (hotkey)
   - Request regenerate
   - Mark answer as used
9. Session ends → full transcript + AI debrief generated
```

**Why Job + Company is mandatory**  
Answers become dramatically better when the model knows the exact role level and company culture/values. This is one of the biggest differentiators versus generic tools.

---

## 9. UI / UX Design System

### Design Principles
- **Invisible when needed, elegant when visible**
- Extremely low visual noise
- High contrast text on semi-transparent dark glass
- Smooth micro-animations only (no flashy effects)
- Keyboard-first

### Overlay Design (Core)
- Semi-transparent dark panel (`rgba(15, 15, 20, 0.85)` + backdrop blur)
- Rounded corners, subtle border
- Draggable
- Resizable
- Auto-hide option after X seconds
- Font: Inter or SF Pro (clean, readable at small sizes)
- Streaming text with subtle cursor
- Small header showing: Role @ Company | Status (Listening / Generating)

### Color Tokens
```
--bg-overlay: rgba(12, 12, 16, 0.88)
--text-primary: #F5F5F7
--text-secondary: #A1A1AA
--accent: #3B82F6
--success: #22C55E
--border: rgba(255, 255, 255, 0.08)
```

### Key Screens
1. **Landing / Session Setup** – Clean, professional, form with Job + Company as required fields
2. **Live Overlay** – Minimal
3. **Session History** – List of past interviews with scores and debriefs
4. **Settings** – API keys, hotkeys, model preference, stealth options

---

## 10. Web App Specification

- Framework: Next.js 15 (App Router) or Vite + React 19
- Styling: Tailwind + shadcn/ui (or custom)
- State: Zustand or Jotai
- Real-time: WebSocket or Server-Sent Events for streaming answers
- Audio: MediaRecorder → chunks to backend or direct to STT provider
- Overlay: Fixed position floating panel that can be dragged
- Auth: Optional (Clerk / Supabase / simple JWT)
- Deploy: Vercel or Cloudflare Pages

**Limitation:** True OS-level capture exclusion is not possible in pure browser. Educate users to share only the meeting tab.

---

## 11. Windows Desktop App Specification

**Preferred:** Tauri 2 + React frontend  
**Alternative:** Electron + React

### Critical Native Features
- System audio loopback (WASAPI)
- Microphone access
- `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)`
- Global hotkeys
- System tray
- Auto-start optional
- Single instance

### Build Targets
- Windows 10 version 2004+ and Windows 11 (required for full exclusion)
- Installer: MSI or NSIS via Tauri / electron-builder

---

## 12. Audio Pipeline

```
System Audio (WASAPI loopback) + Microphone
        ↓
Voice Activity Detection (VAD)
        ↓
Chunking (1–3 second overlapping windows)
        ↓
STT (Groq Whisper / Deepgram streaming)
        ↓
Transcript buffer + Silence detection
        ↓
Question End Detector (silence + punctuation + LLM classifier)
        ↓
Emit “question_complete” event with full question text
```

**Question End Heuristics**
- ≥ 1.2–1.8 s of silence after speech
- Ends with question mark or interrogative structure
- Fast LLM classifier: “Is this a complete interview question?” → Yes/No

---

## 13. Model Routing & Fallback Strategy

```typescript
async function generateAnswer(question: string, context: SessionContext) {
  try {
    return await groq.chat.completions.create({ ... }); // Primary
  } catch (e) {
    try {
      return await gemini.generateContent({ ... });     // Fallback 1
    } catch (e2) {
      return await openrouter.chat.completions.create({ ... }); // Fallback 2
    }
  }
}
```

Always stream. Prefer models with strong instruction following and low latency.

---

## 14. Environment Variables (Only Things You Change)

```bash
# .env

# === STT ===
GROQ_API_KEY=gsk_...
DEEPGRAM_API_KEY=...

# === LLM ===
GROQ_API_KEY=gsk_...          # same key works for LLM + Whisper
GOOGLE_AI_API_KEY=...
OPENROUTER_API_KEY=sk-or-...

# === Optional ===
DATABASE_URL=                 # if you want persistent sessions
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

That is all. Everything else is already configured in the codebase according to this blueprint.

---

## 15. Runbook (How to Build, Run & Deploy)

### Prerequisites
- Node.js 20+
- Python 3.11+ (for backend)
- Rust (if using Tauri)
- Windows 10/11 for desktop builds

### Local Development

```bash
# 1. Clone / create project from this structure
# 2. Copy .env.example → .env and fill API keys

# Backend
cd backend
python -m venv venv
source venv/bin/activate   # or Windows equivalent
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Web
cd apps/web
npm install
npm run dev

# Desktop (Tauri)
cd apps/desktop
npm install
npm run tauri dev
```

### Production Build

```bash
# Web
cd apps/web && npm run build

# Desktop
cd apps/desktop && npm run tauri build
```

### Deployment Suggestions
- Backend → Railway / Render / Fly.io / AWS
- Web → Vercel
- Desktop → GitHub Releases + auto-updater

---

## 16. Security, Privacy & Compliance

- All audio is processed in real time and discarded after the session unless user opts into saving transcript.
- Resume data stays in the user’s session or encrypted at rest.
- No training on user data by default.
- Clear disclaimer: “Use of real-time AI assistance may violate some employers’ interview policies. Use responsibly.”
- Content protection is a privacy feature for the user, not a guarantee of undetectability against sophisticated monitoring.

---

## 17. Testing Matrix

| Scenario                        | Expected Result                          | Priority |
|---------------------------------|------------------------------------------|----------|
| Zoom full screen share          | Overlay invisible                        | P0       |
| Google Meet tab share           | Overlay invisible (desktop)              | P0       |
| Teams window share              | Overlay invisible                        | P0       |
| HackerRank coding problem       | Screenshot → correct approach            | P0       |
| Noisy background audio          | STT still usable                         | P1       |
| Non-English question            | Correct language answer                  | P1       |
| Very long resume                | Context still grounded                   | P1       |
| API key failure                 | Graceful fallback                        | P0       |
| Window minimize → restore       | Content protection still active          | P0       |

---

## 18. Future Roadmap

- v1.1 – Live coaching layer (pace, filler words)
- v1.2 – Mobile companion app
- v1.3 – Local-first mode (Whisper + Ollama)
- v2.0 – Team / enterprise features + analytics dashboard
- Continuous improvement of prompt library based on real interview outcomes

---

## 19. Appendix – Key Code Patterns

### Electron Content Protection
```js
const { BrowserWindow } = require('electron');
const win = new BrowserWindow({ ... });
win.setContentProtection(true); // calls SetWindowDisplayAffinity under the hood
```

### Tauri (Rust side)
```rust
// Use the appropriate Tauri v2 window API for content protection
window.set_content_protected(true)?;
```

### Streaming Answer (Frontend)
```ts
const response = await fetch('/api/generate', { method: 'POST', body: ... });
const reader = response.body.getReader();
// stream tokens into the overlay UI
```

### Question Detection Skeleton
```ts
if (silenceDuration > 1400 && lastTranscript.endsWith('?') || isQuestion(lastTranscript)) {
  emit('question', lastTranscript);
}
```

---

## Final Notes for the Team

This document is intentionally complete. A strong engineering team can take this single file and produce a production-ready InterviewIQ product.

**Success Criteria for v1:**
1. Overlay is invisible on Zoom / Meet / Teams full-screen share on Windows 11.
2. Answer latency (question end → first useful tokens) < 2.5 s on average with Groq.
3. Answers are clearly better than generic ChatGPT because of Job + Company + Resume grounding.
4. UI feels premium and calm.
5. User only needs to add API keys to start using it.

**InterviewIQ** — invisible when it needs to be, world-class when it matters.

---

*End of Specification*
