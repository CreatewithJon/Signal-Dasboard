# PROJECT_STATE.md — Sovereign OS

_Last updated: 2026-06-19 (v7.1 — Welcome + First-Run Onboarding)_

---

## Current State

**Version:** Sovereign OS v7.1 (Welcome + First-Run Onboarding: Complete)

### Welcome + First-Run Onboarding (v7.1)

**`lib/keys.ts`** — Two keys added: `WELCOME_SEEN` (`sovereign_welcome_seen`) + `SETUP_CHECKLIST` (`sovereign_setup_checklist`).

**`app/welcome/page.tsx`** — Full welcome page: Hero (logo + headline + tagline), "What This Is" card (3 points: intelligence engine / private local-first / built around operating rhythm), "Start Here — First 5 Actions" card (5 Step components linking to /projects /memory /relationships /opportunities /daily), "Your Data, Your Rules" card (4 points: export / no analytics / client-side AI context / clear any time), "Local vs Cloud Storage" 2-col grid, bottom CTA button `markSeenAndGo()` → sets `WELCOME_SEEN = true` → routes to `/`.

**`components/WelcomeBanner.tsx`** — Subtle one-liner shown on the homepage when `WELCOME_SEEN` is not set. Indigo-accented pulse dot + "New here? Start with the Welcome Guide" link → `/welcome` + X dismiss button (sets `WELCOME_SEEN = true`, hides banner). Does not force redirect.

**`components/settings/SetupProgress.tsx`** — 7-item first-run checklist. 5 items auto-detected from localStorage (PROJECTS/MEMORY_ITEMS/RELATIONSHIPS/OPPORTUNITIES array length > 0; DAILY_RHYTHM checklistDone). 2 manual toggles: Export Created, Supabase Configured. Progress bar + percentage. Reads/writes `KEYS.SETUP_CHECKLIST`.

**`components/DashboardShell.tsx`** — `<WelcomeBanner />` mounted between System Status row and TodayCommand hero. First-run only (hides after dismissed or after visiting /welcome).

**`app/settings/page.tsx`** — "Onboarding" section added above Workspaces with `<SetupProgress />`.

**Version:** Sovereign OS v7.0 (Supabase RLS Policy Plan: Complete)

### Supabase RLS Policy Plan (v7.0)

**`supabase/schema.sql`** — v7.0 RLS section added at the bottom. For the 5 synced tables (`memory_items`, `projects`, `project_tasks`, `content_items`, `focus_sessions`):
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for each table
- One `for all` policy per table: `auth.uid() = user_id` in both `USING` (read gate) and `WITH CHECK` (write gate)
- Full migration guide for existing `user_id = null` rows (UPDATE statements to claim orphaned rows before enabling RLS)
- Verification queries to confirm RLS is active and policies are in place
- Disabled-by-default comment block for temporary dev bypass (clearly marked DO NOT ENABLE in production)
- Tables NOT covered: `planner_entries`, `habits`, `habit_logs` (local-only, not yet synced)

**`docs/RLS_SECURITY_PLAN.md`** — Full RLS architecture document:
- Current auth model (3 modes: anonymous-local, supabase-auth-ready, authenticated) with table
- Why RLS is required before external users (anon key exposure risk)
- Policy design rationale (why `for all`, why no anonymous read, service role exception)
- Anonymous/local mode explanation (RLS has zero effect on local-only mode)
- Step-by-step null `user_id` migration with verification SQL
- Testing checklist (before + after RLS, multi-user test)
- Future RLS extensions roadmap (v7.1 profiles, v7.2 workspace scoping, v7.5 shared workspace)

**`components/settings/AuthStatus.tsx`** — Two warning banners added:
- **Authenticated mode**: amber "RLS required before external beta" banner with instructions to run `supabase/schema.sql` v7.0 migration and see `docs/RLS_SECURITY_PLAN.md`
- **Supabase Auth Ready mode** (configured, not signed in): amber warning that `user_id = null` rows become inaccessible once RLS is active; advises signing in before enabling RLS

**Version:** Sovereign OS v6.9 (Focus Session Cleanup: Complete)

### Focus Session Cleanup (v6.9)

**`lib/focus/cleanup.ts`** — `cleanupStaleFocusSessions()`: reads `KEYS.FOCUS_SESSIONS`, finds sessions with `status === "Active"` and `startedAt` older than 24 hours, marks them `"Abandoned"`, sets `endedAt` to current ISO timestamp, computes `actualMinutes` from elapsed time, appends "Auto-closed after 24h of inactivity." to notes. Returns `CleanupResult { count, timestamp }`. Writes result to `KEYS.FOCUS_CLEANUP_LOG`.

**`components/FocusSessionCleanup.tsx`** — Invisible client component. Calls `cleanupStaleFocusSessions()` once on mount via `useEffect`. No UI output.

**`app/layout.tsx`** — `<FocusSessionCleanup />` mounted alongside `<StorageMigration />` and `<AuthListener />`. Runs on every app load, client-side only.

**`components/settings/FocusCleanupStatus.tsx`** — Reads `KEYS.FOCUS_CLEANUP_LOG` on mount and renders a `SettingRow`-style line in the System Info section of `/settings`: "Last session cleanup — 0 stale · Jun 19, 3:42 PM" or "2 closed · Jun 19, 3:42 PM".

**`lib/keys.ts`** — `FOCUS_CLEANUP_LOG: "sovereign_focus_cleanup_log"` added.

**`app/settings/page.tsx`** — `FocusCleanupStatus` added to System Info card. Version label bumped to v6.9.

**Version:** Sovereign OS v6.8 (Commercial Readiness Plan: Complete)

### Commercial Readiness Plan (v6.8)

**Planning and documentation milestone.** No code changes. Three strategy documents created to define the path from personal OS to productized offering.

**`docs/COMMERCIAL_READINESS_PLAN.md`** — Full commercial strategy document:
- Current product capabilities inventory (engines, modules, infrastructure)
- Ideal first users (Tier 1: solo founders, content creators, AI builders; Tier 2: small agency owners, Bitcoin-native builders)
- Product positioning vs. Notion, ChatGPT, Monday.com, Clay
- Five product offers: Personal (free/self-hosted), Founder OS ($49/mo), Creator OS ($29/mo), Client OS ($99/mo/workspace), Agentic Systems Internal OS ($500–$2,000 setup + $149/mo retainer)
- What is personal-only vs. productizable today
- Technical blockers before external users (RLS, API key strategy, onboarding, stuck sessions)
- Security and privacy requirements (data ownership, RLS, no analytics without consent)
- Workspace / multi-user roadmap (v6.7 Foundation → v7.0 Tags → v7.1 Filter UI → v7.2 Intelligence → v7.3 Cloud → v7.4 RLS → v7.5 Sharing → v8.0 Team)
- Pricing experiments (Founder OS freemium, lifetime deal, pay-what-you-want, Agentic Systems retainer)
- Beta rollout plan (Phase 0 hardening → Phase 1 closed 5–10 users → Phase 2 community → Phase 3 paid → Phase 4 public launch)
- Sales narrative (problem: tools that don't talk to each other; solution: one private intelligence stack that knows your context)

**`docs/DEMO_SCRIPT.md`** — 10-minute live demo flow:
- Setup checklist (sample data, browser config, zoom)
- Minute-by-minute arc: Command Center → TodayCommand → Chief of Staff → Strategy → Goals → Actions → Daily Rhythm → Memory → Relationships → Opportunities → Settings/Data Ownership → Close
- Demo tips (use real data, pause on intelligence, problem-first framing)
- Screen recording checklist

**`docs/BETA_CHECKLIST.md`** — Pre-beta readiness tracker:
- Pre-beta fixes (critical: RLS, stuck sessions, API key strategy; important: onboarding, error states, mobile)
- Auth / data isolation requirements table with status
- Supabase / RLS implementation guide (SQL policies for all 5 synced tables)
- Onboarding requirements (minimum viable: written guide + demo video; in-app: /welcome route)
- Backup / export requirements (full matrix — mostly done)
- Mobile testing matrix (5 devices × checklist of 9 scenarios)
- Known limitations disclosure for beta users
- Feedback collection plan (in-app form, Discord, weekly check-in template, 6 activation metrics)
- Beta readiness score: **6.4/10** — core product 9/10, data safety 10/10, RLS 4/10, onboarding 3/10

**Version:** Sovereign OS v6.7 (Workspace Foundation: Complete)

### Workspace Foundation (v6.7)

**New file:** `lib/types/workspace.ts` — `Workspace` schema: `id`, `name`, `type` (Personal | Company | Project | Client | Community | Education), `description`, `color` (hex), `archived`, `created_at`, `updated_at`. Exports `DEFAULT_WORKSPACE` (Personal, violet, id="personal"), `WORKSPACE_COLORS` (7 presets), `WORKSPACE_TYPE_LABELS`.

**New keys:** `lib/keys.ts` — `KEYS.WORKSPACES` (`sovereign_workspaces`) + `KEYS.ACTIVE_WORKSPACE_ID` (`sovereign_active_workspace_id`).

**New component:** `components/WorkspaceSwitcher.tsx` — sidebar component showing active workspace name + color dot. Dropdown appears when multiple non-archived workspaces exist. Switching persists to `KEYS.ACTIVE_WORKSPACE_ID`. Personal workspace is auto-seeded on first load. Displays "Data filtering ships in a future update" note in dropdown. No data scoping yet.

**New component:** `components/settings/WorkspaceSettings.tsx` — full CRUD panel in /settings: list active workspaces (color + name + type badge + edit/archive actions), create form (name, type, description, color picker), archive/restore. Personal workspace cannot be archived. All changes write to `KEYS.WORKSPACES`.

**Settings page:** Workspaces section added at the top of /settings (above Persistence Mode). Version label bumped to v6.7.

**Sidebar:** `WorkspaceSwitcher` mounted below the brand logo in the sidebar brand header area.

**New doc:** `docs/WORKSPACE_PLAN.md` — full workspace architecture doc: schema, 5 planned workspaces (Personal, Agentic Systems, DWT, Crypto Mondays, Client), 5 activation phases (v6.7 Foundation → v7.0 Tags → v7.1 Filter UI → v7.2 Intelligence → v7.3 Cloud Sync), data safety contract.

**Data safety:** No existing data modified. All `sovereign_*` keys untouched. Existing data has no `workspace_id` — will be treated as Personal when filtering activates in v7.0.

**Version:** Sovereign OS v6.6 (Daily Operating Rhythm: Complete)

### Daily Operating Rhythm (v6.6)

**New route:** `app/daily/page.tsx` — structured daily workflow page with 5 sections, persisted per-day to `KEYS.DAILY_RHYTHM` (`sovereign_daily_rhythm`). State auto-resets on new calendar day.

**Sections:**
1. **Morning Brief** — auto-computed from Chief/Strategy/Action engines (read-only): top action, risk, objective, executive summary + links to /chief and /actions
2. **Start Your Day** — 4 checkboxes (reviewed brief, calendar, clear mind, set priorities) + 3 priority text inputs + "Start Day →" button; visual progress bar
3. **Midday Check-In** — 3 text areas (completed, blocked, notes) + "Save Check-In ✓" button
4. **End of Day** — 3 text areas (completed, slipped, tomorrow) + "Save to Memory" (creates MemoryItem), "Convert to Tasks" (pushes slipped lines to KEYS.TASKS), "Wrap Day ✓"
5. **Weekly Review shortcut** — link card to /review

**New component:** `components/DailyRhythmCard.tsx` — compact homepage widget showing today's phase (Morning/Working/Evening/Wrapped), 4-step phase progress bar, today's 3 priorities (or default prompt), morning checklist mini-progress. Links to /daily.

**TodayCommand CTA updated:** `href={hasActive ? "/focus" : "/daily"}` — CTA now routes to /daily when no active session, so the primary homepage action is "Start Day →" instead of "Start Focus →".

**Navigation updates:**
- `components/Sidebar.tsx` — `/daily` (Daily Rhythm) added to MODULE_NAV above /briefing
- `components/MobileNav.tsx` — `/daily` (Daily) added to navItems array + EXACT_ROUTES
- `components/DashboardShell.tsx` — `DailyRhythmCard` added to Execution zone below FocusEngineCard
- `lib/keys.ts` — `DAILY_RHYTHM: "sovereign_daily_rhythm"` added

**Version:** Sovereign OS v6.5 (Mobile + Modal Polish: Complete)

### Mobile + Modal Polish (v6.5)

**New file:** `components/ui/AppModal.tsx` — reusable modal shell. Props: `open`, `onClose`, `children`, `maxWidth` (sm/md/lg/xl/2xl), `align` (center/bottom/top), `accentBorder`, `accentShadow`, `background`, `rounded` (2xl/3xl), `aria-label`. Handles: backdrop overlay (click-outside-to-close), Escape key, `max-h-[90vh]` + `overflow-hidden` on the panel, iOS safe-area bottom padding when `align="bottom"`. Inner panel is `flex flex-col` so children using `shrink-0` / `flex-1 overflow-y-auto` get sticky header + scrollable body automatically.

**iOS safe-area support:**
- `components/MobileNav.tsx` — nav now wraps items in an inner `h-16` div, with outer nav using `paddingBottom: "env(safe-area-inset-bottom)"`. Nav expands below 64px on notched iPhones to avoid home indicator overlap. Items remain in the visual 64px zone.
- `app/layout.tsx` — exports `viewport` with `viewportFit: "cover"` to activate `env(safe-area-inset-*)` CSS variables on iOS. Main content `pb-24` increased to `pb-32` to ensure content is never hidden behind the taller safe-area nav.
- `AppModal` bottom-sheet mode — passes `paddingBottom: "env(safe-area-inset-bottom)"` to the panel container for chat/form modals that slide up from the bottom on mobile.

**Modal migration (9 modals → AppModal):**
- `app/actions/page.tsx` — DevelopPlanModal (align=bottom), TaskModal (align=center)
- `app/projects/page.tsx` — ProjectModal (align=top, rounded=3xl), WeeklyReviewModal (align=top, rounded=3xl)
- `app/relationships/page.tsx` — AIPanel chat modal (align=bottom), PersonForm (align=center), NoteModal (align=center), ConvertOppModal (align=center)
- `app/opportunities/page.tsx` — AIDevelopPanel (align=bottom), ConvertModal (align=center), OppForm (align=center)
- `app/memory/page.tsx` — MemoryModal (align=top, rounded=3xl)
- `components/content/ContentPipeline.tsx` — ContentModal (align=bottom)

**Touch target fixes (close buttons):**
All close buttons migrated from small `w-4 h-4` SVGs or bare `✕` text to `w-10 h-10` (or `w-11 h-11`) flex containers with `rounded-xl` and subtle hover background — consistent 40–44px tap targets across all 9 modals. Escape key support added to all modals via AppModal.

**Version:** Sovereign OS v6.4 (Product Readiness Audit: Complete)

### Product Readiness Audit (v6.4)

**Bugs fixed:**
- `components/OverdueDigest.tsx` — replaced hardcoded `"sovereign_projects"` and `"sovereign_project_tasks"` string constants with `KEYS.PROJECTS` / `KEYS.PROJECT_TASKS` from the key registry. Prevents silent drift if keys are ever renamed.
- `app/chief/page.tsx` — replaced silent `return null` fallback with a friendly empty state UI ("No brief available yet. Add projects and tasks in /projects, then return here."). Previously the page went blank if `computeChiefOfStaffBrief` returned before `brief` was set.
- `components/DashboardShell.tsx` — fixed homepage header overflow at ≤375px. Header row was `flex justify-between` with HeroStats pills on the right; on iPhone SE all pills overflow. Changed to `flex-col sm:flex-row` so header stacks vertically on mobile.
- `components/TodayCommand.tsx` — removed conflicting inline `borderColor`/`borderTopWidth` styles from grid cells. These overlapped with Tailwind `divide-x divide-y divide-white/[0.05]` utility classes causing inconsistent rendering.

**New doc:** `docs/PRODUCT_READINESS_AUDIT.md` — full audit covering routes, feature overlap, data safety, mobile findings, pre-commercial checklist, and next 5 recommended commits.

**Audit findings summary:**
- All 14 audited routes load correctly with empty states
- localStorage JSON.parse coverage: 100% (safeRead pattern everywhere)
- Data export/restore flow: gold standard (auto-backup before restore)
- Feature overlap: intentional + well-differentiated (Chief/Strategy/Goals/Review/Actions/Focus/Briefing serve distinct timeframes and questions)
- Mobile: functional at 375px–430px with fixes above; 2 remaining items (modal max-h, iOS safe-area-inset) noted for v6.5
- Known risks documented: no unit tests, active session stuck state, AI API key dependency
- Overall readiness: 8.3/10

**Version:** Sovereign OS v6.3 (Executive Dashboard Polish: Complete)

### Executive Dashboard Polish (`app/page.tsx` + new components — v6.3)
- `components/TodayCommand.tsx` — "Today's Command" hero widget. Computes full chain (graph → briefing → focus → action → chief → strategy) from localStorage. Shows 4-cell command grid: ⚡ Top Action (highest leverage from chief), ⚠ Risk (biggest risk + severity badge), 🎯 Top Objective (first strategic objective title), ⏱ Focus (active "Active" session or last session today). Header bar shows date + momentum score pill. CTA row: "Review Week" → /review, "Start Focus →" or "Continue Focus →" → /focus (active-session-aware). Executive summary truncated to 90 chars as subtitle.
- `components/CollapsibleZone.tsx` — Reusable collapsible zone wrapper. Props: id, label, accent (CSS color), defaultOpen, extra (right-side slot), children. Renders: zone label + accent gradient line + chevron toggle. Persists open/closed in `sessionStorage` key `sovereign_zone_{id}` (reads on mount via useEffect to avoid SSR hydration mismatch). Chevron rotates 180° when open.
- `components/DashboardShell.tsx` — Client component wrapping all homepage content. Props: btcPrice, btcChange, hasAIKey, marketDataLive. Renders: compact page header (title + HeroStats pills inline), SystemStatus row, TodayCommand hero, then 5 collapsible zones:
  - **Executive** (violet): ChiefOfStaffCard + StrategicPlannerCard + GoalsCard + WeeklyReviewCard in 2-col grid
  - **Execution** (amber): ActionEngineCard full-width, then DailyBriefingCard + FocusEngineCard 2-col
  - **Operating** (indigo): ProjectsWidget + ContentWidget, RelationshipWidget + MemoryWidget in 2×2 grid; OverdueDigest in zone header extra slot
  - **Signal** (amber): BitcoinPanel + BTCStackPanel, ProductivityPanel + HabitPanel in responsive grids
  - **AI** (indigo): AIPanel
- `app/page.tsx` — Simplified to server component that fetches BTC data + checks API key, then passes props to DashboardShell. Old marketing hero + SectionDividers removed. DashboardShell handles all UI.
- All zones default open. CollapsibleZone animates chevron. Zone state persists across client-side navigation via sessionStorage.

**Version:** Sovereign OS v6.2 (Weekly Review Engine: Complete)

### Weekly Review Engine (`lib/weeklyReview/engine.ts` — v6.2)
- `lib/weeklyReview/engine.ts` — `computeWeeklyReview(input)`: pure deterministic review engine. Key outputs: `completedWork[]` (tasks Done + updated_at in week, content Published, opps Converted, focus sessions Completed); `slippedItems[]` (tasks due in week not done, content with publish_date not published, follow-ups <= weekEnd not actioned; severity from priority); `wins[]` (task count, content published, habit ≥70%, focus ≥3 sessions, opps converted); `blockers[]` (paused projects, active high-priority projects with no tasks, tasks overdue >14d); `relationshipFollowUps[]` (due by weekEnd, sorted by priority); `contentProgress` (created/movedReady/published this week); `habitConsistency` (score 0–100, completionByDay, perfectDays, bestStreak, lowestHabit); `focusStats` (completed/abandoned, totalMinutes, avg, longest, topProject); `strategicAlignment` (score by matching completed task projectIds to top 3 objectives' relatedProjects); `recommendations[]` (up to 7: critical slipped, high slipped, blockers, habit rebuild, strategic realignment, action engine top, overdue follow-up); `nextWeekFocus[]` (up to 5: slipped tasks, strategic objective next action, action engine top, overdue follow-up, slipped content). Also exports `buildWeeklyReviewContext()` for AI "Analyze My Week" panel.
- `app/review/page.tsx` — Full weekly review page. Hero with quick stats (completed, slipped, wins, focus min, alignment %). Sections: Wins grid, Completed Work list (type badge + project), Slipped Items (severity badge + reason), Blockers, Focus Stats + Habit Consistency 2-col grid (habit day grid + lowestHabit), Relationship Follow-Ups (Reschedule button), Content Progress, Strategic Alignment ring, Recommendations (→ Task conversion), Next Week Focus numbered list, AI Analysis panel (quick prompts + "Analyze My Week"), Save to Memory.
- `components/WeeklyReviewCard.tsx` — Homepage widget: completed count, slipped count, focus minutes, alignment %, top next-week focus. Green emerald accent theme. Full compute chain (graph → focus → briefing → action → chief → strategy → review).
- `lib/chiefOfStaff/engine.ts` — `ChiefInput.weeklyReview?: WeeklyReview` added (v6.2). `buildReasoning()` now prepends: slipped items count + top slipped title (when any slipped), and low weekly alignment warning (when score < 50%).
- `app/strategy/page.tsx` — Weekly Alignment Note section added before AI Analysis: color-coded alignment score ring (green/amber/red border), completed/total aligned tasks, note text, slipped items summary, link to /review.
- `app/page.tsx` — `WeeklyReviewCard` inserted between `GoalsCard` and `ActionEngineCard`.
- `components/Sidebar.tsx` + `MobileNav.tsx` — `/review` nav entry added after `/goals`. Added to `EXACT_ROUTES`.

**Version:** Sovereign OS v6.1 (Goal Decomposition Engine: Complete)

### Goal Decomposition Engine (`lib/goalDecomposition/engine.ts` — v6.1)
- `lib/goalDecomposition/engine.ts` — `computeGoalDecomposition(input)`: pure deterministic engine that turns each `StrategicObjective` into milestones, tasks, content, follow-ups, and opportunities. Theme detection via regex (`ai | bitcoin | content | dwt | education | revenue | relationships | general`). Per objective: `deriveMilestones()` (30d/60d/90d templates per theme + validation milestone for hard/very-hard); `suggestTasks()` (up to 6 theme-matched tasks, deduped against existing open tasks in related projects); `suggestContent()` (up to 3 content ideas per theme with format/platform/angle, deduped); `suggestFollowUps()` (1. linked-project people, 2. theme-based templates with existing person preference); `suggestOpportunities()` (up to 2 per theme, deduped). Returns `DecompositionResult` with `decomposedGoals[]`, `totalSuggestedTasks`, `totalSuggestedContent`, `totalSuggestedFollowUps`, `totalSuggestedOpportunities`.
- `app/goals/page.tsx` — Full goal decomposition page. Hero with stats row (objectives, tasks, content, follow-ups, opps). Accordion per `DecomposedGoal` (first open by default). Sections per goal: Milestones timeline (30d/60d/90d horizon badges), Suggested Tasks (inline project picker dropdown, "Add Task" converts to `sovereign_project_tasks`), Suggested Content ("Add Content" converts to `sovereign_content_items`), Suggested Follow-Ups ("Schedule" updates person's `next_follow_up_at` or saves as Memory note), Suggested Opportunities ("Track" calls `createOpportunity()`). "Save to Memory" button saves full goal plan as `MemoryItem` (type: Project Context). All conversions: `ConvertButton` component with idle/done/error states.
- `components/GoalsCard.tsx` — Homepage widget: top objective title, next milestone with horizon badge, total suggested action count. Computes full chain (graph → focus → briefing → action → chief → strategy → decomposition). Links to /goals.
- `lib/chiefOfStaff/engine.ts` — `buildReasoning()` checks if top strategic objective has `relatedProjects.length === 0`; adds "🎯 Goal decomposition needed" warning pointing to /goals. Placed before existing strategic alignment check.
- `app/page.tsx` — `GoalsCard` inserted between `StrategicPlannerCard` and `ActionEngineCard`.
- `app/strategy/page.tsx` — "Decompose into milestones + actions →" link/button added after Top Objectives section (visible only when objectives exist).
- `components/Sidebar.tsx` + `MobileNav.tsx` — `/goals` nav entry added after `/strategy`. Added to `EXACT_ROUTES`.

**Version:** Sovereign OS v6.0 (Strategic Planner: Complete)

### Strategic Planner (`lib/strategicPlanner/engine.ts` — v6.0)
- `lib/strategicPlanner/engine.ts` — `computeStrategicPlan(input)`: deterministic long-horizon planning layer sitting above Focus Engine, Briefing, Chief of Staff, and Action Engine. Exports `StrategicPlan` (NorthStar, StrategicObjective[], Bottleneck[], DependencyChain[], StrategicRisk[], HorizonPlan × 3, SequenceStep[], confidence, reasoning). Internal: `deriveNorthStar()` (yr1 vision → category-theme mapping), `deriveObjectives()` (score active projects by priority weight + opps + tasks, top 3–5), `detectDependencies()` (4 patterns), `detectBottlenecks()` (6 types, severity-sorted), `detectRisks()` (6 types), `buildThirtyDayPlan/SixtyDayPlan/NinetyDayPlan()`, `buildSequencing()` (critical bottlenecks → blocking deps → top objective → action engine → high bottlenecks → second objective), `scoreConfidence()` (base 40, max 96), `buildReasoning()`.
- `app/strategy/page.tsx` — Premium strategy page. Compute order: graph → focus → daily briefing → action engine → chief → strategic plan. Sections: Confidence ring hero, North Star, Top Objectives (impact/difficulty badges), 30/60/90 tab switcher (HorizonCard), Recommended Sequence (numbered steps), Bottlenecks + Dependencies side-by-side, Strategic Risks, Confidence + Reasoning breakdown, Chief Alignment, AI Challenge panel (uses `/api/chief-chat`; 5 suggested prompts).
- `components/StrategicPlannerCard.tsx` — Homepage widget: North Star, Top Objective, Primary Bottleneck (severity badge), Confidence ring (color-coded green/amber/red). Links to `/strategy`. Computes full chain (graph → focus → briefing → action → chief → strategy) in useEffect.
- `lib/chiefOfStaff/engine.ts` — `ChiefInput.strategicPlan?: StrategicPlan` added (v6.0). `buildReasoning()` checks highest leverage action against strategic objective titles via keyword match; adds `⚠️ Strategic alignment check` warning when misaligned; adds `Strategic context` note when critical bottleneck detected. Purely additive — no behavior change when `strategicPlan` not passed.
- `app/page.tsx` — `StrategicPlannerCard` inserted between `ChiefOfStaffCard` and `ActionEngineCard`.
- `components/Sidebar.tsx` — `/strategy` nav entry added after `/chief` in `MODULE_NAV`.
- `components/MobileNav.tsx` — `/strategy` nav entry added after `/chief`; both `/chief` and `/strategy` added to `EXACT_ROUTES`.

### Vector Memory Activation (`lib/vector/`, `app/api/vector/` — v5.7)
- `lib/vector/vectorDb.ts` — `probeVectorDb(supabase)`: server-side probe via `.select("embedding").limit(0)`; detects PostgreSQL error 42703 (undefined column) = migration not applied; returns `{ columnExists, ready }`.
- `app/api/vector/status/route.ts` — Dynamic 4-state mode: `deterministic-only` | `embedding-provider-ready` | `vector-db-ready` | `semantic-active`. Derived from `isEmbeddingConfigured()` × `probeVectorDb()`. Exports `VectorMode` type and `VectorStatus` interface used by settings component.
- `app/api/vector/embed/route.ts` — Extended: after generating embedding, probes pgvector readiness; if ready, persists `embedding`, `embedding_model`, `embedded_at` to Supabase `memory_items` row. Returns `{ persisted: boolean }`. Skips persistence for `memoryId === "test"`.
- `app/api/vector/search/route.ts` — Server-side semantic search endpoint: `POST { query, limit? }` → `createEmbedding()` → `supabase.rpc("match_memories", { query_embedding, match_threshold: 0.7, match_count: limit })` → `{ status, ids, source }`. Guards: embedding configured → Supabase available → pgvector ready → embedding generated → RPC called. All failure modes return keyword fallback.
- `lib/vector/semanticMemory.ts` — `VECTOR_DB_READY = false` removed. Semantic path activated: `createEmbedding()` → dynamic import `getSupabaseClient()` → `supabase.rpc("match_memories", ...)`. Client-side: OPENAI_API_KEY absent → `createEmbedding` returns "skipped" → keyword fallback. Server-side (via `/api/vector/search`): full semantic path available.
- `components/AIPanel.tsx` — Fetches `/api/vector/status` on mount; stores `vectorMode`. On each message send: if `semantic-active`, calls `/api/vector/search` with user query; merges semantic IDs (first) with keyword results (fill to cap 5); sets `semanticMemoryUsed = true`. Context indicator row shows `⚡ semantic` badge when vector search was used.
- `app/memory/page.tsx` — Select mode: `selectMode` state; checkboxes on MemoryCard; blue ring on selected; "Select all visible" link; progress bar during embed. Batch embed toolbar visible only when `embeddingConfigured`. Continue-on-error.
- `components/settings/VectorMemorySettings.tsx` — 4-state mode panel: `MODE_CONFIG` record maps each mode to label/description/accent colors; `SETUP_STEPS` record maps each mode to ordered setup instructions; border/background color changes per mode.
- `docs/VECTOR_MEMORY_PLAN.md` — Updated to v5.7; dynamic detection documented; no feature flag flip needed; all new files in Files map.

**Version:** Sovereign OS v5.6 (Vector Memory Foundation: Complete)
**Stable:** Yes — localStorage-first, Supabase write-through enabled
**Status:** Live, private, password-protected
**Deployment:** Vercel (auto-deploy from `main`)

---

## What's Working

### Vector Memory Foundation (`lib/vector/` — v5.6)
- `lib/vector/embedding.ts` — `isEmbeddingConfigured()` (checks `OPENAI_API_KEY`), `getEmbeddingConfig()` (provider/model/dimensions), `formatMemoryForEmbedding(item)` (title + type + content + tags + people → 8k char cap), `createEmbedding(text)` → `{ status: ok|skipped|error, embedding?, model?, dimensions? }`. Never throws. OpenAI `text-embedding-3-small` (1536d). Graceful skip when key absent.
- `lib/vector/semanticMemory.ts` — `generateMemoryEmbedding(item)` → embedding result or skip; `searchMemorySemantic(query, items, limit)` → `{ status, items, source, reason }`. `VECTOR_DB_READY = false` (v5.6 foundation flag). Keyword fallback always active. v5.7 semantic path stubbed with full implementation, awaiting pgvector migration.
- `app/api/vector/status/route.ts` — GET; returns `{ embeddingConfigured, provider, model, dimensions, vectorDbReady, mode, supabaseConfigured }`. Safe for client components to poll.
- `app/api/vector/embed/route.ts` — POST `{ text, memoryId }`; returns `{ status, dimensions, model }` or `{ status: skipped, reason }`. v5.6: embedding generated and returned, not persisted.
- `components/settings/VectorMemorySettings.tsx` — Settings panel: mode badge (Deterministic Only / Semantic Ready), provider/pgvector/dimensions status rows, Test Embedding button (configured only), setup instructions (unconfigured).
- `/settings` — Vector Memory section added.
- `app/memory/page.tsx` — polls `/api/vector/status` on mount; passes `embeddingConfigured` to modal; "Embed" button in modal header shows only when configured; shows `1536d` on success.
- `supabase/schema.sql` — Commented pgvector migration: `enable extension vector`, `alter table memory_items add column embedding vector(1536) + embedding_model + embedded_at`, `match_memories()` RPC, IVFFlat index notes.
- `docs/VECTOR_MEMORY_PLAN.md` — Architecture doc: activation checklist (6 steps), provider rationale, text format, match_memories RPC design, fallback behavior table, phases v5.7–v6.0.

### Opportunity Engine (`lib/types/opportunities.ts` + `/opportunities` page — v5.1)
- `lib/types/opportunities.ts` — `Opportunity` type: id, title, description, type (Partnership|Content|Client|Product|Event|Education|Revenue|Personal), status (Detected|Reviewing|Active|Converted|Archived), score (0–100), score_reasoning, suggested_action, related_people, related_project_ids, related_memory_ids, source (detected|manual), conversion (target + target_id + converted_at), notes, created_at, updated_at.
- `lib/keys.ts` — `KEYS.OPPORTUNITIES = "sovereign_opportunities"` added.
- `lib/opportunities/score.ts` — `scoreOpportunity(opp)`: Type weight (Revenue 35pts, Client 32pts, Partnership 28pts … Personal 12pts) + Status momentum (Active 20, Reviewing 14, Detected 10) + Context depth (people 4pts each max 8, projects 4pts each max 8, memories 2pts each max 4) + Description richness (10/6/3) + Next action defined (10) + Recency bonus (5 if updated within 7 days). Returns `{ score, reasoning }`.
- `lib/opportunities/store.ts` — `loadOpportunities()`, `createOpportunity()`, `updateOpportunity()`, `deleteOpportunity()`, `setOpportunityStatus()`, `markConverted()`. Score is auto-recomputed on every save. Reads/writes localStorage key `sovereign_opportunities`.
- `app/opportunities/page.tsx` — Full opportunity management page: filter by status + type, sort by score descending, show/hide archived. Per-card: score circle, type badge, status badge, auto badge, score bar, expand for description/action/people/projects/notes/conversion. Actions: Develop (AI modal) / Convert → (Project|ContentItem|Task|Memory modal) / → Reviewing / → Active / Archive / Delete. Convert modal: tab-switched form per target type with pre-filled fields from opportunity; creates item in localStorage and calls `markConverted()`. AI Develop panel: sends opportunity context to `/api/chief-chat`, suggestion prompts. New/Edit form modal: all fields, project + memory multi-select, full CRUD.
- `app/chief/page.tsx` — Opportunities section updated: shows top 3 stored opportunities by score (with score circle + type badge + next action); falls back to detected brief opportunities when no stored opps; "View all →" link to `/opportunities`; "Manage all opportunities" footer CTA.
- `components/Sidebar.tsx` — `/opportunities` nav added after Chief of Staff.
- `components/MobileNav.tsx` — `/opportunities` nav added as "Opps".

### Chief of Staff Engine (`lib/chiefOfStaff/engine.ts` — v5.0)
- `lib/chiefOfStaff/engine.ts` — `computeChiefOfStaffBrief(input)`: pure deterministic synthesis layer above Focus Engine and Daily Briefing. Computes: Executive Summary (narrative from active projects, overdue count, ready content), Highest Leverage Action (ready content > focus engine top priority > overdue critical task), Biggest Risk (critical overdue tasks > stalled high-priority project > stale ready content > overload), Blocked/Stalled items (paused projects + long-overdue tasks), Opportunities (up to 3: publish ready content, case studies for shipped projects, relationship follow-ups, video repurposing, schedule high-priority ideas), Recommended Schedule (3 blocks using topThree as input), Weekly Momentum score (habit completion 40pts + focus sessions 25pts + done tasks 20pts - overdue penalty + base 15), Strategic Alignment score (vision depth 30pts + weekly goals 20pts + vision keyword match 25pts + active high-priority project 15pts + content 10pts), Reasoning (structured explanation of every score and decision).
- `app/chief/page.tsx` — full "Executive Brief" page: hero, Executive Summary card, Scores (dual ring), Highest Leverage Action, Biggest Risk, Opportunities (icon-tagged list), Blocked/Stalled, Recommended Schedule (3 time blocks with color-coded focus bars), Reasoning (parsed markdown), AI Challenge panel.
- `app/api/chief-chat/route.ts` — "Challenge This Plan" AI endpoint: uses `callClaude()` with chief-of-staff advisor system prompt; accepts `{ message, context }` where context is a pre-formatted brief summary; returns `{ reply }`.
- `components/ChiefOfStaffCard.tsx` — homepage widget: ScoreRing pair (Momentum/Alignment), Highest Leverage Action, Biggest Risk with severity badge, "Full brief →" link to `/chief`. Loads via async useEffect from localStorage.
- `app/page.tsx` — `ChiefOfStaffCard` added above `DailyBriefingCard` in the "Today" section.
- `components/Sidebar.tsx` — `/chief` nav item added first in `MODULE_NAV` with star icon.
- `components/MobileNav.tsx` — `/chief` nav item added first with star icon.

### Supabase Read Mode Toggle (`lib/supabase/readMode.ts` — v4.8)
- `lib/supabase/readMode.ts` — `getReadModeConfig()`: reads `sovereign_read_mode_config` from localStorage, merges with defaults so new keys are always present; `setReadMode(module, mode)`: persists a single module change; `isSupabaseReadEnabled(module)`: sync check used by repositories; `resetReadModeToLocal()`: resets all to "local". All default to "local" — never auto-enabled.
- `lib/keys.ts` — `KEYS.READ_MODE_CONFIG = "sovereign_read_mode_config"` added.
- All 4 repositories — new async `getXxx()` read methods: check `isSupabaseReadEnabled()`, require `getCachedUserId()`, fetch from Supabase, fall back to localStorage on failure. Return `{ items, source, fallback, error? }`. localStorage never modified.
  - `memoryRepository.getMemoryItems()` — wired to `/memory` page and `MemoryWidget`
  - `projectRepository.getProjects()`, `getProjectTasks()` — prepared, not yet wired to UI
  - `contentRepository.getContentItems()` — prepared, not yet wired to UI
  - `focusSessionRepository.getFocusSessions()` — prepared, not yet wired to UI
- `app/memory/page.tsx` — async useEffect with `getMemoryItems()`; shows amber fallback notice if Supabase was requested but failed; shows green "Reading from Supabase" badge when active.
- `components/MemoryWidget.tsx` — async useEffect with `getMemoryItems()`.
- `components/settings/ReadModeSettings.tsx` — 5-module read source panel: Local/Supabase segmented toggle per module; inline confirmation checkbox required before switching to Supabase; "UI pending" badge for non-wired modules; "Reset all to Local" button with confirm step; auth + config warnings in header.
- `/settings` — Read Mode section added between Supabase Inspection and Data Recovery; version v4.8; roadmap updated (v4.8 current, v4.9 RLS, v4.10 Read Shift).

### Controlled Supabase → localStorage Restore (`lib/supabase/restoreFromSupabase.ts` — v4.7)
- `lib/supabase/restoreFromSupabase.ts` — `previewSupabaseRestore()`: requires auth; fetches counts + latest-5 records per module from Supabase; reads current local counts; returns `RestorePreview` with per-module `RestoreModulePreview`. `restoreModuleFromSupabase(module, { mode })`: auth gate; fetches up to 1000 rows; validates via per-module reverse mappers; triggers `backupLocalModule()` download before any write; applies `replace_local_module` (discard + overwrite) or `merge_by_id` (last-write-wins by `updated_at`); returns detailed `RestoreResult`. `backupLocalModule(module)`: downloads current localStorage module as dated JSON file; returns false if module is empty.
- Reverse row mappers for all 5 modules — `rowToMemoryItem`, `rowToProject`, `rowToProjectTask`, `rowToContentItem`, `rowToFocusSession` — handle snake_case Supabase → camelCase/snake_case local types. `isNonEmptyString()` validation on required fields; invalid rows skipped and counted.
- `components/settings/SupabaseRestore.tsx` — 6-phase UI: idle (preview button), previewing (loading), preview (module cards — click-to-select), confirm (mode picker radio + confirmation checkbox), restoring (loading), done (result detail) / error (message + retry). `ModuleCard`: click-to-select toggle; local count, Supabase count, diff label. Done phase: fetched, valid, invalid, new added, updated, kept, total written. Reload App button.
- `/settings` — Data Recovery section added between Supabase Inspection and Sync Roadmap; version v4.7; roadmap updated (v4.7 current, v4.8 RLS, v4.9 Read Shift).
- Safety: Supabase data never modified or deleted. localStorage never touched before explicit confirmation + backup download. Auth required. Never auto-runs.

### Supabase Read Preview (`lib/supabase/readPreview.ts` — v4.6)
- `lib/supabase/readPreview.ts` — `fetchSupabasePreview()`: requires auth; runs count query + latest-5 query per module (5 tables); reads local counts from repository functions; returns `SupabasePreviewResult` with per-module `ModulePreview` (localCount, supabaseCount, difference, latestRecords). Module-level errors are non-fatal.
- `components/settings/SupabaseReadPreview.tsx` — 4-phase UI: idle (fetch button), loading (pulse), error (reset), loaded (comparison table + expandable record rows + refresh). Click-to-expand rows show latest 5 Supabase records with id prefix, title, time-ago. DiffBadge: ✓ (in sync), +N local (needs migration), N remote (more in Supabase). Persistent amber "Verification only" banner. Auth gate shows sign-in prompt.
- `/settings` — Supabase Inspection section added after Migration Assistant; version v4.6; roadmap updated (v4.6 current, v4.7 RLS, v4.8 Read Shift).
- No writes, merges, or deletes at any point. Purely observational.

### Migration Assistant (`lib/supabase/localMigration.ts` — v4.5)
- `lib/supabase/localMigration.ts` — `analyzeLocalDataForMigration()`: pure dry-run; reads all 5 module localStorage keys; filters items with missing ids; returns `MigrationAnalysis` with per-module counts, skipped counts, warnings. `migrateLocalDataToSupabase()`: requires `getCachedUserId() !== null`; calls existing `upsertXSupabase()` functions per item; continues on failure; returns `MigrationResult` with per-module succeeded/failed/errors.
- `components/settings/MigrationAssistant.tsx` — 6-state UI: idle → analyzing → preview (dry-run table + confirmation checkbox) → migrating → done (result table) → error. Not-authenticated state shows sign-in prompt. Confirmation checkbox disabled until analysis completes. "Run Migration" disabled until checkbox checked. localStorage never touched.
- `/settings` — Data Migration section added between Identity & Auth and Sync Roadmap; system version bumped to v4.5.
- All 5 modules covered: Memory, Projects, Project Tasks, Content Items, Focus Sessions.
- Duplicate protection: upserts use existing item `id` — idempotent; safe to run multiple times.
- Failure handling: `continue-on-error` per item; failed count + error messages shown per module; no rollback.

### Auth Readiness (`lib/supabase/authStatus.ts` — v4.4)
- `lib/supabase/authStatus.ts` — `getAuthStatus()` (async, returns `AuthStatus` with mode `anonymous-local|supabase-auth-ready|authenticated`); `getCachedUserId()` (sync, used by repositories); `initAuthListener()` (sets up `onAuthStateChange`, seeds cache from `getSession()`); `sendMagicLink(email, redirectTo)`; `signOut()`.
- `lib/supabase/client.ts` — `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true` (required for magic link redirect).
- `components/auth/AuthListener.tsx` — invisible "use client" component mounted in root layout; calls `initAuthListener()` once on mount so `getCachedUserId()` works everywhere immediately.
- All 4 repositories — `user_id: getCachedUserId()` instead of `user_id: null` in row mappers; `string | null` interface type.
- `components/settings/AuthStatus.tsx` — "use client" settings panel; renders mode-specific UI: anonymous (gray, shows setup instructions), auth-ready (amber, magic link form → "sent" confirmation), authenticated (green, email + sign-out button).
- `/settings` — Identity & Auth section added; system version v4.4; roadmap updated (v4.4 current); auth is explicitly labeled optional throughout.
- `docs/SUPABASE_AUTH_PLAN.md` — full architecture doc: auth modes, sign-in flow, user_id in repositories, migration plan (v4.5), RLS plan (v4.6), anonymous→authenticated merge strategy, workspace architecture, security notes.
- App remains fully functional in all three auth modes. No login gate. No forced migration. localStorage is unchanged.

### Sync Health + Manual Restore (`lib/supabase/syncHealth.ts` — v4.3)
- `lib/supabase/syncHealth.ts` — `recordSyncResult(entry)` persists last Supabase write result per module to `sovereign_sync_status` localStorage key. `getSyncHealth()` returns full report: supabase configured state, per-module local counts + last result, local-only module list (Planner, Habits), export availability.
- All 4 repositories updated to call `recordSyncResult()` after every Supabase upsert/delete attempt (success, failed, and thrown-error paths).
- `components/settings/SyncHealth.tsx` — "use client" settings panel: per-module table (label, table name, local count, last sync dot, time-ago), unconfigured Supabase warning, failure detail rows, local-only module pills, export availability hint.
- `components/settings/StorageExport.tsx` — rewritten to include Export + Import/Restore. Restore flow: file picker → JSON validation → preview (key names + item counts) → confirmation required → pre-restore auto-backup downloaded → localStorage write → reload prompt. Handles malformed JSON, unrecognized format, empty backup, write errors. Never auto-imports.
- `/settings` — Sync Health section added between Sync Coverage and Memory Store. System version bumped to v4.3. Roadmap updated (v4.3 marked current). "Data Import" removed from Coming Soon.
- `lib/keys.ts` — `KEYS.SYNC_STATUS = "sovereign_sync_status"` added.

### Supabase Dual-Write Expansion (`lib/repositories/` — v4.2)
- `lib/repositories/projectRepository.ts` — dual-write for Projects and ProjectTasks: create, update, archive, batch-add tasks, delete tasks. `upsertProjectSupabase`, `upsertProjectTaskSupabase`, `deleteProjectTaskSupabase`, plus full `saveProjectDual`/`saveProjectTaskDual`/`deleteProjectTaskDual` helpers. Reorder is localStorage-only (no order field in schema).
- `lib/repositories/contentRepository.ts` — dual-write for ContentItems: create, update, archive. `upsertContentItemSupabase`, `deleteContentItemSupabase`, `saveContentItemDual`, `deleteContentItemDual`.
- `lib/repositories/focusSessionRepository.ts` — dual-write for FocusSessions: start, complete, abandon all map to upsert. `upsertFocusSessionSupabase`, `saveFocusSessionDual`. Row mapper handles camelCase→snake_case, optional fields → null.
- `/projects` page — all mutation functions (`addProject`, `updateProject`, `archiveProject`, `addTask`, `batchAddTasks`, `updateTask`, `deleteTask`) fire background Supabase upserts after local writes.
- `components/content/ContentPipeline.tsx` — `handleSave`, `handleArchive` fire background Supabase upserts. `ContentAIPanel.saveToMemory` updated to use `saveMemoryItemDual`.
- `/focus` page — `persistSessions(updated, changed)` signature updated to accept the changed session and fire background Supabase upsert. `handleSaveReview` memory save updated to use `saveMemoryItemDual`.
- `/settings` — Sync Coverage section added showing 5 covered modules (Memory, Projects, Tasks, Content, Focus Sessions) with green status dots; Planner and Habits show "Local only". Roadmap updated to v4.2 current. System version bumped to v4.2.

### Supabase Foundation (`/settings` + `lib/supabase/`)
- `lib/supabase/client.ts` — `getSupabaseClient()` singleton; returns `null` if env vars missing; app continues in localStorage-only mode. Auth disabled until v4.2.
- `lib/supabase/server.ts` — `getSupabaseServer()` for Route Handlers and Server Components; fresh client per request, never at module level.
- `lib/supabase/status.ts` — `getSupabaseStatus()` returns `{ configured, urlPresent, anonKeyPresent, mode: "local-only" | "supabase-ready" }`. Safe on client or server.
- `supabase/schema.sql` — 9 tables: `profiles`, `projects`, `project_tasks`, `memory_items`, `content_items`, `focus_sessions`, `planner_entries`, `habits`, `habit_logs`. All include `user_id` (nullable), `created_at`, `updated_at`, `metadata jsonb`. Indexes + `set_updated_at()` trigger. RLS notes included for v4.3.
- `components/settings/StorageExport.tsx` — client component; exports all `sovereign_*` keys to `sovereign-os-backup-YYYY-MM-DD.json`; handles empty state gracefully.
- `/settings` page — fully implemented (was placeholder): Persistence Mode panel (Local Only / Supabase Ready with status dots), Supabase setup steps when not configured, Sync Roadmap (v4.0–v4.4), Data Export button, System Info row, Coming Soon grid. Reads Supabase status server-side at render time.
- `docs/SUPABASE_SYNC_PLAN.md` — architecture document covering sync strategy, conflict handling, migration phases, backup approach, future workspace architecture.
- **Settings "Soon" badge removed** — `/settings` is now a real page in Sidebar.
- **No Supabase reads or writes yet** — localStorage remains sole source of truth. v4.1 will add dual-write.

### Execution Engine (`/focus` — Session Loop)
- `lib/types/execution.ts` — `FocusSession` type with status (Active/Completed/Abandoned), timing fields (startedAt, endedAt, plannedMinutes, actualMinutes), review fields (completedSummary, blockers, nextAction), and savedToMemory flag
- `KEYS.FOCUS_SESSIONS: "sovereign_focus_sessions"` — localStorage key for all session records
- **Start Focus Session** button on each Top 3 priority card (shown when expanded, no active session) — opens `StartSessionModal` with 25/45/60/90 min duration picker
- **ActiveSessionPanel** — shown at top of /focus when a session is Active; live elapsed timer (HH:MM:SS via setInterval), session title + planned duration + start time, Complete Session / Abandon controls
- **ReviewModal** — opens on Complete: textarea for completedSummary, blockers, nextAction; Save to Memory toggle (default on); Save & Complete writes session to localStorage
- **Session → Memory auto-save** — on review save with toggle on, creates a `MemoryItem` (type: Note, importance: Medium, tags: ["focus-session", "execution"]) appended to `sovereign_memory_items`
- **Today's Sessions** section at bottom of /focus — filters by today's date, shows completed (with actual vs planned mins) and abandoned sessions, total focused minutes badge
- **FocusEngineCard** (homepage): shows active session state with pulsing green dot + elapsed timer instead of priority tiles when session is active; "N min focused today" stat below score bars
- **AIRefinePanel**: includes today's completed/abandoned session history in the prompt (title, status, actual mins, blockers)
- All session state persisted to `sovereign_focus_sessions`

### Focus Engine (`/focus`)
- `lib/focus/engine.ts` — pure `computeFocusEngine(FocusEngineInput)` utility; synthesizes all data sources
- **Top 3 priorities** with ranking signals: overdue-task (100+) > overdue-project (90+) > critical-task (70) > content-deadline (65) > high-task (60) > planner (55) > project-action (50); deduplicated, sorted by score
- **Why It Matters** per priority: `whyNow` (urgency reason), `supportsProject`, `supportsVision` (vision keyword match), `impact` (fixed per source type)
- **Focus Blocks** — 6 deterministic time blocks: 09:00 Deep Work, 10:30 Admin, 11:00 Deep/Creator, 12:00 Recovery, 13:30 Deep/Creator/Overdue-clear, 15:00 Review; content-aware (creator blocks when content work is top priority)
- **Avoid List** — dynamic: low-priority work when high-priority exists, paused projects, content ideation spirals, unplanned scope creep, research rabbit holes
- **Momentum Score (0–100):** base 40 + habit completion (0–40) + task done ratio (0–20) + streak bonus (0–15) − overdue penalty (7/item, max 35); clamped 0–100
- **Alignment Score (0–100):** daily plan exists (+20) + high-signal top priority (+30) + vision keyword overlap (+25) + open weekly goals (+25); clamped 0–100
- `/focus` page: premium dark UI — score rings (SVG arc), expandable priority cards with why-it-matters, focus schedule, avoid list, "Refine My Focus" AI streaming panel
- `components/FocusEngineCard.tsx` — homepage card: top priority with source badge, priority #2/#3 mini tiles, momentum + alignment progress bars, link to /focus
- Homepage: FocusEngineCard placed inside the Today section after DailyBriefingCard
- Sidebar: `/focus` added as first MODULE_NAV entry "Focus Engine"

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
- **Memory-aware context:** On every send, reads `sovereign_memory_items` + `sovereign_projects` from localStorage, runs `getRelevantMemoryContext()` (top 5 by keyword/tag/people scoring), and injects the formatted context block into the system prompt. If no relevant memories found, context is omitted — normal system prompt is used. Gracefully handles malformed localStorage data.
- **Planner-aware context:** `lib/memory/context.ts` exports `getPlannerContext(query, plannerData)`. Reads `sovereign_planner_daily`, `sovereign_planner_weekly`, `sovereign_planner_monthly` from localStorage. Triggered when query contains any of 13 keyword patterns (today, focus, priorit, work on, next action, plan my day, plan for, schedule, agenda, weekly, monthly, what should, what to). Formats as `## Relevant Planner Context` with Today's Plan / Weekly Goals / Monthly Focus sections, each item prefixed with `[x]`/`[ ]` done state. Combined with memory context block into single `memoryContext` string sent to `/api/chat`.
- **Vision context:** `lib/memory/context.ts` exports `getVisionContext(query, visionData)`. Reads `sovereign_planner_1yr`, `sovereign_planner_3yr`, `sovereign_planner_5yr` (stored as raw `string[]` arrays). Triggered by 21 keyword patterns covering long term, vision, goal, goals, direction, roadmap, strategy, year variants (1/one/3/three/5/five/10/ten year), future, north star, where am I going, what should I build, where do I want. Formats as `## Relevant Vision Context` with 1-Year / 3-Year / 5-Year subsections; empty sections are omitted.
- **Context indicator:** Header shows combinations of `"N memories · planner · vision in context"` — any subset shown when active, nothing when all are idle.
- **Context budgeting:** `lib/memory/context.ts` exports `trimContextSection(section, maxChars)` — preserves heading lines, trims body at nearest word boundary, appends "…(trimmed for length.)" when cut. `buildCombinedContext({ memoryBlock, plannerBlock, visionBlock })` applies per-section caps (memory 900, planner 700, vision 700) then enforces a 2000-char total cap with priority order memory > planner > vision. Lower-priority sections are dropped if no budget remains.
- **Source attribution:** `contextSources: string[]` (e.g. `["Memory", "Planner"]`) is sent from `AIPanel` alongside `memoryContext` to `/api/chat`. The route's `buildSystemPrompt()` appends `"Context sources for this response: Memory, Planner."` and instructs the AI to use natural phrases ("based on your saved notes…", "your planner shows…", "according to your vision…") without mentioning localStorage or internal key names.
- **Habit context:** `lib/memory/context.ts` exports `getHabitContext(query, habits, habitLog)`. Triggered by 11 keywords: habit, habits, streak, consistent, consistency, discipline, routine, routines, daily, momentum, accountability. Reads `sovereign_habits` (HabitEntry[]) and `sovereign_habit_log` (Record<string, string[]>). Formats as `## Relevant Habit Context` with Tracked Habits (name + streak 🔥 if > 0) and Today's Status (✓ / ○ per habit). Capped at 500 chars. Added as fourth priority in `buildCombinedContext()`. UI indicator extended to show "habits" alongside other active sources.
- **Project context:** `lib/memory/context.ts` exports `getProjectContext(query, projects, projectTasks, memoryItems)`. Matches project by title (≥50% word overlap) then falls back to category keyword aliases. Injects full project detail: status, priority, category, due date (overdue flag), objective, next action, description, task progress, overdue tasks, open tasks, notes, related memories. Capped at 900 chars. Highest priority in `buildCombinedContext()` — project > memory > planner > vision > habits. UI indicator shows "project" when active.
- **Content context:** `lib/memory/context.ts` exports `getContentContext(query, contentItems, projects, memoryItems)`. Triggered by 20 keywords (content, create, youtube, instagram, linkedin, podcast, blog, newsletter, reel, video, script, caption, crypto mondays, dwt, repurpose, outline, etc.). Scores non-archived items by keyword/platform match, urgency (overdue, due-within-7d, Ready status), and priority. Returns top 4 as structured blocks with status, platform, format, priority, publish date, angle, project link, notes. Capped at 800 chars. Second priority in `buildCombinedContext()` — project > content > memory > planner > vision > habits. UI indicator shows "content" when active.
- **Save to Memory:** Every completed assistant message shows a subtle "🧠 Save to memory" button. Clicking it opens a metadata modal pre-filled with: auto-generated title (first sentence or first 9 words), type (Note), importance (Medium), and inferred tags (always "ai-response" + keyword-matched tags from the user prompt: bitcoin, focus, wealth, strategy, ai). User can edit all fields before saving. Duplicate detection: checks exact content match against existing `sovereign_memory_items`; shows "Already saved" if duplicate, "✓ Saved to memory" on success. All saved memories use `source: "AI"`.

### Life Planner (`/planner`)
- Daily plan card (`sovereign_planner_daily`)
- Weekly goals (`sovereign_planner_weekly`)
- Monthly focus areas (`sovereign_planner_monthly`)
- 1yr / 3yr / 5yr long-term vision (`sovereign_planner_1yr`, `sovereign_planner_3yr`, `sovereign_planner_5yr`)
- Review & reflection card (`sovereign_planner_review`)
- AI planner assistant (Claude, via `/api/planner-chat`)
- Projected outcomes card

### Content Pipeline (`/content` → Pipeline tab)
- Full content item management: add, edit, archive
- Schema: title, status (Idea/Drafting/Ready/Published/Archived), platforms[] (YouTube/Instagram/LinkedIn/Blog/Podcast/Newsletter/Crypto Mondays/DWT), priority, format, hook/angle, notes/draft, related project, publish date
- Filter bar: search (title+description), status tabs, platform dropdown, priority dropdown, archived toggle, clear button
- Content cards: status badge, format tag, platform chips (max 2 + overflow), priority dot, overdue date flag
- Add/edit modal with two tabs: **Overview** (all fields, multi-select platform chips, project dropdown) and **AI Tools**
- AI Tools tab: "Generate Outline" preset, "Repurpose This" preset, custom question input, streaming output via `/api/content-chat`, "Save to Memory" on completed output
- Overdue detection: alert banner + red card border for past-publish-date non-published items
- Homepage `ContentWidget`: Ideas/Drafting/Ready counts, overdue alert, upcoming 4 items sorted by date then priority
- Persisted to `sovereign_content_items`

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
- Full project management dashboard
- Fields: name, status (Idea/Active/Paused/Shipped/Archived), category (8 options), priority (Critical/High/Medium/Low), description, objective, next action, due date, links, notes
- Project cards with category/priority/status badges, next action, archive button
- Project detail modal with 3 tabs: Overview, Tasks, AI
- Tasks: per-project task list with status cycle, priority, due date
- AI project assistant: streaming, 4 presets (Summarize, Next Steps, Break Into Tasks, Today's Focus), custom questions via `/api/project-chat`
- Seed projects: Sovereign OS, DWT, Aigentic Systems, Big Money Realty, Crypto Mondays LV, UNLV GH-600
- Auto-migrates old format data from previous projects page
- **Overdue alerts:** red badge on cards/modal/tasks for past-due items; amber for due within 3 days
- **Task progress bar:** on each project card — `done/total` text + mini progress bar
- **AI → Tasks import:** after any AI response containing a list, "Import as Tasks" button parses and creates tasks; deduplicates against existing; shows imported/skipped count
- **Drag-to-reorder tasks:** native HTML5 drag/drop on open tasks in modal Tasks tab; 2×2 dot grip handle; order persisted to localStorage
- **Smart task due date UX:** formatted label with color states (red/amber/muted); click to open native picker; clear button; "Set date" placeholder on hover
- **Advanced filters + search:** search bar (title/description/objective/next action), status filter tabs, category dropdown, priority dropdown, "Overdue" toggle, active filter count, Clear button
- **Today View:** toggle between "Projects" and "Today" views; Today shows overdue tasks, tasks due today, high-priority open tasks, and active project next actions — all with toggle-done and click-to-open-project
- **Weekly Review modal:** AI-powered strategic review; streams analysis of all active projects/tasks including overdue items, completed tasks, and high-priority open tasks; sections: Overall Status, What's Working, Needs Attention, Top 3 Priorities, Weekly Focus; Regenerate button; Escape to close
- Persisted to `sovereign_projects` + `sovereign_project_tasks`

### Homepage (`/`) — Projects Widget
- Active project count, open task count, high-priority task count
- Top 3 active next actions sorted by priority
- Active projects list with priority indicators
- Links to `/projects`

### Homepage (`/`) — Overdue Digest
- Red pulsing dot + "N overdue" link in the Projects section divider
- Client component (`components/OverdueDigest.tsx`) reads localStorage and counts overdue projects + tasks
- Only renders when overdue count > 0; routes to `/projects` on click

### Daily Briefing (`/briefing`)
- `lib/briefing/daily.ts` — pure `computeDailyBriefing(BriefingInput)` utility; accepts projects, tasks, memory, daily/weekly/monthly planner, habits, habitLog
- Computes: overdue items (tasks + projects past due, sorted by days overdue), due today (tasks + planner), top 3 priorities (overdue first → critical → high → planner), high-leverage projects (Critical/High active, max 3), relevant memories (Critical/High, max 3), habit focus (all habits with done state + streak), suggested focus block, headline summary, AI prompt context string
- `/briefing` page: client component, reads all localStorage on mount, renders all sections with premium dark UI — header/headline, numbered priorities, overdue/due today 2-col grid, project cards, habit grid (green done state), memory badges, suggested focus highlight
- AI refinement: "Ask AI to refine today's plan" button → inline streaming response via `/api/chat` with full `aiPromptContext`; Stop button; Clear button
- Homepage `DailyBriefingCard` in "Today" section: headline, status chips (overdue/due today/habits), top 2 priorities, CTA to full briefing
- Sidebar navigation entry should be added in a future pass

### Homepage (`/`) — Memory Widget
- Memory section between Projects and AI sections
- Shows total memory count and high-priority count
- Last 4 most recently updated memories with type dot, title, and importance badge
- Empty state with link to `/memory` for first-time capture
- Client component (`components/MemoryWidget.tsx`) reads `sovereign_memory_items` from localStorage

### Memory Engine (`/memory`)
- Quick capture: textarea with Cmd+Enter shortcut, type selector (5 quick + More… dropdown), importance buttons
- Auto-generates title from first sentence of captured text
- 9 memory types: Note, Person, Project Context, Meeting, Decision, Idea, Resource, Client, Content
- 4 importance levels: Low, Medium, High, Critical — with colored badges
- Search bar + type/importance/tag filters + Clear button + result count
- 2-column card grid with type accent strips, badges, tag chips, related people
- Full edit modal: title, content, type, importance, tags (Enter/comma to add), related people, related projects (linked from `sovereign_projects`), delete with confirmation
- Persisted to `sovereign_memory_items`
- AI-ready context helper: `lib/memory/context.ts` — `getRelevantMemoryContext(query, items, projects)` keyword/tag/people scoring, returns top 5 with formatted markdown `contextBlock`
- Homepage widget (`components/MemoryWidget.tsx`): total count, high-priority count, last 4 recent items, link to /memory

### Narrative Bank (`/narrative`)
- Editable brand narratives and one-liners
- Copy-to-clipboard on each card
- Persisted to `sovereign_narratives`

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
| `sovereign_project_tasks` | Per-project task list |
| `sovereign_content_items` | Content Pipeline items |
| `sovereign_focus_sessions` | Focus session records |
| `sovereign_memory_items` | Memory Engine entries |
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
6. **localStorage only** — No cross-device sync. All data is browser-local. Supabase persistence is the next major phase.
7. **`/narrative` route still live** — Narrative Bank still exists at `/narrative` for backwards compatibility; the main Memory Engine is at `/memory`.

---

## Next Major Phase: Supabase Persistence

When ready to add Supabase:
- Migrate `sovereign_*` localStorage keys → Supabase tables (one per domain: projects, tasks, sessions, memory, content, planner)
- Use row-level security with user auth (Supabase Auth or JWT cookie)
- Keep localStorage as offline cache / optimistic write
- Focus sessions and memory entries are the highest-value tables to migrate first
- Reference: `lib/keys.ts` maps every key that needs a corresponding table

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
