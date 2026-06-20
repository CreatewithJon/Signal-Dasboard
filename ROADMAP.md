# ROADMAP.md — Sovereign OS

> A personal AI operating system for the AI-powered digital era. This roadmap covers the evolution from Signal Dashboard into a fully realized Sovereign OS.

_Last updated: 2026-06-19 (v8.1)_

## Phase 8.1 — Feedback Engine (Complete)
_Structured system for capturing friction, bugs, ideas, requests, and insights from real-world usage and beta testing._

- [x] `lib/types/feedback.ts` — FeedbackItem type (type, status, priority, source, workspace_id, conversion)
- [x] `lib/feedback/store.ts` — CRUD store: loadFeedback, createFeedback, updateFeedback, deleteFeedback, setFeedbackStatus, markFeedbackConverted
- [x] `lib/keys.ts` — FEEDBACK key added
- [x] `app/api/feedback-chat/route.ts` — AI analysis endpoint (product intelligence analyst system prompt)
- [x] `app/feedback/page.tsx` — Full feedback page: stats, New/Active, Planned, Insights, Completed, AI Analysis, filters, conversions
- [x] `components/FeedbackCard.tsx` — Operating zone homepage card
- [x] `components/ChiefOfStaffCard.tsx` — Feedback Signal section
- [x] `components/DashboardShell.tsx` — FeedbackCard in Operating zone
- [x] `components/Sidebar.tsx` — /feedback in SYSTEM_NAV
- [x] `docs/FEEDBACK_ENGINE_PLAN.md` — Full architecture doc

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

## Phase 4.8 — Read Mode Toggle (Complete)
_Module-by-module opt-in to Supabase as the read source, with localStorage fallback._

- [x] `lib/supabase/readMode.ts` — `getReadModeConfig()`, `setReadMode()`, `isSupabaseReadEnabled()`, `resetReadModeToLocal()`
- [x] `lib/keys.ts` — `KEYS.READ_MODE_CONFIG` added (`sovereign_read_mode_config`)
- [x] `lib/repositories/memoryRepository.ts` — `getMemoryItems()`: checks read mode, fetches from Supabase, falls back to local; `supabaseRowToMemoryItem()` reverse mapper
- [x] `lib/repositories/projectRepository.ts` — `getProjects()`, `getProjectTasks()`: prepared, not yet wired to projects page UI
- [x] `lib/repositories/contentRepository.ts` — `getContentItems()`: prepared, not yet wired to content page UI
- [x] `lib/repositories/focusSessionRepository.ts` — `getFocusSessions()`: prepared, not yet wired to focus page UI
- [x] `app/memory/page.tsx` — uses `getMemoryItems()` instead of `getMemoryItemsLocal()`; shows read source indicator + fallback notice
- [x] `components/MemoryWidget.tsx` — uses `getMemoryItems()` in async useEffect
- [x] `components/settings/ReadModeSettings.tsx` — 5-module toggle panel; confirmation checkbox for Supabase; "UI pending" badge for non-wired modules; Reset all button; auth/config warnings
- [x] `/settings` — Read Mode section; version v4.8; roadmap updated

## Phase 5.1 — Opportunity Engine (Complete)
_Turn Chief of Staff opportunities into a tracked, scored, convertible system._

- [x] `lib/types/opportunities.ts` — `Opportunity` schema: 8 types, 5 statuses, score 0–100, conversions, related context (people/projects/memories)
- [x] `lib/keys.ts` — `KEYS.OPPORTUNITIES` added
- [x] `lib/opportunities/score.ts` — `scoreOpportunity()`: type weight + status momentum + context depth + description richness + action defined + recency bonus
- [x] `lib/opportunities/store.ts` — CRUD: `loadOpportunities`, `createOpportunity`, `updateOpportunity`, `deleteOpportunity`, `setOpportunityStatus`, `markConverted`. Score auto-recomputed on every save.
- [x] `app/opportunities/page.tsx` — full management page: filter/sort, expand cards, Develop AI modal, Convert modal (4 targets), New/Edit form with project+memory multi-select
- [x] Convert to Project — creates `Project` in `sovereign_projects`
- [x] Convert to Content Item — creates `ContentItem` in `sovereign_content_items`
- [x] Convert to Task — creates `ProjectTask` in `sovereign_project_tasks`
- [x] Convert to Memory — creates `MemoryItem` in `sovereign_memory_items`
- [x] AI "Develop" — sends opportunity context to `/api/chief-chat` for advisor dialogue
- [x] `app/chief/page.tsx` — top 3 stored opps by score + "View all" link; falls back to detected opps
- [x] `components/Sidebar.tsx` + `MobileNav.tsx` — `/opportunities` nav added
- [x] Build clean, lint clean, type-check clean

## Phase 5.0 — Chief of Staff Engine (Complete)
_Transform Sovereign OS from an intelligent dashboard into a proactive executive assistant._

- [x] `lib/chiefOfStaff/engine.ts` — `computeChiefOfStaffBrief(input)`: deterministic synthesis; Executive Summary, Highest Leverage Action, Biggest Risk, Blocked Items, Opportunities (3), Recommended Schedule (3 blocks), Weekly Momentum score, Strategic Alignment score, Reasoning
- [x] `app/chief/page.tsx` — full Executive Brief page with all 7 sections + AI Challenge panel
- [x] `app/api/chief-chat/route.ts` — "Challenge This Plan" AI endpoint with chief-of-staff advisor persona
- [x] `components/ChiefOfStaffCard.tsx` — homepage widget: Highest Leverage Action, Biggest Risk, Momentum/Alignment score rings
- [x] `app/page.tsx` — ChiefOfStaffCard added above DailyBriefingCard in "Today" section
- [x] `components/Sidebar.tsx` — `/chief` nav item first in MODULE_NAV
- [x] `components/MobileNav.tsx` — `/chief` nav item added
- [x] Build clean, lint clean, type-check clean

## Phase 6.4 — Product Readiness Audit (Complete)
_Pre-commercial stability audit: route coverage, feature overlap analysis, data safety, mobile polish, and bug fixes._

- [x] **Route audit** — Verified all 14 major routes load, have nav links, and have empty states. `/chief` silent-null bug fixed. `/opportunities` and `/brand` confirmed as secondary (not in MobileNav, acceptable).
- [x] **Feature overlap analysis** — Documented Chief/Strategy/Goals/Review/Actions/Focus/Briefing as intentionally layered by timeframe. Identified `/briefing` rename opportunity, `/leads` sidebar cleanup, `/narrative` consolidation as v6.5 candidates. No deletions yet.
- [x] **Bug fix: OverdueDigest hardcoded keys** — `components/OverdueDigest.tsx` used raw string constants instead of `KEYS` registry. Fixed to import and use `KEYS.PROJECTS` / `KEYS.PROJECT_TASKS`. Prevents silent drift if key names change.
- [x] **Bug fix: Chief page blank state** — `app/chief/page.tsx` returned `null` silently when `brief` was unavailable. Replaced with friendly guidance message.
- [x] **Bug fix: Homepage header mobile overflow** — `components/DashboardShell.tsx` header with HeroStats pills overflowed at 375px. Fixed with `flex-col sm:flex-row` responsive stacking.
- [x] **Bug fix: TodayCommand inline border conflicts** — Removed inline `borderColor`/`borderTopWidth` styles that conflicted with Tailwind `divide-*` utilities on the 2×2 command grid.
- [x] **Data safety audit** — `safeRead`/`safeWrite` pattern confirmed on 100% of localStorage reads. Key registry centralized. Export/restore flow confirmed gold standard. Focus session stuck-state risk documented.
- [x] **Mobile audit** — Tested patterns at 375/390/430px. 4 specific issues fixed above. 2 remaining (modal max-h, iOS safe-area-inset) deferred to v6.5.
- [x] `docs/PRODUCT_READINESS_AUDIT.md` — Full audit doc: route table, feature overlap map, data safety findings, mobile issue tracker, pre-commercial checklist, known risks, next 5 commits.
- [x] `PROJECT_STATE.md` + `ROADMAP.md` updated to v6.4

## Phase 6.3 — Executive Dashboard Polish (Complete)
_Reorganises the Command Center into a clean executive operating dashboard with clear zones and a "Today's Command" hero._

- [x] `components/TodayCommand.tsx` — "Today's Command" hero: 4-cell command grid (Top Action, Risk, Top Objective, Focus status), momentum score pill header, date label, executive summary excerpt, CTA buttons (Review Week + Start/Continue Focus). Computes full chief + strategy chain from localStorage. Active-session-aware.
- [x] `components/CollapsibleZone.tsx` — Reusable zone wrapper: label + accent gradient divider + chevron toggle. Persists state in sessionStorage (via useEffect, not useState initializer, to avoid SSR hydration mismatch). Extra slot for right-side additions.
- [x] `components/DashboardShell.tsx` — Client shell: compact header (title + HeroStats pills), SystemStatus, TodayCommand, then 5 collapsible zones: Executive (Chief/Strategy/Goals/Review 2×2), Execution (Actions full + Briefing/Focus 2-col), Operating (Projects/Content/Relationships/Memory 2×2 with OverdueDigest in header), Signal (BTC/Stack + Productivity/Habits), AI. All default open.
- [x] `app/page.tsx` — Simplified to pure server component: fetch BTC, check env, pass props to DashboardShell. Old marketing hero, SectionDivider, and all direct card imports removed.
- [x] Mobile: 2-col grids collapse to stacked on `sm:` breakpoint. No horizontal scroll. Header layout switches to stacked. Zone labels remain legible at all widths.

## Phase 6.2 — Weekly Review Engine (Complete)
_Reviews the current week: completed work, slipped items, wins, blockers, habit consistency, focus stats, strategic alignment, and next-week focus._

- [x] `lib/weeklyReview/engine.ts` — `computeWeeklyReview(input)`: pure deterministic review engine. Week bounds (Mon–Sun), `findCompletedWork()` (tasks Done + updated_at in week, content Published, opps Converted, focus sessions Completed), `findSlippedItems()` (tasks due in week not done, content with publish_date not published, follow-ups <= weekEnd not actioned), `findWins()` (task count, content published, habit ≥70%, focus ≥3 sessions, opps converted), `findBlockers()` (paused projects, active high-priority with no tasks, tasks overdue >14d), `findRelationshipFollowUps()` (due by weekEnd, sorted by priority), `analyzeContentProgress()` (created/movedReady/published this week), `analyzeHabitConsistency()` (score, completionByDay, perfectDays, bestStreak, lowestHabit), `analyzeFocusStats()` (completed/abandoned, totalMinutes, avg, longest, topProject), `analyzeStrategicAlignment()` (completed task projectIds vs top 3 objectives' relatedProjects), `buildRecommendations()` (up to 7: critical slipped, high slipped, blockers, habit rebuild, strategic realignment, action engine top, overdue follow-up), `buildNextWeekFocus()` (up to 5: slipped tasks, strategic objective next action, action engine top, overdue follow-up, slipped content). Also exports `buildWeeklyReviewContext()` for AI panel.
- [x] `app/review/page.tsx` — Full weekly review page. Hero with quick stats (completed, slipped, wins, focus min, alignment %). Sections: Wins grid, Completed Work list (type badge + project), Slipped Items (severity badge + reason), Blockers, Focus Stats + Habit Consistency 2-col grid (habit day grid + lowest habit), Relationship Follow-Ups (Reschedule button), Content Progress (created/ready/published counts), Strategic Alignment (ring + note + strategy link), Recommendations (priority-colored, "→ Task" conversion button), Next Week Focus (numbered list with type badge), AI Analysis panel ("Analyze My Week" + 4 quick prompts), Save to Memory.
- [x] `components/WeeklyReviewCard.tsx` — Homepage widget: completed count, slipped count, focus minutes, alignment %, top next-week focus. Green accent theme. "Full review →" link to /review. Full compute chain.
- [x] `lib/chiefOfStaff/engine.ts` — `ChiefInput.weeklyReview?: WeeklyReview` added. `buildReasoning()` adds slipped items summary note and low alignment warning (< 50%) from last week's review.
- [x] `app/strategy/page.tsx` — Weekly Alignment Note section added before AI Analysis: color-coded alignment score (green/amber/red), completed vs total tasks aligned, note text, slipped items summary, "View full weekly review →" link.
- [x] `app/page.tsx` — `WeeklyReviewCard` inserted between `GoalsCard` and `ActionEngineCard`
- [x] `components/Sidebar.tsx` — `/review` nav added after `/goals`
- [x] `components/MobileNav.tsx` — `/review` nav added after `/goals`; `/review` added to `EXACT_ROUTES`

## Phase 6.1 — Goal Decomposition Engine (Complete)
_Turns strategic objectives into concrete milestones, tasks, content, follow-ups, and opportunities._

- [x] `lib/goalDecomposition/engine.ts` — `computeGoalDecomposition(input)`: pure deterministic decomposition. Theme detection (ai/bitcoin/content/dwt/education/revenue/relationships/general via regex). Per objective: `deriveMilestones()` (30d foundation + optional validation for hard/very-hard + 60d momentum + 90d outcome), `suggestTasks()` (6 templates per theme, deduped against existing open tasks), `suggestContent()` (3 content ideas per theme with format/platform/angle, deduped against existing titles), `suggestFollowUps()` (linked-project people first, then theme-matched templates with existing person preference), `suggestOpportunities()` (2 per theme, deduped against existing). Output: `DecompositionResult` with `decomposedGoals[]` + totals.
- [x] `app/goals/page.tsx` — Full goal decomposition page. Accordion per objective (first open by default). Milestones timeline (30d/60d/90d badges). Suggested tasks with inline project picker (dropdown). Content with format/platform/angle. Follow-ups with Schedule/Save Note. Opportunities with Track button. "Save to Memory" per goal. All conversions write to localStorage. Empty state with /planner link.
- [x] `components/GoalsCard.tsx` — Homepage widget: top objective, next milestone (horizon badge), total suggested action count, "View goals →" link. Full compute chain (graph → focus → briefing → action → chief → strategy → decomposition).
- [x] `lib/chiefOfStaff/engine.ts` — `buildReasoning()` now checks if top strategic objective has no linked projects; adds "🎯 Goal decomposition needed" warning with link to /goals.
- [x] `app/page.tsx` — `GoalsCard` inserted between `StrategicPlannerCard` and `ActionEngineCard`
- [x] `app/strategy/page.tsx` — "Decompose into milestones + actions →" link added after Top Objectives section
- [x] `components/Sidebar.tsx` — `/goals` nav added after `/strategy`
- [x] `components/MobileNav.tsx` — `/goals` nav added after `/strategy`; `/goals` added to `EXACT_ROUTES`

## Phase 6.0 — Strategic Planner (Complete)
_Long-horizon planning layer sitting above Focus Engine, Briefing, Chief of Staff, and Action Engine._

- [x] `lib/strategicPlanner/engine.ts` — `computeStrategicPlan()`: North Star derivation (yr1 vision → category theme), Top Objectives (3–5 scored by priority + tasks + opps), Dependency chain detection (4 patterns), Bottleneck detection (6 types, severity-sorted), Strategic risk detection (6 types), 30/60/90-day horizon plans, Sequencing (ordered steps from critical bottlenecks → objectives → action engine), Confidence score (0–100 from data richness), Reasoning (structured multi-paragraph)
- [x] `app/strategy/page.tsx` — Full premium strategy page: Confidence ring hero, North Star, Top Objectives, 30/60/90 tab switcher, Recommended Sequence, Bottlenecks + Dependencies side-by-side, Strategic Risks, Confidence + Reasoning, Chief Alignment, AI Challenge panel using `/api/chief-chat`
- [x] `components/StrategicPlannerCard.tsx` — Homepage widget: North Star, Top Objective, Primary Bottleneck severity badge, Confidence ring, "Full plan →" link to `/strategy`
- [x] `lib/chiefOfStaff/engine.ts` — `ChiefInput.strategicPlan?` added; `buildReasoning()` checks highest leverage action against strategic objectives; warns on misalignment; surfaces critical bottlenecks
- [x] `app/page.tsx` — `StrategicPlannerCard` added between `ChiefOfStaffCard` and `ActionEngineCard`
- [x] `components/Sidebar.tsx` — `/strategy` nav added after `/chief`
- [x] `components/MobileNav.tsx` — `/strategy` nav added; `/chief` and `/strategy` added to EXACT_ROUTES

## Phase 5.7 — Vector Memory Activation (Complete)
_Semantic search activated end-to-end: dynamic pgvector detection, per-item embedding, batch embed, AI panel integration._

- [x] `lib/vector/vectorDb.ts` — `probeVectorDb(supabase)`: PostgREST column probe (`.select("embedding").limit(0)`); detects 42703 "undefined column" error; returns `{ columnExists, ready }`
- [x] `app/api/vector/status/route.ts` — Dynamic 4-state mode detection (`deterministic-only` → `embedding-provider-ready` → `vector-db-ready` → `semantic-active`). Probes Supabase via `probeVectorDb`; no hardcoded flags.
- [x] `app/api/vector/embed/route.ts` — Embedding persistence: after generating embedding, probes pgvector readiness; if ready, writes `embedding`, `embedding_model`, `embedded_at` to Supabase `memory_items`. Returns `{ persisted: boolean }`.
- [x] `app/api/vector/search/route.ts` — Server-side semantic search: `POST { query, limit }` → generates query embedding → calls `match_memories` Supabase RPC → returns `{ status, ids, source }`. Falls back to keyword at every failure point.
- [x] `lib/vector/semanticMemory.ts` — Removed `VECTOR_DB_READY = false` flag. Semantic path activated: `createEmbedding()` → dynamic `getSupabaseClient()` import → `supabase.rpc("match_memories", ...)`. Graceful fallback at every step.
- [x] `components/AIPanel.tsx` — Fetches `/api/vector/status` on mount; when `semantic-active`, calls `/api/vector/search` per message; merges semantic IDs with keyword results (semantic-first, keyword fill, cap 5); shows `⚡ semantic` badge in context indicator.
- [x] `app/memory/page.tsx` — Select mode with checkboxes; Batch Embed toolbar (select all visible, deselect, progress bar); per-item embed via `/api/vector/embed`; continue-on-error.
- [x] `components/settings/VectorMemorySettings.tsx` — 4-state mode panel with `MODE_CONFIG` + `SETUP_STEPS` records; accent colors per mode.
- [x] `docs/VECTOR_MEMORY_PLAN.md` — Updated to v5.7: dynamic detection, all new files documented, activation checklist revised.

## Phase 5.6 — Vector Memory Foundation (Complete)
_Semantic embedding infrastructure without replacing the deterministic engine._

- [x] `lib/vector/embedding.ts` — `isEmbeddingConfigured()`, `getEmbeddingConfig()`, `formatMemoryForEmbedding()`, `createEmbedding()`. OpenAI text-embedding-3-small (1536d). Safe skipped-state when OPENAI_API_KEY not set.
- [x] `lib/vector/semanticMemory.ts` — `generateMemoryEmbedding()`, `searchMemorySemantic()`. Keyword fallback when vector DB not ready. v5.7 semantic path stubbed with full commented implementation.
- [x] `app/api/vector/status/route.ts` — GET endpoint; returns `embeddingConfigured`, `provider`, `model`, `dimensions`, `vectorDbReady`, `mode`, `supabaseConfigured`. Called by client components that can't read server env vars.
- [x] `app/api/vector/embed/route.ts` — POST `{ text, memoryId }`; returns `{ status: ok|skipped|error, dimensions, model }`. v5.6: embedding generated, not persisted (no pgvector column yet).
- [x] `components/settings/VectorMemorySettings.tsx` — Client component: provider status, pgvector readiness, mode badge, "Test Embedding" button (only if configured), setup instructions.
- [x] `/settings` — Vector Memory section added before Data Recovery.
- [x] `app/memory/page.tsx` — Fetches `/api/vector/status` on load; passes `embeddingConfigured` to modal; "Embed" button in modal header (only shown when configured); shows dimensions on success.
- [x] `supabase/schema.sql` — Commented pgvector migration section: `enable extension vector`, `alter table memory_items add column embedding vector(1536)`, `match_memories` RPC function, IVFFlat index.
- [x] `docs/VECTOR_MEMORY_PLAN.md` — Architecture doc: activation checklist, embedding provider rationale, text format, RPC design, fallback behavior, future phases v5.7–v6.0.
- [x] Build clean, lint clean, type-check clean.

## Phase 7.7 — Revenue Intelligence (Complete)
_Executive revenue layer: pipeline forecasting, goal tracking, risk detection, suggestions, and Chief integration._

- [x] `lib/types/opportunities.ts` — `estimated_value?`, `close_probability?`, `expected_close_date?` added (backwards-compatible)
- [x] `lib/revenue/engine.ts` — Pure `computeRevenueSnapshot()`: totalPipeline/Expected/ClosedRevenue, revenueGap, WorkspaceRevenueSummary[], RevenueRisk[], RevenueSuggestion[]; confidence score 0–100; risk severity Critical/High/Medium; suggestions sorted by priority
- [x] `lib/workspaces/analytics.ts` — `pipelineValue` + `expectedRevenue` added to `WorkspaceAnalytics`; computed from active opps
- [x] `lib/keys.ts` — `REVENUE_SETTINGS` key added
- [x] `app/revenue/page.tsx` — 6-section page: Executive Summary · Workspace Table · Pipeline Forecast · Risks · Suggestions · Goal Tracking
- [x] `components/RevenueCard.tsx` — Compact Executive zone card: forecast, goal gap, progress bar, top workspace, top risk
- [x] `components/settings/RevenueSettings.tsx` — Revenue defaults panel: close probability slider + monthly goal input
- [x] `app/opportunities/page.tsx` — Revenue Intelligence section in `OppForm`: value, close probability, close date, live expected value preview
- [x] `components/DashboardShell.tsx` — `RevenueCard` added to Executive zone
- [x] `components/ChiefOfStaffCard.tsx` — Revenue Signal section (per-workspace expected + gap, total, link)
- [x] `components/Sidebar.tsx` — `/revenue` added to `SYSTEM_NAV`
- [x] `app/settings/page.tsx` — Revenue Defaults section added
- [x] `docs/REVENUE_INTELLIGENCE_PLAN.md` — Architecture doc: scoring logic, workspace revenue, risk rules, suggestion triggers
- [x] `PROJECT_STATE.md` + `ROADMAP.md` → v7.7
- [x] lint ✓ · tsc ✓ · build ✓

## Phase 7.6 — System Health & Observability (Complete)
_Executive visibility dashboard — health of Sovereign OS itself. Not a dev page; an operational command layer._

- [x] `lib/systemHealth/engine.ts` — Pure `computeSystemHealth()` engine: Overall Status (Healthy/Warning/Critical), Storage Health (localStorage + Supabase + sync results), AI Health (Anthropic/OpenAI/Vector), Data Health (counts), Workspace Health (reuses v7.5 analytics), Warnings (sorted Critical→High→Medium). Helpers: `statusColor()`, `statusBg()`, `statusBorder()`, `severityColor()`, `buildSystemRiskNote()`
- [x] `app/system/page.tsx` — Server component wrapper; reads `ANTHROPIC_API_KEY` + `OPENAI_API_KEY` from env; passes boolean flags to client inner component
- [x] `app/system/_inner.tsx` — Client component; 7 sections: Overall Status · Storage Health · AI Health · Data Health · Workspace Health · Warnings · Quick Actions
- [x] `components/SystemHealthCard.tsx` — Compact Executive zone card: status badge, warning counts (C/H/M), sync state, top 2 warnings preview, "Full report →" link
- [x] `components/DashboardShell.tsx` — `SystemHealthCard` added to Executive zone grid
- [x] `components/ChiefOfStaffCard.tsx` — System Risk Note section appended when status ≠ Healthy; natural-language note via `buildSystemRiskNote()`; "Details →" link to `/system`
- [x] `components/Sidebar.tsx` — `/system` (System Health) added as first entry in `SYSTEM_NAV`
- [x] `docs/SYSTEM_HEALTH_PLAN.md` — Architecture doc: health scoring logic, warning generation rules, file inventory, future enhancements
- [x] `PROJECT_STATE.md` + `ROADMAP.md` updated to v7.6
- [x] lint ✓ · tsc ✓ · build ✓

## Phase 7.5 — Workspace Analytics (Complete)
_Per-workspace operational snapshot: risk/momentum scores, analytics page, sidebar link, Chief integration._

## Phase 7.4 — Workspace Activation (Complete)
_Functional organizational layer: workspace_id stamping, filterByWorkspace(), WorkspaceBadge, WorkspaceSwitcher, TodayCommand badges._

## Phase 7.3 — Private Beta Landing (Complete)
_Clean /beta route for invited users — hero, modules overview, data ownership, limitations, disclaimer, CTAs._

- [x] `app/beta/page.tsx` — Server component, static (175B). Hero + beta pill, What It Does (3 points), Who It's For (3 personas), 8 Core Modules grid (with nav links), Data Ownership (local-first, export, no tracking, AI context, Supabase optional), Beta Limitations (8 honest items), Beta Disclaimer (4 paragraphs: private beta / not professional advice / local-first risk / Supabase experimental), Bottom CTA block
- [x] `components/Sidebar.tsx` — "Beta Overview" added to SYSTEM_NAV (desktop sidebar only, not MobileNav)
- [x] `app/welcome/page.tsx` — "Beta Overview" link added to bottom CTA row
- [x] `PROJECT_STATE.md` + `ROADMAP.md` + `BETA_CHECKLIST.md` + `DEMO_SCRIPT.md` updated to v7.3
- [x] lint ✓ · tsc ✓ · build ✓

## Phase 7.2 — Beta Demo Hardening (Complete)
_Demo Mode with backup-and-swap, DemoModeBadge, settings panel, safe demo data, and updated docs._

- [x] `lib/keys.ts` — `DEMO_MODE` + `DEMO_BACKUP` added
- [x] `lib/demo/data.ts` — Fictional demo data: 3 projects, 5 tasks, 5 memory items, 4 relationships, 3 opportunities, 5 productivity tasks
- [x] `lib/demo/demoMode.ts` — `enterDemoMode` (backup → inject) / `exitDemoMode` (restore → clear) / `resetDemoData` (re-inject, backup safe) / `isDemoMode`
- [x] `components/DemoModeBadge.tsx` — Fixed red badge shown when demo is active; "Exit" button restores real data and reloads
- [x] `components/settings/DemoModeSettings.tsx` — Pre-demo export warning (always visible), toggle, affected-data pills, Reset Demo Data button
- [x] `app/settings/page.tsx` — "Demo & Privacy" section added above Workspaces; version → v7.2
- [x] `app/layout.tsx` — `<DemoModeBadge />` mounted in root layout
- [x] `docs/DEMO_SCRIPT.md` — 4-step setup checklist, What NOT to Show table, safe walkthrough order, post-demo restore instructions
- [x] `docs/BETA_CHECKLIST.md` — v6.9/v7.1 items marked done; 4b. Demo Readiness section added; score updated 6.4→7.5
- [x] `PROJECT_STATE.md` + `ROADMAP.md` updated to v7.2
- [x] lint ✓ · tsc ✓ · build ✓

## Phase 7.1 — Welcome + First-Run Onboarding (Complete)
_First-run detection, /welcome guide page, WelcomeBanner on homepage, Setup Progress checklist in settings._

- [x] `lib/keys.ts` — `WELCOME_SEEN` + `SETUP_CHECKLIST` keys added
- [x] `app/welcome/page.tsx` — Full welcome guide: hero, "What This Is" (3-point card), "First 5 Actions" (Steps → /projects /memory /relationships /opportunities /daily), "Your Data, Your Rules" (4-point card), Local vs Cloud 2-col grid, "Go to Command Center" CTA
- [x] `components/WelcomeBanner.tsx` — Subtle indigo one-liner on homepage; reads `WELCOME_SEEN`; shows if not set; dismissible (sets key); links to `/welcome`
- [x] `components/settings/SetupProgress.tsx` — 7-item checklist; 5 auto-detected from localStorage (projects, memory, relationships, opportunities, daily rhythm); 2 manual toggles (export, Supabase); progress bar + %; reads/writes `KEYS.SETUP_CHECKLIST`
- [x] `components/DashboardShell.tsx` — `<WelcomeBanner />` mounted between System Status row and TodayCommand
- [x] `app/settings/page.tsx` — "Onboarding" section with `<SetupProgress />` added above Workspaces
- [x] `PROJECT_STATE.md` + `ROADMAP.md` updated to v7.1
- [x] lint ✓ · tsc ✓ · build ✓

## Phase 7.0 — Supabase RLS Policy Plan (Complete)
_Row-level security policies for all 5 synced tables. Required before external beta._

- [x] `supabase/schema.sql` — v7.0 RLS section: `ENABLE ROW LEVEL SECURITY` + `for all` policy (`auth.uid() = user_id` with `WITH CHECK`) on `memory_items`, `projects`, `project_tasks`, `content_items`, `focus_sessions`. Null `user_id` migration guide. Verification queries. Disabled dev bypass comment block.
- [x] `docs/RLS_SECURITY_PLAN.md` — Full security plan: auth model, policy design, anonymous local mode, null user_id migration (step-by-step SQL), testing checklist (pre/post RLS + multi-user), future extensions roadmap.
- [x] `components/settings/AuthStatus.tsx` — Amber RLS warning in authenticated mode ("RLS required before external beta"). Amber null `user_id` warning in supabase-auth-ready mode. Stale "v4.5" copy removed.
- [x] `PROJECT_STATE.md` + `ROADMAP.md` updated to v7.0
- [x] Tables NOT covered (local-only): `planner_entries`, `habits`, `habit_logs` — documented; RLS added when sync ships
- [x] No app behavior changes — schema/docs/warning UI only
- [x] lint ✓ · tsc ✓ · build ✓

## Phase 6.9 — Focus Session Cleanup (Complete)
_Auto-close stale Active sessions on app startup. Prevents stuck "Active" state from browser closes._

- [x] `lib/focus/cleanup.ts` — `cleanupStaleFocusSessions()`: finds Active sessions with `startedAt` > 24h ago, marks Abandoned, sets `endedAt` + `actualMinutes`, appends auto-close note. Returns `CleanupResult { count, timestamp }`. Writes to `KEYS.FOCUS_CLEANUP_LOG`.
- [x] `components/FocusSessionCleanup.tsx` — Invisible client component; runs cleanup once on mount.
- [x] `app/layout.tsx` — `<FocusSessionCleanup />` mounted in root layout alongside `StorageMigration` and `AuthListener`.
- [x] `components/settings/FocusCleanupStatus.tsx` — Reads cleanup log; shows "last cleanup" row in System Info section of `/settings`.
- [x] `lib/keys.ts` — `FOCUS_CLEANUP_LOG` added.
- [x] `app/settings/page.tsx` — `FocusCleanupStatus` added to System section; version → v6.9.
- [x] lint ✓ · tsc ✓ · build ✓

## Phase 6.8 — Commercial Readiness Plan (Complete)
_Planning and documentation milestone. Defines the path from personal OS to productized Agentic Systems offering._

- [x] `docs/COMMERCIAL_READINESS_PLAN.md` — Full commercial strategy: capabilities inventory, ideal first users, product positioning, 5 product offers (Personal/Founder/Creator/Client/Agentic Systems Internal), personal-only vs. productizable analysis, technical blockers, security/privacy requirements, workspace/multi-user roadmap, pricing experiments, beta rollout plan (4 phases), demo script summary, sales narrative.
- [x] `docs/DEMO_SCRIPT.md` — 10-minute live demo flow: minute-by-minute arc across Command Center, Chief of Staff, Strategy, Goals, Actions, Daily Rhythm, Memory, Relationships, Opportunities, Settings. Setup checklist, demo tips, screen recording checklist.
- [x] `docs/BETA_CHECKLIST.md` — Pre-beta readiness tracker: critical fixes (RLS, stuck sessions, API key strategy), auth/isolation matrix, Supabase RLS SQL guide, onboarding requirements, export/backup matrix, 5-device mobile test matrix, known limitations disclosure, feedback collection plan with 6 activation metrics. Beta readiness score: **6.4/10**.
- [x] `PROJECT_STATE.md` + `ROADMAP.md` updated to v6.8
- [x] No code changes — docs-only milestone
- [x] lint ✓ · tsc ✓ · build ✓

## Phase 6.7 — Workspace Foundation (Complete)
_Metadata-only workspace model: schema, CRUD in settings, sidebar switcher. No data filtering yet._

- [x] `lib/types/workspace.ts` — `Workspace` type: id, name, type (Personal/Company/Project/Client/Community/Education), description, color, archived, created_at, updated_at. `DEFAULT_WORKSPACE` (Personal, violet). `WORKSPACE_COLORS` (7 presets). `WORKSPACE_TYPE_LABELS`.
- [x] `lib/keys.ts` — `KEYS.WORKSPACES` (`sovereign_workspaces`) + `KEYS.ACTIVE_WORKSPACE_ID` (`sovereign_active_workspace_id`)
- [x] `components/WorkspaceSwitcher.tsx` — Sidebar component: active workspace name + color dot. Dropdown to switch when multiple exist. Auto-seeds Personal default. No data scoping yet.
- [x] `components/settings/WorkspaceSettings.tsx` — Create / edit / archive workspaces. Personal workspace protected from archiving. Color picker (7 presets). Type selector. Info banner explains future filtering.
- [x] `app/settings/page.tsx` — Workspaces section added at top. Version bumped to v6.7.
- [x] `components/Sidebar.tsx` — `WorkspaceSwitcher` mounted in brand header below logo.
- [x] `docs/WORKSPACE_PLAN.md` — Full workspace architecture: schema, 5 planned workspaces, 5 activation phases, data safety contract.
- [x] **No existing data modified.** No `sovereign_*` keys changed. Zero migration required.
- [x] lint ✓ · tsc ✓ · build ✓

## Phase 6.6 — Daily Operating Rhythm (Complete)
_Structured daily workflow: Morning Brief → Start Day → Midday Check-In → End of Day._

- [x] `app/daily/page.tsx` — 5-section daily page. Morning Brief auto-computed from engine chain. Start Day: 4-checkbox checklist + 3 priority inputs + "Start Day →". Midday Check-In: 3 text areas + "Save ✓". End of Day: completed/slipped/tomorrow + "Save to Memory" (creates MemoryItem) + "Convert to Tasks" (pushes slipped lines to KEYS.TASKS) + "Wrap Day ✓". Weekly Review shortcut link. Per-day state auto-resets on new calendar day.
- [x] `components/DailyRhythmCard.tsx` — Homepage Execution zone widget: phase badge (Morning/Working/Evening/Wrapped), 4-step progress bar, today's 3 priorities, morning checklist mini-progress. Links to /daily.
- [x] `components/TodayCommand.tsx` — Primary CTA changed: `href={hasActive ? "/focus" : "/daily"}` — "Start Day →" when no active session.
- [x] `lib/keys.ts` — `KEYS.DAILY_RHYTHM` (`sovereign_daily_rhythm`) added.
- [x] `components/Sidebar.tsx` + `MobileNav.tsx` — `/daily` (Daily Rhythm) added to nav.
- [x] `components/DashboardShell.tsx` — `DailyRhythmCard` added to Execution zone.
- [x] lint ✓ · tsc ✓ · build ✓

## Phase 6.5 — Mobile + Modal Polish (Complete)
_Reusable modal infrastructure, iOS safe-area support, Escape-key handling, 44px touch targets._

- [x] `components/ui/AppModal.tsx` — Reusable modal shell. Handles backdrop overlay, click-outside-to-close, Escape key, `max-h-[90vh]` + `overflow-hidden` panel, iOS `env(safe-area-inset-bottom)` padding for bottom-sheet alignment. Props: `open`, `onClose`, `maxWidth` (sm/md/lg/xl/2xl), `align` (center/bottom/top), `accentBorder`, `accentShadow`, `background`, `rounded` (2xl/3xl), `aria-label`.
- [x] `components/MobileNav.tsx` — iOS home-indicator safe-area: outer nav uses `paddingBottom: env(safe-area-inset-bottom)`. Items in inner `h-16` row are unaffected visually. Nav height auto-expands on notched iPhones.
- [x] `app/layout.tsx` — Added `viewport` export with `viewportFit: "cover"` to enable `env(safe-area-inset-*)` on iOS. Main `pb-24` → `pb-32` to clear taller nav on notched devices.
- [x] 9 modals migrated to AppModal across 5 files:
  - `app/actions/page.tsx` — DevelopPlanModal, TaskModal
  - `app/projects/page.tsx` — ProjectModal, WeeklyReviewModal
  - `app/relationships/page.tsx` — AIPanel, PersonForm, NoteModal, ConvertOppModal
  - `app/opportunities/page.tsx` — AIDevelopPanel, ConvertModal, OppForm
  - `app/memory/page.tsx` — MemoryModal
  - `components/content/ContentPipeline.tsx` — ContentModal
- [x] All migrated close buttons: `w-4 h-4` SVGs / bare `✕` text upgraded to `w-10 h-10` / `w-11 h-11` flex containers with `rounded-xl` and hover bg — consistent ≥40px tap targets.
- [x] Escape key support added to all 9 migrated modals (was missing from 7 of them).
- [x] `docs/PRODUCT_READINESS_AUDIT.md` — Pre-commercial checklist modal items marked complete.
- [x] lint ✓ · tsc ✓ · build ✓

## Phase 5.5 — Action Engine (Complete)
_Convert graph insights, opportunities, risks, and signals into scored recommended actions._

- [x] `lib/actionEngine/engine.ts` — 5 generators (graph insights, opportunities, overdue follow-ups, stalled projects, idle content). Scoring: `impact×0.4 + urgency×0.4 + effort×0.2`. Top 10 + 4 category buckets.
- [x] `app/actions/page.tsx` — Urgent/Strategic/Relationship/Content sections. Each card: Develop Plan (AI modal), → Task (project picker), → Opp, Save to Memory.
- [x] `components/ActionEngineCard.tsx` — Homepage widget: top action + urgent count.
- [x] Chief of Staff integration: `topAction` feeds `findHighestLeverageAction` (preferred over heuristics when critical/high).
- [x] Sidebar + MobileNav: `/actions` added.

## Phase 5.4 — Knowledge Graph Engine (Complete)
_Deterministic relationship graph mapping connections between People, Projects, Opportunities, Content, and Memory._

- [x] `lib/knowledgeGraph/engine.ts` — 9 edge types, BFS clustering, 7 insight generators, top 5 per run.
- [x] `app/graph/page.tsx` — Stats, Insights (with AI Explore modal), Clusters, Top Connected Nodes.
- [x] Chief of Staff integration: `graphInsights` feeds risk detection and opportunity surfacing.

## Phase 5.3 — Relationship Context Injection (Complete)
_Automatically inject relevant relationship context into AI assistant queries._

- [x] `lib/memory/context.ts` — `getRelationshipContext()`: 20+ trigger keywords, 8 scoring signals, top 3 matches.
- [x] `components/AIPanel.tsx` — Shows "relationship in context" indicator when active.

## Phase 5.2 — Relationship Intelligence (Complete)
_Personal CRM engine with follow-up tracking, relationship context, and AI integration._

- [x] `lib/types/relationships.ts` — `Person` type with 8 relationship types, priorities, follow-up scheduling.
- [x] `app/relationships/page.tsx` — Full CRM with filters, overdue badges, AI Explore.
- [x] `components/RelationshipWidget.tsx` — Homepage widget with overdue alerts.

## Phase 5.1 — Opportunity Engine (Complete)
_Turn Chief of Staff opportunities into a tracked, scored, convertible system._

- [x] Full CRUD with scoring, conversion targets (Project/ContentItem/Task/Memory), AI Develop panel.

## Phase 4.9 — RLS (Planned)
- [ ] Row-level security enabled on all tables
- [ ] Policy: `auth.uid() = user_id` on all tables
- [ ] Null `user_id` rows claimed or migrated before RLS activation
- [ ] Data private by default

## Phase 4.10 — Read Shift (Planned)
- [ ] Wire remaining modules to Supabase read (projects, tasks, content, focus sessions)
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
