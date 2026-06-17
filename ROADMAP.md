# ROADMAP.md — Sovereign OS

> A personal AI operating system for the AI-powered digital era. This roadmap covers the evolution from Signal Dashboard into a fully realized Sovereign OS.

_Last updated: 2026-06-16 (v1.7)_

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
- [x] Overdue detection: red badges on cards, tasks, modal header, widget alert banner; amber for due within 3 days
- [x] Task progress on project cards: done/total count + mini progress bar
- [x] AI → Tasks import: parse numbered/bulleted list responses, deduplicate, batch create tasks with priority inference

---

## Phase 1.6 — Project Intelligence (Complete)
_Filters, Today view, and AI-powered weekly review_

- [x] **Advanced filters + search** — search bar across title/description/objective/next action; status filter tabs; category dropdown; priority dropdown; Overdue toggle; active filter count badge; Clear button; empty state per filter condition
- [x] **Today View** — dedicated "Today" tab showing overdue tasks, tasks due today, high-priority open tasks, and project next actions; toggle task done inline; click project name to open modal
- [x] **Weekly Review modal** — AI-powered weekly analysis streaming via `/api/project-chat`; prompt synthesizes active projects, overdue items, completed tasks, and high-priority open tasks; structured output: Overall Status / What's Working / Needs Attention / Top 3 Priorities / Weekly Focus; Regenerate button; Escape/backdrop to close

---

## Phase 2.3 — Habit Context Layer (Complete)
_AI assistant now reads habit list and today's completion state on habit/discipline queries_

- [x] `HabitEntry` interface exported from `lib/memory/context.ts`: `{ id, name, icon }`
- [x] `getHabitContext(query, habits, habitLog)` — 11 trigger keywords, streak computation (mirrors HabitPanel logic, checks consecutive days backwards from yesterday up to 90 days)
- [x] Formats as `## Relevant Habit Context` with Tracked Habits (streak note) + Today's Status (✓/○)
- [x] `buildCombinedContext()` extended with optional `habitBlock`, capped at 500 chars, priority 4 (lowest)
- [x] `AIPanel.tsx` reads `sovereign_habits` + `sovereign_habit_log` in isolated try/catch, passes to `getHabitContext()`
- [x] `habitsIncluded` state added; cleared on new send and stop
- [x] Header indicator refactored to a mapped array — cleanly handles any combination of memory / planner / vision / habits
- [x] `contextSources` correctly includes "Habits" when habit block is present

---

## Phase 2.2 — Context Budgeting & Source Attribution (Complete)
_Prevent context overflow and give the AI explicit source labels for grounded responses_

- [x] `trimContextSection(section, maxChars)` — heading-aware trim, word-boundary safe, appends "…(trimmed for length.)"
- [x] `buildCombinedContext({ memoryBlock, plannerBlock, visionBlock })` — per-section caps (900 / 700 / 700), 2000-char total budget, priority memory > planner > vision; drops sections that don't fit
- [x] `CombinedContextResult { combined, sources }` — returns the sources that actually made it in
- [x] `AIPanel.tsx` uses `buildCombinedContext()` instead of manual join; sends `contextSources` array to API
- [x] `app/api/chat/route.ts` accepts `contextSources?: string[]`; appends source list to system prompt
- [x] AI instructed to use natural attribution phrases and never expose implementation details
- [x] All existing streaming / Stop / Retry / Save to Memory behavior preserved

---

## Phase 2.1 — Long-Term Vision Context (Complete)
_AI assistant now surfaces 1yr/3yr/5yr vision entries on strategy and direction questions_

- [x] `lib/memory/context.ts` — new `VisionData` interface `{ yr1?, yr3?, yr5? }` and `getVisionContext()` export
- [x] 21 vision trigger keywords: long term, vision, goal/goals, direction, roadmap, strategy, 1/one/3/three/5/five/10/ten year, future, north star, where am I going, what should I build, where do I want
- [x] Formats as `## Relevant Vision Context` with 1-Year / 3-Year / 5-Year subsections; empty sections omitted
- [x] `AIPanel.tsx` reads `sovereign_planner_1yr/3yr/5yr` (raw `string[]`), each in its own try/catch
- [x] Vision block joined with memory + planner blocks into combined `memoryContext` payload
- [x] `visionIncluded` state added; cleared on stop and new send
- [x] Header indicator updated to show any combination of memory / planner / vision

---

## Phase 2.0 — Planner-Aware AI Context (Complete)
_AI assistant now reads daily/weekly/monthly planner entries when answering planning questions_

- [x] `lib/memory/context.ts` — new `getPlannerContext(query, plannerData)` export
- [x] `PlannerData` interface: `{ daily?, weekly?, monthly? }` — each an array of display strings
- [x] 13 trigger keywords route planner queries to planner context (today, focus, priorit, work on, weekly, etc.)
- [x] Formats as `## Relevant Planner Context` with Today / Weekly / Monthly subsections
- [x] Daily + weekly items prefixed `[x]`/`[ ]` to show completion state
- [x] `AIPanel.tsx` reads and parses all three planner keys safely, each in its own try/catch
- [x] Memory context + planner context combined into one `memoryContext` string — both or either can be present
- [x] Header indicator updated: shows memory count, planner, or both; hidden when no context active
- [x] Streaming, Stop, Retry, Save to Memory all fully preserved

---

## Phase 1.9 — Save to Memory from AI (Complete)
_Close the loop: save useful AI responses directly into the Memory Engine_

- [x] "🧠 Save to memory" button on every completed assistant message (hidden while streaming, hidden on errors)
- [x] Click opens save modal with pre-filled: auto-generated title, type (Note), importance (Medium), inferred tags
- [x] Tag inference from user prompt: `ai-response` always + `bitcoin`, `focus`, `wealth`, `strategy`, `ai` by keyword
- [x] Editable title, type (all 9), importance (all 4), tags (chip UI with Enter/comma add + × remove)
- [x] Duplicate detection: exact content match against `sovereign_memory_items` before saving
- [x] Button state changes: idle → "✓ Saved to memory" or "Already saved" after action
- [x] All saved items use `source: "AI"`, appear immediately in `/memory` and `MemoryWidget`

---

## Phase 1.8 — Memory-Aware AI (Complete)
_Connect Memory Engine to AI assistant for grounded, context-aware responses_

- [x] `AIPanel.tsx` reads `sovereign_memory_items` + `sovereign_projects` on every send
- [x] Calls `getRelevantMemoryContext()` — top 5 results by keyword/tag/people scoring
- [x] Sends `memoryContext` string in POST payload to `/api/chat`
- [x] `/api/chat` injects context into system prompt when present; omits when no memories found
- [x] AI instructed to reference context naturally, not announce it or fabricate beyond it
- [x] Subtle header indicator: "Using N relevant memories" (violet dot, hidden when idle)
- [x] Stop and Retry behavior fully preserved; malformed localStorage handled gracefully

---

## Phase 1.7 — Memory & Context Engine (Complete)
_Local-first knowledge base with AI-ready context retrieval_

- [x] `lib/types/memory.ts` — `MemoryItem`, `MemoryType`, `MemoryImportance`, `MemorySource` types
- [x] `lib/keys.ts` — `sovereign_memory_items` key added to registry
- [x] `lib/memory/context.ts` — `getRelevantMemoryContext()` keyword/tag/people scoring, top 5 results
- [x] `/memory` page — quick capture, 9 types, 4 importance levels, search, filters, card grid, full edit modal
- [x] Auto-title from captured text (first sentence or first 8 words)
- [x] Tag system with chip UI (add via Enter/comma, × to remove)
- [x] Related people and related projects linking
- [x] Delete with two-step confirmation
- [x] Homepage Memory Widget — total count, high-priority count, 4 recent items, link to /memory
- [x] `MemoryWidget` added to Command Center between Projects and AI sections

---

## Phase 2 — Module Depth
_Deepen and improve existing modules_

- [ ] **Command Center redesign** — cleaner card layout, collapsible panels, better mobile
- [ ] **Bitcoin panel** — add block height, mempool fees, sats per dollar display
- [ ] **BTC stack** — add DCA cost basis, unrealized gain/loss, chart
- [ ] **Planner** — add priority tagging, drag-to-reorder, carry-over from previous day
- [ ] **Content Engine** — save analysis history, batch analyze multiple videos
- [ ] **Memory** — export to markdown, connect to AI assistant for grounded context
- [x] **Projects** — drag-to-reorder tasks, overdue digest on homepage, smart due date UX, advanced filters/search, Today view, Weekly Review AI modal
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
