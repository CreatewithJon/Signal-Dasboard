# PRODUCT_READINESS_AUDIT.md — Sovereign OS v6.6

> Run 2026-06-19 · Covers routes, feature overlap, data safety, mobile, and pre-commercial checklist.

---

## 1. Route Audit

| Route | Loads | Nav | Mobile Nav | Empty State | Notes |
|---|---|---|---|---|---|
| `/` | ✓ | ✓ | ✓ | n/a | DashboardShell + TodayCommand hero (v6.3) + DailyRhythmCard (v6.6) |
| `/daily` | ✓ | ✓ | ✓ | ✓ | Daily Operating Rhythm — 5 sections, per-day state, *added v6.6* |
| `/chief` | ✓ | ✓ | ✓ | ✓ fixed | Was silent `null`; now shows friendly message |
| `/strategy` | ✓ | ✓ | ✓ | ✓ | "Add active projects or set vision in /planner" |
| `/goals` | ✓ | ✓ | ✓ | ✓ | Links to /planner when no objectives |
| `/review` | ✓ | ✓ | ✓ | ✓ | Shows zeroed stats + empty section messages |
| `/actions` | ✓ | ✓ | ✓ | ✓ | Comprehensive — 3-button CTA flow when empty |
| `/focus` | ✓ | ✓ | ✓ | ✓ | Skeleton loaders; score ring degrades to 0 |
| `/briefing` | ✓ | ✓ | ✓ | ✓ | Full onboarding empty state with 4 module links |
| `/projects` | ✓ | ✓ | ✓ | ✓ | Empty list + "Add Project" button |
| `/content` | ✓ | ✓ | ✓ | ✓ | Content pipeline empty state present |
| `/relationships` | ✓ | ✓ | ✓ | ✓ | Empty contact list + add button |
| `/memory` | ✓ | ✓ | ✓ | ✓ | "No memories yet" state |
| `/graph` | ✓ | ✓ | ✓ | ✓ | Stats degrade to 0; onboarding CTA links |
| `/settings` | ✓ | ✓ | ✓ | n/a | System-level page; always has content |
| `/opportunities` | ✓ | sidebar | no mobile tab | ✓ | Not in MobileNav — acceptable (secondary route) |
| `/planner` | ✓ | ✓ | ✓ | ✓ | Vision goals; empty = "Define your 1yr vision" |
| `/brand` | ✓ | ✓ | no mobile tab | partial | Not in MobileNav; brand roadmap page |

### Nav Coverage

**Sidebar** — all routes covered  
**MobileNav** — covers: chief, strategy, goals, review, actions, home, focus, projects, content, planner, memory, opportunities, graph, relationships  
**Not in MobileNav**: /brand, /narrative, /broll, /leads, /teleprompter, /briefing, /settings — acceptable for secondary/utility routes

---

## 2. Feature Overlap Analysis

### The Intelligence Stack (Chief → Strategy → Goals → Review → Actions → Focus → Briefing)

These 7 routes all compute from the same underlying data (projects, tasks, habits, focus sessions, content, relationships, memory). The concern is user confusion about which page to visit when.

### Role Differentiation Map

| Route | Primary Question | Timeframe | Output Type |
|---|---|---|---|
| `/chief` | "What's my executive status?" | Rolling week | Synthesized brief + AI chat |
| `/strategy` | "Where am I going?" | 30/60/90 days | Plans + confidence score |
| `/goals` | "How do I execute on objectives?" | Per objective | Milestones + decomposed tasks |
| `/review` | "How did last week go?" | Past week | Retrospective + next-week focus |
| `/actions` | "What should I do right now?" | Today | Scored action queue |
| `/focus` | "Start working" | Session | Timer + priorities |
| `/briefing` | "What's my day?" | Today | Daily context synthesis |

**Assessment**: These are well-differentiated by timeframe and question type. The overlap is intentional — each engine consumes upstream data from the others (Actions feeds Chief feeds Strategy). This is a layered intelligence architecture, not feature bloat.

### Genuine Overlap Concerns

**Chief + Briefing**: Both produce "today" synthesis. Chief is more comprehensive (includes AI reasoning, schedule, opportunities, risks). Briefing is lighter (headline, priorities, habits). They serve different depths: Briefing is a quick 30-second scan; Chief is a deep 5-minute read.

**Recommendation**: Keep both. Consider renaming `/briefing` → `/daily` to reduce the "daily brief vs chief brief" confusion. Flag for v6.5.

**Actions + Focus**: The top action from Action Engine also appears in Focus Engine's priorities, and in Chief's highest leverage action, and in TodayCommand. This triple-surfacing is intentional (it's the most important thing) but the user might feel nudged redundantly.

**Recommendation**: This is fine. Keep the redundancy intentional — signal over noise means the most important action surfaces everywhere.

**Strategy + Goals**: Goals decomposes objectives from Strategy. They're sequential (Strategy first, Goals second). The "Decompose →" link in /strategy correctly connects them.

**Recommendation**: No change needed. The relationship is clear.

### Routes That Could Be Hidden / Secondary

| Route | Concern | Recommendation |
|---|---|---|
| `/narrative` | AI-generated personal narrative; niche use | Mark "Soon" or move to /memory |
| `/broll` | B-roll pipeline requires Higgsfield/FFmpeg | Keep "Soon" badge; don't surface until complete |
| `/brand` | Brand roadmap; specific use case | Move under /content or keep as-is |
| `/graph` | Knowledge Graph is compelling but complex | Surface insights in Chief instead of route-jumping |
| `/leads` | Placeholder / marked Soon | Remove from sidebar until functional |

---

## 3. Data Safety Audit

### localStorage JSON Parsing

**Pattern used everywhere** — consistent `safeRead<T>(key, fallback)` utility:
```ts
function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
```

**Coverage**: 100% — every localStorage read in the codebase uses this pattern or an equivalent try-catch wrapper. No raw `JSON.parse(localStorage.getItem(...))` calls found.

**Verdict**: ✓ SAFE

### Key Registry

`lib/keys.ts` centralizes all 25+ `sovereign_*` localStorage keys. No hardcoded strings found in engines or pages **except** one bug:

**Bug fixed (v6.4)**: `components/OverdueDigest.tsx` used hardcoded `"sovereign_projects"` and `"sovereign_project_tasks"` constants instead of importing from `KEYS`. Fixed to use `KEYS.PROJECTS` and `KEYS.PROJECT_TASKS`.

### Import / Export

`components/settings/StorageExport.tsx` implements:
- **Export**: Iterates all `sovereign_*` keys, exports to dated JSON file ✓
- **Preview**: Validates JSON structure before restore; shows item counts ✓
- **Auto-backup**: Saves current data before any restore operation ✓
- **Restore**: Atomic write + summary of restored keys ✓

**Verdict**: ✓ GOLD STANDARD — best-practice backup flow

### Supabase Dual-Write

Architecture (from `/docs/SUPABASE_SYNC_PLAN.md`):
- Repositories exist for Memory, Projects, Relationships, Opportunities
- Dual-write: localStorage write first → Supabase write second
- Read mode fallback: if Supabase unavailable → silently use localStorage
- Status visible in `/settings` → System Status panel

**Known gap**: Focus sessions and content items are localStorage-only (no repository layer yet). Not a safety risk — data is local — but means no cloud backup for those modules.

**Verdict**: ✓ FUNCTIONAL — localStorage is source of truth; Supabase is additive

### Focus Session Persistence

`FocusSession` objects written to `KEYS.FOCUS_SESSIONS` via `safeWrite` on session end. Session state (Active/Completed/Abandoned) persisted correctly. No data loss path found for in-progress sessions.

**Minor gap**: If the browser is closed mid-session, the session remains "Active" in localStorage indefinitely. A cleanup on app load (mark old "Active" sessions as "Abandoned" if `startedAt` is older than 24h) would improve accuracy.

### Memory Vector Buttons

Vector memory buttons (`/memory` page, semantic search) are protected by a `vectorEnabled` feature flag. When disabled, buttons are hidden. No broken states when Supabase/pgvector not configured.

---

## 4. Mobile Audit (375px · 390px · 430px)

### Issues Fixed in v6.4

**DashboardShell header overflow** (all widths):  
Header was `flex items-center justify-between` with HeroStats pills on the right. At 375px the BTC price pill + focus pill + streak pill would overflow the row.  
**Fix**: Changed to `flex-col sm:flex-row` — stacks vertically on mobile, horizontal on ≥640px.

**TodayCommand grid divider inline styles** (all widths):  
Cells used `style={{ borderColor: "rgba(255,255,255,0.05)" }}` which conflicted with Tailwind `divide-*` utility classes.  
**Fix**: Removed inline `borderColor`/`borderTopWidth` styles; rely solely on `divide-x divide-y divide-white/[0.05]`.

### Remaining Known Issues (Not Fixed — Noted for v6.5)

| Issue | Page/Component | Width | Severity | Notes |
|---|---|---|---|---|
| Relationship widget card names overflow | `/relationships` | 375px | Low | Long names truncate; `truncate` class present but verify |
| Graph cluster list text density | `/graph` | 375px | Low | Many small labels; zoom required |
| Planner vision items word wrap | `/planner` | 375px | Low | Long vision statements may crowd |
| AI chat input keyboard push | All pages with chat | All | Low | iOS keyboard may push content; test on real device |
| Modals lack `max-h-[90vh]` + scroll | `/actions`, `/chief` | 375px | Medium | DevelopPlanModal may extend below fold on iPhone SE |
| Safe-area-inset padding | All pages | All | Low | No `pb-safe` or `env(safe-area-inset-bottom)` — affects iPhone notch |

### What Works Well

- All 2-col grids use `sm:grid-cols-2` → single column at <640px ✓
- `text-xs`, `text-[10px]`, `text-[9px]` scale fine on small screens ✓
- `max-w-3xl mx-auto` / `max-w-5xl mx-auto` constrains content correctly ✓
- `line-clamp-1`, `line-clamp-2`, `truncate` used throughout cards ✓
- `px-4` page padding consistent across all routes ✓
- MobileNav fixed at bottom with correct `z-50` ✓

---

## 5. Product Strengths

1. **Layered intelligence architecture**: Every data point feeds multiple engines. One entry in Projects ripples through Action Engine, Chief of Staff, Strategy, Goals, and Weekly Review automatically.

2. **Local-first, AI-augmented**: All computation is deterministic and instant. AI is an overlay, not a dependency. App works fully offline.

3. **Consistent code patterns**: `safeRead/safeWrite`, `KEYS` registry, `ConvertButton` component, `computeX()` engine pattern — eliminates entire classes of bugs.

4. **Rich empty states**: Users are guided to the right page when data is absent. No dead ends.

5. **Today's Command hero**: The new homepage TodayCommand widget distills everything to 4 critical signals and a single CTA. Excellent executive UX.

6. **Data portability**: Full JSON export/import with auto-backup. User owns their data completely.

---

## 6. Known Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Heavy compute chain on homepage (5+ engines per card × 5 cards) | Medium | All engines are synchronous + pure; localStorage reads are fast. Monitor on low-end Android. |
| No unit tests for engines | Medium | Manual QA only. Any engine change could silently break derived data. |
| Focus session "Active" stuck state | Low | Browser close leaves session as "Active" forever. Add 24h cleanup on app init. |
| AI API key not set | Low | Chief AI chat, Analyze Week, etc. silently fail. SystemStatus shows "API key missing". |
| Supabase connection failure | Low | Falls back to localStorage. User may not know sync stopped. |
| No retry on `/api/chief-chat` | Low | Network hiccup shows error toast; user manually resends. |
| Single-device only (no cloud sync for most modules) | Medium | Data siloed to one browser. Supabase sync partial. Cloud sync roadmap exists in v4.x docs. |
| iOS safe-area-inset missing | Low | Bottom nav may overlap content on notched iPhones. |

---

## 7. Suggested Simplifications

These are recommendations only. Do not delete — assess during v6.5 planning.

### Navigation

- **Rename `/briefing` → `/daily`**: Reduces "chief brief vs daily brief" confusion. The route is a daily context page, not a "briefing" in the executive sense.
- **Group `/narrative` under `/memory`**: Narrative is a memory-derived feature. A tab inside `/memory` makes more sense than a top-level route.
- **Remove `/leads` from sidebar**: Marked "Soon" but appears in the Module nav. Remove from sidebar until it's functional.
- **De-emphasize `/broll`**: B-roll pipeline requires external services not available to most users. Keep hidden until all dependencies are set up.

### Homepage Widgets

Currently 5 AI-compute widgets in the Executive zone (Chief, Strategy, Goals, Weekly Review + TodayCommand hero). Each runs the full compute chain independently. This means 5+ independent `computeStrategicPlan()` calls on homepage load.

**Option A (Safe)**: Accept the duplication — it's all synchronous and fast. Mark as tech debt.  
**Option B (Better)**: Create a shared `useSovereignData()` React context/hook that computes the full chain once, then all homepage cards subscribe. Eliminates duplicate computation.

Recommend **Option B** as a v6.5 refactor. Estimated effort: medium.

### Feature Flags

Add a feature flag system (`lib/featureFlags.ts`) to toggle:
- Vector memory buttons (already partially done)
- Supabase sync visibility
- B-roll pipeline
- Leads page

This avoids surfacing incomplete features to new users.

---

## 8. Pre-Commercial Checklist

### Must-Have Before Sharing

- [x] All major routes load without errors
- [x] Empty states on all major pages
- [x] Data export/import working
- [x] localStorage safety (safeRead pattern everywhere)
- [x] Key registry centralized (no hardcoded strings) — *OverdueDigest bug fixed v6.4*
- [x] Chief page empty state — *fixed v6.4*
- [x] Mobile header stacking — *fixed v6.4*
- [x] Today's Command hero
- [x] Collapsible zones on homepage
- [x] Modal overflow fix — AppModal enforces `max-h-[90vh]` on all 9 migrated modals — *fixed v6.5*
- [x] iOS safe-area-inset on MobileNav — `env(safe-area-inset-bottom)` padding on nav + `viewport-fit=cover` — *fixed v6.5*
- [x] Daily Operating Rhythm `/daily` route — 5-section daily workflow, per-day state reset, TodayCommand CTA updated — *added v6.6*
- [ ] Active session cleanup on app init (>24h old "Active" sessions → "Abandoned")
- [ ] Remove `/leads` from sidebar or add minimal functional state
- [ ] Confirm `/broll` is not publicly accessible (or redirect to /content)

### Nice-to-Have (v6.5 polish round)

- [ ] Rename `/briefing` → `/daily`
- [ ] `useSovereignData()` shared hook to eliminate duplicate compute chains
- [ ] Feature flag system
- [ ] Unit tests for the 6 core engines (chiefOfStaff, strategicPlanner, goalDecomposition, weeklyReview, actionEngine, focusEngine)
- [ ] Accessibility audit (keyboard navigation, ARIA labels, color contrast)
- [ ] Performance audit on low-end Android Chrome

---

## 9. Recommended Next 5 Commits

| # | Commit | Scope | Priority |
|---|---|---|---|
| 1 | **fix: clean up stale Active focus sessions on app init** | `lib/focus/cleanup.ts` + `app/layout.tsx` | High |
| 2 | **fix: modal max-height + scroll on mobile for action/chief AI panels** | `app/actions/page.tsx`, `app/chief/page.tsx` | High |
| 3 | **fix: add iOS safe-area-inset padding to MobileNav** | `components/MobileNav.tsx` | Medium |
| 4 | **refactor: shared useSovereignData hook to eliminate duplicate engine compute** | `lib/hooks/useSovereignData.ts` | Medium |
| 5 | **feat: remove /leads from sidebar until functional; rename /briefing → /daily** | `components/Sidebar.tsx`, `components/MobileNav.tsx`, route rename | Low |

---

## 10. Summary

Sovereign OS is in excellent shape for personal daily use. The architecture is clean, the data safety story is strong, and the intelligence stack is genuinely sophisticated. The main gaps before wider sharing are: one mobile modal overflow issue, missing iOS safe-area padding, and the active session stuck state.

The product's core insight — that deterministic intelligence engines layered over local data produce a personal OS that's instant, private, and AI-augmented — is a strong foundation. The v6.x executive intelligence stack (Chief → Strategy → Goals → Review → Actions) is the differentiated core that makes this worth building on.

**Overall readiness: 8.3 / 10**  
_Fully functional for personal use. 2-3 targeted fixes away from being shareable with others._

---

_Audit conducted: 2026-06-19 · Sovereign OS v6.4_
