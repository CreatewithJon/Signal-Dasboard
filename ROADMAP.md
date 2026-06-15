# ROADMAP.md — Sovereign OS

> A personal AI operating system for the AI-powered digital era. This roadmap covers the evolution from Signal Dashboard into a fully realized Sovereign OS.

_Last updated: 2026-06-15_

---

## Phase 0 — Foundation (Complete)
_The original Signal Dashboard — core modules working_

- [x] Password auth + middleware protection
- [x] Bitcoin price panel (live CoinGecko)
- [x] Task + productivity panel
- [x] Habit tracker with streaks
- [x] BTC stack tracker
- [x] AI assistant (Claude)
- [x] Life planner (Daily → 5yr vision)
- [x] Content engine (YouTube research + Claude analysis)
- [x] Brand plan
- [x] Project tracker
- [x] Narrative / memory bank
- [x] B-Roll pipeline (Whisper + Higgsfield + Runway)
- [x] Teleprompter

---

## Phase 1 — Identity Upgrade (Current)
_Rename and reposition Signal Dashboard → Sovereign OS_

- [x] Package name: `sovereign-os`
- [x] All page metadata updated
- [x] Sidebar: new nav structure (Core / Modules / System)
- [x] Mobile nav: updated labels + violet active state
- [x] Login: "Sovereign OS · Private Dashboard"
- [x] Brand plan: "Signal" → "Sovereign OS" in brand architecture
- [x] Auth cookie: `signal-auth` → `sovereign-auth` (backwards-compatible)
- [x] Placeholder pages: `/leads`, `/settings`, `/memory`
- [x] README, PROJECT_STATE, ROADMAP created

---

## Phase 1.5 — Project Management (Complete)
_Turn /projects into a full personal command center_

- [x] New Project type: status, category, priority, objective, next_action, due_date, links, notes
- [x] Project cards: category/priority/status badges, next action, archive button
- [x] Project detail modal: Overview tab (all fields), Tasks tab, AI tab
- [x] Tasks: per-project tasks with status cycle (Todo → In Progress → Done), priority, due date
- [x] AI project assistant: streaming, 4 presets (Summarize, Next Steps, Break Into Tasks, Today's Focus), custom questions
- [x] Seed projects: Sovereign OS, DWT, Aigentic Systems, Big Money Realty, Crypto Mondays LV, UNLV GH-600
- [x] localStorage migration: old format auto-migrated to new format on load
- [x] ProjectsWidget on homepage: stats, next actions, active projects, link to /projects
- [x] localStorage keys: `sovereign_projects`, `sovereign_project_tasks`
- [x] `/api/project-chat` streaming route with project management system prompt

---

## Phase 2 — Module Depth
_Deepen and improve existing modules_

- [ ] **Command Center redesign** — cleaner card layout, collapsible panels, better mobile
- [ ] **Bitcoin panel** — add block height, mempool fees, sats per dollar display
- [ ] **BTC stack** — add DCA cost basis, unrealized gain/loss, chart
- [ ] **Planner** — add priority tagging, drag-to-reorder, carry-over from previous day
- [ ] **Content Engine** — save analysis history, batch analyze multiple videos
- [ ] **Memory** — tag system, search, export to markdown
- [ ] **Projects** — drag-to-reorder, project progress %, due date alerts
- [ ] **B-Roll** — save pipeline runs, manage generated clips library

---

## Phase 3 — Leads Module
_Built-in CRM and pipeline management_

- [ ] Lead inbox (inbound from DWT form or manual entry)
- [ ] Pipeline stages: New → Contacted → Qualifying → Proposal → Won / Lost
- [ ] AI-assisted outreach message generator
- [ ] Follow-up reminders
- [ ] Deal value and revenue tracking
- [ ] Export to CSV

---

## Phase 4 — Settings + System
_Full system configuration_

- [ ] Settings page: update DASHBOARD_PASSWORD in-app
- [ ] API key management (view which keys are active)
- [ ] localStorage export / import (full data backup)
- [ ] Theme customization (accent colors, density)
- [ ] Module enable/disable toggles
- [ ] Usage stats (API calls, tokens used)

---

## Phase 5 — Knowledge Base / Memory Evolution
_Move from narrative bank to a real knowledge base_

- [ ] Structured knowledge entries (vs free-form narratives)
- [ ] Tag + category system
- [ ] Full-text search
- [ ] AI-assisted knowledge synthesis ("summarize what I know about X")
- [ ] Connect to AI assistant for grounded context

---

## Phase 6 — Automation + Intelligence Layer
_Sovereign OS starts doing work for you_

- [ ] Daily briefing: auto-summarize BTC price, calendar, tasks, and top priority
- [ ] Scheduled content generation (weekly LinkedIn post draft on Sunday)
- [ ] Smart habit nudges based on streak history
- [ ] AI review: weekly reflection prompt pulled from planner data
- [ ] Pipeline AI: flag stale leads, suggest next outreach

---

## Architecture Notes

### Signal → Sovereign OS migration decisions
- **localStorage keys kept as `signal_`** — renaming would destroy existing data for no user benefit
- **`/narrative` route preserved** — `/memory` redirects there; will evolve when Phase 5 is built
- **Auth cookie** — middleware checks `sovereign-auth` first, falls back to `signal-auth` for existing sessions
- **Same GitHub repo** — commit history, Vercel deployment, and all integrations unchanged

### Future infrastructure
- Consider migrating localStorage to a Supabase table when multi-device sync is needed
- Consider adding `@anthropic-ai/sdk` for cleaner streaming support
- AI usage should eventually route through Helicone for observability
