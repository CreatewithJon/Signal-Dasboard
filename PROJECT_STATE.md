# PROJECT_STATE.md — Sovereign OS

_Last updated: 2026-06-15_

---

## Current State

**Version:** Sovereign OS v1 (Signal Dashboard rename: Complete)
**Status:** Live, private, password-protected
**Deployment:** Vercel (auto-deploy from `main`)

---

## What's Working

### Command Center (`/`)
- BTC price + 24h change (live from CoinGecko via server component)
- Task list with localStorage persistence (`sovereign_tasks`)
- Habit tracker with streaks (`sovereign_habits`, `sovereign_habit_log`) — includes empty state + edit/add/delete
- BTC stack tracker — enter your holdings, see USD value (`sovereign_btc_stack`)
- AI assistant panel — Claude-powered streaming chat (`sovereign_ai_messages`)
- Hero stats: BTC price, daily session count
- System Status row: AI / Storage / Market Data health indicators
- Layout: Signals section (BTC + Stack), Execution section (Productivity + Habits), AI section

### AI Assistant
- Claude Haiku — streaming token-by-token output via Anthropic SSE
- Typing dots → blinking cursor during stream
- Stop button — discards in-flight response cleanly (no partial saves)
- Error messages with Retry button — re-sends original prompt
- Persistent chat history (`sovereign_ai_messages`, last 40 messages)
- Optional Helicone observability via `HELICONE_API_KEY`

### Life Planner (`/planner`)
- Daily plan card (`sovereign_planner_daily`)
- Weekly goals (`sovereign_planner_weekly`)
- Monthly focus areas (`sovereign_planner_monthly`)
- 1yr / 3yr / 5yr long-term vision (`sovereign_planner_1yr`, `sovereign_planner_3yr`, `sovereign_planner_5yr`)
- Review & reflection card (`sovereign_planner_review`)
- AI planner assistant (Claude, via `/api/planner-chat`)
- Projected outcomes card

### Content Engine (`/content`)
- YouTube channel search + video grid with outlier scoring
- Video analysis (Claude extracts hook, framework, keywords, script)
- Content draft tool (LinkedIn, X, YouTube — multi-format)
- Ideas vault (`sovereign_content_ideas`)
- B-Roll pipeline (upload → Whisper transcribe → Claude plan → Higgsfield/Runway generate)
- Brand roadmap tracker

### Brand Plan (`/brand`)
- Mission statement editor
- Positioning editor (Who / What / Why)
- Brand architecture: Jonathan Cardona · Digital Wealth Transfer · Sovereign OS
- Content pillars editor
- Offer stack editor
- All persisted to localStorage (`sovereign_brand_*`)

### Projects (`/projects`)
- Project tracker with status (Active / Paused / Complete / Idea)
- Editable title, description, next action, URL
- Filter by status
- Persisted to `sovereign_projects`

### Memory / Narrative Bank (`/narrative`)
- Editable brand narratives and one-liners
- Copy-to-clipboard on each card
- Persisted to `sovereign_narratives`
- `/memory` route aliases to `/narrative`

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

---

## localStorage Key Registry

All keys use the `sovereign_` prefix. Migration from `signal_*` is handled automatically on first load via `lib/migration.ts` + `components/StorageMigration.tsx`.

| Key | Purpose |
|---|---|
| `sovereign_tasks` | Task list |
| `sovereign_note` | Quick note |
| `sovereign_sessions` | Pomodoro session count |
| `sovereign_streak` | Daily streak |
| `sovereign_btc_stack` | BTC holdings |
| `sovereign_habits` | Habit list |
| `sovereign_habit_log` | Daily habit completions |
| `sovereign_ai_messages` | AI chat history |
| `sovereign_planner_daily` | Daily plan |
| `sovereign_planner_weekly` | Weekly goals |
| `sovereign_planner_monthly` | Monthly focus |
| `sovereign_planner_1yr` | 1-year vision |
| `sovereign_planner_3yr` | 3-year vision |
| `sovereign_planner_5yr` | 5-year vision |
| `sovereign_planner_review` | Review questions |
| `sovereign_content_ideas` | Content ideas vault |
| `sovereign_projects` | Project tracker |
| `sovereign_narratives` | Narrative bank |
| `sovereign_teleprompter_script` | Teleprompter script |
| `sovereign_brand_*` | Brand plan fields |
| `sovereign_migration_v1_complete` | Migration sentinel |

---

## Known Technical Debt

1. **Auth cookie transition** — Middleware accepts both `sovereign-auth` (new) and `signal-auth` (legacy) during transition. Can remove `signal-auth` fallback after all active sessions expire.
2. **No test suite** — `npx tsc --noEmit` + `npm run build` is the correctness check.
3. **No OG images** — Pages use default metadata only.
4. **No Anthropic SDK** — Using raw `fetch` to Anthropic API. Works fine; `@anthropic-ai/sdk` migration is optional.
5. **AI chat is single-turn** — Chat API sends only the current message, not full conversation history. Multi-turn context is a future improvement.

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
