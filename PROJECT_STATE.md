# PROJECT_STATE.md — Sovereign OS

_Last updated: 2026-06-17 (v4.3 — Sync Health + Manual Restore)_

---

## Current State

**Version:** Sovereign OS v4.3 (Sync Health + Manual Restore: Complete)
**Stable:** Yes — localStorage-first, Supabase write-through enabled
**Status:** Live, private, password-protected
**Deployment:** Vercel (auto-deploy from `main`)

---

## What's Working

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
