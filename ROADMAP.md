# ROADMAP.md — Sovereign OS

> A personal AI operating system for the AI-powered digital era. This roadmap covers the evolution from Signal Dashboard into a fully realized Sovereign OS.

_Last updated: 2026-06-18 (v4.7)_

---

## Phase 4.0 — Supabase Foundation (Complete)
_Install Supabase client, define schema, add status visibility and docs. No data movement yet._

- [x] `npm install @supabase/supabase-js` — package installed
- [x] `lib/supabase/client.ts` — `getSupabaseClient()` singleton; returns null when env vars missing; app continues in local-only mode unchanged
- [x] `lib/supabase/server.ts` — `getSupabaseServer()` for Route Handlers and Server Components; created per-request, never at module level
- [x] `lib/supabase/status.ts` — `getSupabaseStatus()` returns configured/urlPresent/anonKeyPresent/mode; safe on client or server
- [x] `supabase/schema.sql` — 9 tables: profiles, projects, project_tasks, memory_items, content_items, focus_sessions, planner_entries, habits, habit_logs. jsonb for arrays/metadata. Indexes. `set_updated_at()` trigger. RLS notes for v4.3.
- [x] `docs/SUPABASE_SYNC_PLAN.md` — architecture doc: sync strategy, conflict handling, migration phases v4.0–v4.4, backup approach, workspace architecture
- [x] `/settings` page rebuilt from placeholder → real page: Persistence Mode panel, Supabase status, setup steps, Sync Roadmap, Data Export button, System Info
- [x] `components/settings/StorageExport.tsx` — exports all sovereign_ keys to dated JSON backup file
- [x] Settings "Soon" badge removed from sidebar; active-state detection extended to system nav
- [x] **No Supabase reads or writes** — localStorage remains sole source of truth. v4.1 adds dual-write.
- [x] All lint/typecheck/build clean

## Phase 4.1 — Dual Write: Memory (Complete)
_Memory items write to localStorage + Supabase in parallel._

- [x] `lib/repositories/memoryRepository.ts` — `DualWriteResult`, `saveMemoryItemDual`, `deleteMemoryItemDual`
- [x] `/memory` page — async capture/save/delete with sync status indicator ("Saving…" / "Synced ✓" / "Saved locally")
- [x] `AIPanel.tsx` — `commitSave()` async; shows "Saved + synced" vs "Saved locally"
- [x] `components/settings/MemorySyncStatus.tsx` — live item count + sync mode
- [x] `/settings` — Memory Store section + roadmap v4.1 marker

## Phase 4.2 — Dual Write: All Core Modules (Complete)
_Projects, Tasks, Content, Focus Sessions all dual-write to localStorage + Supabase._

- [x] `lib/repositories/projectRepository.ts` — Projects + ProjectTasks; `upsertProjectSupabase`, `upsertProjectTaskSupabase`, `deleteProjectTaskSupabase`; full dual-write helpers
- [x] `lib/repositories/contentRepository.ts` — ContentItems; `upsertContentItemSupabase`; full dual-write helpers
- [x] `lib/repositories/focusSessionRepository.ts` — FocusSessions; `upsertFocusSessionSupabase`; full dual-write helper; camelCase→snake_case row mapper
- [x] `/projects` page — all mutations fire background Supabase upserts (reorder excluded — no order field in schema)
- [x] `ContentPipeline.tsx` — `handleSave`/`handleArchive` fire background upserts; `saveToMemory` uses `saveMemoryItemDual`
- [x] `/focus` page — `persistSessions(updated, changed)` fires background Supabase upsert; `handleSaveReview` memory save uses `saveMemoryItemDual`
- [x] `/settings` — Sync Coverage table (5 modules covered, Planner/Habits local-only); roadmap v4.2 current; version v4.2

## Phase 4.3 — Sync Health + Manual Restore (Complete)
_Per-module sync status visibility and backup restore in settings._

- [x] `lib/supabase/syncHealth.ts` — `recordSyncResult()` + `getSyncHealth()` report
- [x] All repositories call `recordSyncResult()` after every Supabase write attempt
- [x] `components/settings/SyncHealth.tsx` — per-module table with local counts + last-sync results
- [x] `StorageExport.tsx` rewritten — Export (unchanged) + Restore from Backup (new, with preview + confirmation)
- [x] `lib/keys.ts` — `KEYS.SYNC_STATUS` added

## Phase 4.4 — Auth Readiness (Complete)
_Optional Supabase auth; user_id prep; app stays fully local._

- [x] `lib/supabase/authStatus.ts` — `getAuthStatus()`, `getCachedUserId()`, `initAuthListener()`, `sendMagicLink()`, `signOut()`
- [x] `lib/supabase/client.ts` — `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`
- [x] `components/auth/AuthListener.tsx` — invisible layout component; initialises auth state listener on mount
- [x] All 4 repositories — `user_id: getCachedUserId()` in row mappers (null when anonymous)
- [x] `components/settings/AuthStatus.tsx` — mode-aware panel with magic link sign-in + sign-out
- [x] `/settings` — Identity & Auth section; v4.4 current in roadmap
- [x] `docs/SUPABASE_AUTH_PLAN.md` — auth modes, RLS plan, migration strategy, workspace architecture
- [x] App works identically for anonymous users — no gating, no forced login

## Phase 4.5 — Migration Assistant (Complete)
_Manual opt-in migration of localStorage data to Supabase._

- [x] `lib/supabase/localMigration.ts` — `analyzeLocalDataForMigration()` (dry run) + `migrateLocalDataToSupabase()` (write, requires auth)
- [x] `components/settings/MigrationAssistant.tsx` — analyze → preview → confirm → migrate → result flow; 6 UI phases
- [x] Auth gate: shows "Sign in first" message when not authenticated
- [x] Dry-run table: local count, eligible count, skipped count, warnings per module
- [x] Confirmation checkbox required before migration runs
- [x] Continue-on-error: individual item failures tracked, migration continues
- [x] Result table: succeeded/failed per module with error messages
- [x] localStorage never modified at any step
- [x] Upserts use existing item ids — idempotent; safe to re-run

## Phase 4.6 — Supabase Read Preview (Complete)
_Read-only inspection of Supabase data for post-migration verification._

- [x] `lib/supabase/readPreview.ts` — `fetchSupabasePreview()`: count + latest-5 per module; local vs Supabase comparison
- [x] `components/settings/SupabaseReadPreview.tsx` — 4-phase UI; expandable module rows; DiffBadge; persistent verification warning
- [x] Auth gate: shows sign-in prompt when unauthenticated
- [x] No writes, merges, or deletes at any step
- [x] Amber "Verification only" banner always visible when data is loaded
- [x] Refresh button for re-fetching without reset

## Phase 4.7 — Controlled Supabase → localStorage Restore (Complete)
_Manual, module-by-module recovery of Supabase data into localStorage. Two merge strategies. Backup before every write._

- [x] `lib/supabase/restoreFromSupabase.ts` — `previewSupabaseRestore()`, `restoreModuleFromSupabase(module, { mode })`, `backupLocalModule(module)`
- [x] Reverse row mappers for all 5 modules: camelCase local types ↔ snake_case Supabase rows
- [x] Two restore modes: `replace_local_module` (discard local, write Supabase) + `merge_by_id` (last-write-wins by `updated_at`)
- [x] Backup: `backupLocalModule()` triggers browser download of current localStorage module before any write
- [x] Validation: `isNonEmptyString()` guards; invalid rows skipped and counted, never written
- [x] Auth required: `getCachedUserId() !== null` gate
- [x] Supabase rows never modified or deleted at any step
- [x] `components/settings/SupabaseRestore.tsx` — 6-phase UI: idle → previewing → preview (module cards) → confirm (mode picker + checkbox) → restoring → done/error
- [x] ModuleCard: click-to-select; shows local/Supabase counts and diff label
- [x] Done phase: full result detail (fetched, valid, invalid, new/updated/kept, total written)
- [x] Data Recovery section added to `/settings`; version bumped to v4.7

## Phase 4.8 — RLS (Planned)
- [ ] Row-level security enabled on all tables
- [ ] Policy: `auth.uid() = user_id` on all tables
- [ ] Null `user_id` rows claimed or migrated before RLS activation
- [ ] Data private by default

## Phase 4.9 — Read Shift (Planned)
- [ ] Components read from Supabase on mount
- [ ] localStorage as write-through cache
- [ ] Conflict resolution: last-write-wins by `updated_at`
- [ ] Offline: reads from localStorage; queued sync on reconnect


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

## Phase 3.1.1 — Stability & Polish (Complete)
_Full navigation audit, empty states, mobile QA, data safety_

- [x] **Navigation audit** — `/briefing` added to sidebar MODULE_NAV; Memory href fixed `/narrative` → `/memory` in both Sidebar and MobileNav
- [x] **Mobile nav rebuild** — MobileNav trimmed to 6 items: Home / Focus / Projects / Content / Planner / Memory; removed B-Roll and Brand (accessible via sidebar); fixed overflow-x removed
- [x] **Empty states** — `/focus` priorities empty state upgraded with icon, description, and CTA links to Projects + Planner; `/briefing` gets a dedicated full-page empty state when no data exists (no projects, tasks, planner items, or habits) with links to all modules
- [x] **Briefing SSR guard** — `safeRead()` in briefing page now checks `typeof window === "undefined"` for correctness
- [x] **Mobile score rings** — focus page score row uses `gap-4 sm:gap-8` and `p-4 sm:p-6` to prevent horizontal overflow on small screens
- [x] **Docs** — PROJECT_STATE.md updated to v3.1.1, Known Technical Debt section expanded with Supabase roadmap note
- [x] All lint/typecheck/build clean

---

## Phase 3.1 — Execution Engine (Complete)
_Focus → Work Session → Review → Memory → Tomorrow's Focus_

- [x] `lib/types/execution.ts` — FocusSession type with status, timing, review fields, savedToMemory flag
- [x] KEYS.FOCUS_SESSIONS — localStorage key added
- [x] "Start Focus Session" button on each Top 3 priority — 25/45/60/90 min picker
- [x] ActiveSessionPanel — live elapsed timer, Complete/Abandon controls
- [x] ReviewModal — completedSummary, blockers, nextAction, Save to Memory toggle
- [x] Session → Memory auto-save: creates MemoryItem type "Note" with tags focus-session + execution
- [x] Today's Sessions history section on /focus: completed + abandoned, total focused minutes
- [x] FocusEngineCard: shows active session state + focused-minutes-today stat
- [x] AIRefinePanel: includes today's session history in prompt context
- [x] All lint/typecheck/build clean

---

## Phase 3.0 — Focus Engine (Complete)
_Transform Sovereign OS from a collection of tools into a daily execution system_

- [x] `lib/focus/engine.ts` — `computeFocusEngine(FocusEngineInput)` pure utility; no side effects
- [x] `FocusEngineResult`: `{ generatedAt, topThree[], whyItMatters[], focusBlocks[], avoidList[], momentumScore, alignmentScore, aiPromptContext }`
- [x] Candidate scoring from 7 sources: overdue tasks (100+), overdue projects (90+), critical tasks (70), content deadlines (65), high tasks (60), planner items (55), project next actions (50)
- [x] Why It Matters per priority: `whyNow` (urgency description), `supportsProject`, optional `supportsVision` (vision keyword match), `impact`
- [x] Deterministic Focus Blocks: 09:00 / 10:30 / 11:00 / 12:00 / 13:30 / 15:00 — content-aware type labels (deep-work / admin / creator / recovery / review)
- [x] Avoid List: low-priority work, paused projects, ideation spirals, scope creep, research rabbit holes
- [x] Momentum Score: `clamp(40 + habitBonus(0–40) + taskScore(0–20) + streakBonus(0–15) − overduePenalty(7/item max 35), 0, 100)`
- [x] Alignment Score: daily plan (+20) + high-signal top priority (+30) + vision keyword overlap (+25) + open weekly goals (+25) — clamped 0–100
- [x] `app/focus/page.tsx` — premium page: SVG score rings, expandable priority cards, focus schedule blocks, avoid list, AI refinement streaming panel
- [x] `components/FocusEngineCard.tsx` — homepage card: top priority, #2/#3 mini tiles, momentum + alignment progress bars
- [x] `components/Sidebar.tsx` — `/focus` added as first MODULE_NAV entry
- [x] `app/page.tsx` — `FocusEngineCard` added to Today section after `DailyBriefingCard`
- [x] All lint/typecheck/build clean

---

## Phase 2.7 — Content Context Injection (Complete)
_AI assistant automatically loads content pipeline context on creator/publishing queries_

- [x] `getContentContext(query, contentItems, projects, memoryItems)` added to `lib/memory/context.ts`
- [x] 20 trigger keywords: content, create, creator, post, publish, article, blog, newsletter, podcast, youtube, instagram, linkedin, reel, video, script, caption, crypto mondays, dwt, repurpose, outline
- [x] Scoring: title/description/platform keyword match, platform-in-query boost (+5), Ready status (+3), overdue (+4), due within 7 days (+2), priority boost (Critical +4, High +3)
- [x] Returns top 4 matching non-archived items formatted as structured blocks with status, platform, format, priority, publish date (⚠️ overdue), angle, project link, notes snippet
- [x] `contentBlock` added as second priority in `buildCombinedContext()` — project > content > memory > planner > vision > habits; cap 800 chars
- [x] `AIPanel.tsx`: reads `sovereign_content_items`, calls `getContentContext()`, passes `contentBlock`, `contentIncluded` state, "content" in indicator
- [x] `/api/chat`: added "your content pipeline shows…" as attribution phrase
- [x] All lint/typecheck/build clean

---

## Phase 2.6 — Content Engine Pipeline (Complete)
_Full content management system: ideas → drafts → publishing pipeline with AI tools_

- [x] `lib/types/content.ts` — `ContentItem` type: status, platforms[], priority, format, description, notes, related_project_id, publish_date
- [x] `KEYS.CONTENT_ITEMS: "sovereign_content_items"` added to key registry
- [x] `app/api/content-chat/route.ts` — streaming AI route with per-item context, "outline" + "repurpose" presets
- [x] `components/content/ContentPipeline.tsx` — full CRUD component: filter bar (search/status/platform/priority/archived), content grid with cards, add/edit modal (Overview + AI tabs), overdue alerts
- [x] Content modal Overview tab: title, status, priority, platforms (multi-select chips), format, publish date, hook/angle, related project, notes/draft
- [x] Content modal AI tab: "Generate Outline" + "Repurpose This" streaming presets, custom question input, "Save to Memory" on completed output
- [x] `components/ContentWidget.tsx` — homepage widget: Ideas/Drafting/Ready counts, overdue alert, upcoming 4 items with status badge + platform + date
- [x] `app/page.tsx` — Content section added between Projects and Memory
- [x] `app/content/page.tsx` — "Pipeline" tab added as default; existing Research/Draft/Ideas/B-Roll/Brand tabs preserved
- [x] Platforms: YouTube, Instagram, LinkedIn, Blog, Podcast, Newsletter, Crypto Mondays, DWT
- [x] Statuses: Idea, Drafting, Ready, Published, Archived
- [x] All lint/typecheck/build clean

---

## Phase 2.5 — Project Context Injection (Complete)
_AI assistant automatically loads full project context when you mention a project by name_

- [x] `getProjectContext(query, projects, projectTasks, memoryItems)` added to `lib/memory/context.ts`
- [x] Matches projects by title (≥50% word overlap) then falls back to category keyword aliases
- [x] Context includes: status, priority, category, due date (with overdue flag), objective, next action, description, task progress (done/total), overdue tasks, open tasks, notes, related memories
- [x] `projectBlock` added as highest priority in `buildCombinedContext()` (project > memory > planner > vision > habits), cap 900 chars
- [x] `AIPanel.tsx` reads `sovereign_project_tasks`, calls `getProjectContext()`, passes `projectBlock` to combiner
- [x] `projectIncluded` state added; "project" appears in context indicator header alongside other sources
- [x] TypeScript strict — no `any`, `npx tsc --noEmit` clean, `npm run build` clean

---

## Phase 2.4 — Daily Briefing Engine (Complete)
_Proactive daily synthesis: projects, tasks, planner, memory, habits → actionable briefing_

- [x] `lib/briefing/daily.ts` — `computeDailyBriefing()` pure utility with typed input/output
- [x] Computes: overdue items, due today, top 3 priorities, high-leverage projects (max 3), relevant memories (Critical/High, max 3), habit focus with streaks, suggested focus block, headline, AI prompt context
- [x] Priority order: overdue → Critical tasks → High tasks → planner items
- [x] `app/briefing/page.tsx` — full briefing page: sections for all computed data, inline AI streaming refinement via /api/chat, Stop/Clear controls
- [x] `components/DailyBriefingCard.tsx` — compact homepage widget: headline, status chips, top 2 priorities, CTA to /briefing
- [x] `app/page.tsx` — new "Today" section with DailyBriefingCard above Signals

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
