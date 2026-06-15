# Sovereign OS

> A personal AI operating system for building, organizing, and executing in the AI-powered digital era.

Own your tools. Own your data. No subscriptions, no noise.

---

## About

**Sovereign OS** is a private, password-protected personal command center built for Jonathan Cardona. It aggregates the tools needed to run a digital business — AI assistant, Bitcoin tracking, productivity, life planning, content creation, and brand management — into a single, self-hosted interface.

> **Formerly:** This repo was originally built as **Signal Dashboard** and is being evolved into Sovereign OS while preserving the same GitHub repo, commit history, and deployment history.

---

## Current Modules

| Module | Route | Status |
|---|---|---|
| Command Center | `/` | Live — Bitcoin panel, tasks, habits, AI assistant |
| Life Planner | `/planner` | Live — Daily/Weekly/Monthly + 1yr/3yr/5yr vision |
| Content Engine | `/content` | Live — YouTube research, video analysis, Claude content, LinkedIn generator |
| Brand Plan | `/brand` | Live — Mission, positioning, content pillars, offer stack |
| Projects | `/projects` | Live — Project tracker with status and next actions |
| Memory / Narrative | `/narrative` | Live — Brand narratives, one-liners, copy bank |
| B-Roll Pipeline | `/broll` | Live — Transcribe → plan → generate AI video |
| Leads | `/leads` | Placeholder — coming soon |
| Settings | `/settings` | Placeholder — coming soon |

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 15.2.6 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| AI | Anthropic Claude API (Haiku / Sonnet) |
| Video | Higgsfield API (primary), Runway (fallback) |
| Transcription | OpenAI Whisper |
| Market Data | CoinGecko API |
| Content Research | YouTube Data API v3 |
| Compression | CloudConvert |
| Auth | Single password + httpOnly cookie |
| Storage | localStorage (client-side persistence) |

---

## Environment Variables

```env
DASHBOARD_PASSWORD=          # Login password
ANTHROPIC_API_KEY=           # Claude API
YOUTUBE_API_KEY=             # YouTube Data API v3
OPENAI_API_KEY=              # Whisper transcription
HIGGSFIELD_API_KEY=          # AI video generation
RUNWAY_API_KEY=              # AI video fallback
CLOUDCONVERT_API_KEY=        # Audio compression
HELICONE_API_KEY=            # Optional — AI observability
```

---

## Getting Started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # Production build
npx tsc --noEmit   # Type check
npm run lint       # Lint
```

---

## Notes on Signal → Sovereign OS Migration

- All `localStorage` keys retain the `signal_` prefix to preserve existing user data. Renaming keys would wipe all stored plans, tasks, habits, and narratives.
- The auth cookie was migrated from `signal-auth` to `sovereign-auth`. The middleware accepts both during transition.
- The `/narrative` route is preserved; `/memory` redirects to it. The sidebar shows "Memory" as the label.
- The repo name, deployment, and git history are unchanged.
