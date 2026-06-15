# PROJECT_STATE.md — Sovereign OS

_Last updated: 2026-06-15_

---

## Current State

**Version:** Signal Dashboard → Sovereign OS (active rename/evolution)
**Status:** Live, private, password-protected
**Deployment:** Vercel (auto-deploy from `main`)

---

## What's Working

### Command Center (`/`)
- BTC price + 24h change (live from CoinGecko via server component)
- Task list with localStorage persistence (`signal_tasks`)
- Habit tracker with streaks (`signal_habit_log`, `signal_streak`)
- BTC stack tracker — enter your holdings, see USD value (`signal_btc_stack`)
- AI assistant panel — Claude-powered chat (`signal_ai_messages`)
- Hero stats: BTC price, daily session count

### Life Planner (`/planner`)
- Daily plan card (`signal_planner_daily`)
- Weekly goals (`signal_planner_weekly`)
- Monthly focus areas (`signal_planner_monthly`)
- 1yr / 3yr / 5yr long-term vision (`signal_planner_1yr`, `signal_planner_3yr`, `signal_planner_5yr`)
- Review & reflection card (`signal_planner_review`)
- AI planner assistant (Claude, via `/api/planner-chat`)
- Projected outcomes card

### Content Engine (`/content`)
- YouTube channel search + video grid with outlier scoring
- Video analysis (Claude extracts hook, framework, keywords, script)
- Content draft tool (LinkedIn, X, YouTube — multi-format)
- Ideas vault (`signal_content_ideas`)
- B-Roll pipeline (upload → Whisper transcribe → Claude plan → Higgsfield/Runway generate)
- Brand roadmap tracker

### Brand Plan (`/brand`)
- Mission statement editor
- Positioning editor (Who / What / Why)
- Brand architecture: Jonathan Cardona · Digital Wealth Transfer · Sovereign OS
- Content pillars editor
- Offer stack editor
- All persisted to localStorage

### Projects (`/projects`)
- Project tracker with status (Active / Paused / Complete / Idea)
- Editable title, description, next action, URL
- Filter by status
- Persisted to `signal_projects`

### Memory / Narrative Bank (`/narrative`)
- Editable brand narratives and one-liners
- Copy-to-clipboard on each card
- Persisted to `signal_narratives`

### B-Roll Pipeline (`/broll`)
- Full pipeline: upload video/audio → Whisper transcription → Claude B-roll plan → AI video generation
- Supports Higgsfield (primary) and Runway (fallback)
- CloudConvert compression for files > 25MB

---

## What's Placeholder / Coming Soon

| Module | Route | Notes |
|---|---|---|
| Leads / CRM | `/leads` | Placeholder page. Will connect to DWT lead engine or standalone CRM |
| Settings | `/settings` | Placeholder page. API key management, export, theme |
| Memory (new route) | `/memory` | Redirects to `/narrative` — will evolve into Knowledge Base |

---

## Known Technical Debt

1. **localStorage keys** — All use `signal_` prefix (legacy). Will NOT be renamed to preserve existing user data.
2. **Auth cookie** — Middleware accepts both `sovereign-auth` (new) and `signal-auth` (legacy) during transition.
3. **No test suite** — `npx tsc --noEmit` + `npm run build` is the correctness check.
4. **No OG images** — Pages use default metadata only.
5. **No Anthropic SDK** — Using raw `fetch` to Anthropic API. Should migrate to `@anthropic-ai/sdk`.

---

## Active Environment Variables

All required vars must be set in Vercel environment settings:
- `DASHBOARD_PASSWORD` — required
- `ANTHROPIC_API_KEY` — required
- `YOUTUBE_API_KEY` — required for content research
- `OPENAI_API_KEY` — required for transcription
- `HIGGSFIELD_API_KEY` — required for B-roll generation
- `RUNWAY_API_KEY` — optional fallback
- `CLOUDCONVERT_API_KEY` — optional, for large file compression
- `HELICONE_API_KEY` — optional, AI observability
