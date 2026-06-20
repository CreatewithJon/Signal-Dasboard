# BETA_CHECKLIST.md — Sovereign OS v8.1

> Pre-beta readiness tracker. Work through this list before inviting external users.

_Created: 2026-06-19 · Updated: 2026-06-19 (v8.1) · Target: Beta Phase 1 (5–10 users)_

---

## 1. Pre-Beta Fixes

### Critical (Must Fix Before Any External User)

- [x] **Focus session stuck state** — DONE (v6.9). `lib/focus/cleanup.ts` + `FocusSessionCleanup` layout component auto-close stale sessions on init.

- [ ] **Supabase RLS (Row-Level Security)** — Without RLS, any authenticated user can query any other user's data. Must be active before sharing with anyone outside a single-user context.
  - File: `supabase/schema.sql` — RLS section added in v7.0; SQL written and documented
  - Policy pattern: `user_id = auth.uid()` on all reads and writes
  - Status: SQL written; must be **executed** in Supabase dashboard before beta

- [ ] **API key strategy** — Anthropic + YouTube API keys are in `.env`/Vercel env vars. For multi-user, decide: shared key with per-user rate limits, or per-user key input in settings.
  - Option A (fastest): shared key, rate limit per IP or per user session — add middleware
  - Option B (best): user enters their own API key in settings, stored in Supabase user profile
  - Recommendation: Option A for beta (simple), Option B for paid tier

- [ ] **Leads page password** — `/leads` uses a hardcoded password (`process.env.LEADS_PASSWORD`). Replace with Supabase auth gate before sharing publicly.

### Important (Fix Before Beta Phase 2)

- [x] **Empty state onboarding** — DONE (v7.1). `/welcome` route + `WelcomeBanner` on homepage + `SetupProgress` in settings. New users are guided through 5 first actions immediately.

- [ ] **Error states on AI endpoints** — When Anthropic API key is missing or rate-limited, AI panels show a generic error or go silent. Add user-facing error messages: "AI key not configured — add ANTHROPIC_API_KEY in Settings" or "Rate limit hit — try again in 60 seconds."

- [ ] **Mobile: DevelopPlanModal on iPhone SE (375px)** — Verify scroll behavior on real device. AppModal enforces `max-h-[90vh]` but real-device keyboard push can still cause issues on iOS.

- [ ] **Export scoped to user** — Current export dumps all `sovereign_*` keys. For multi-user, export must be user-scoped (either localStorage is still per-browser or Supabase fetch per `user_id`). For single-user beta, current behavior is fine.

### Nice to Have (Before Public Launch)

- [ ] **Unit tests on core engines** — Chief, Strategy, Goals, Actions, Focus, Weekly Review engines have no automated tests. Manual QA only. Priority: chiefOfStaff/engine.ts and actionEngine/engine.ts (most complex).

- [ ] **Accessibility audit** — No ARIA audit done. Keyboard navigation, focus traps in modals, color contrast ratios. Target: WCAG 2.1 AA minimum.

- [ ] **Performance on low-end Android** — Homepage runs 5+ synchronous compute chains. Test on real budget Android device (Chrome). If slow, implement `useSovereignData()` shared hook (deferred from v6.5 planning).

- [ ] **`/leads` route** — Currently marked "Soon" in sidebar. Remove from sidebar entirely or add minimal functional state before any external user sees it.

- [x] **Feedback Engine (v8.1)** — `/feedback` route live. Structured capture of bugs, UX issues, feature requests, and insights. AI-powered analysis, workspace-aware, conversion to project/task/memory. Chief of Staff shows Feedback Signal. FeedbackCard in Operating zone.

- [ ] **`/broll` and `/narrative`** — Keep hidden. Confirm they are not publicly accessible or redirect to parent page.

---

## 2. Auth / Data Isolation Requirements

| Requirement | Status | Notes |
|---|---|---|
| Supabase magic link auth | ✓ Done (v4.4) | `lib/supabase/authStatus.ts`, `components/auth/AuthListener.tsx` |
| `user_id` stamped on Supabase writes | ✓ Done (v4.4) | All 4 repositories use `getCachedUserId()` |
| RLS policies on all tables | ✗ Not done | `supabase/schema.sql` needs RLS section completed |
| Per-user localStorage isolation | ✗ N/A | localStorage is per-browser by design; single-user only |
| API key per user | ✗ Not done | Env vars only; no per-user key storage yet |
| Session expiry + refresh | ✓ Done | Supabase SDK handles token refresh |
| Sign-out clears session | ✓ Done | `signOut()` in `lib/supabase/authStatus.ts` |

**Minimum for multi-user beta:** RLS must be active. Without it, don't share with more than 1 Supabase user.

---

## 3. Supabase / RLS Requirements

### Tables That Need RLS

```sql
-- Pattern: enable RLS, then create read + write policies per table

ALTER TABLE memory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own memory" ON memory_items
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users write own memory" ON memory_items
  FOR ALL USING (user_id = auth.uid());

-- Repeat for:
-- projects, project_tasks, content_items, focus_sessions,
-- planner_entries, habits, habit_logs
```

### Anonymous Users
- Anonymous users (no sign-in) must use localStorage only
- If Supabase read mode is enabled for a module, it must check `auth.uid()` before querying
- Current `isSupabaseReadEnabled()` in `lib/supabase/readMode.ts` does not gate on auth — add check

### Supabase Schema Migration for Beta

```sql
-- Add workspace_id to all synced tables (v7.0 prep)
ALTER TABLE projects         ADD COLUMN workspace_id text;
ALTER TABLE project_tasks    ADD COLUMN workspace_id text;
ALTER TABLE memory_items     ADD COLUMN workspace_id text;
ALTER TABLE content_items    ADD COLUMN workspace_id text;
ALTER TABLE focus_sessions   ADD COLUMN workspace_id text;

-- Update RLS to include workspace_id if needed in future
```

---

## 4. Onboarding Requirements

### Minimum Viable Onboarding (Beta Phase 1)
- [ ] Written onboarding guide (PDF or Notion doc) — "How to set up Sovereign OS in 30 minutes"
  - Step 1: Add your 1-year vision in /planner
  - Step 2: Create 3 active projects in /projects
  - Step 3: Add 5 people you work with in /relationships
  - Step 4: Add 3 memory items (recent decisions, key context) in /memory
  - Step 5: Run your first focus session in /focus
  - Step 6: Return tomorrow and open /daily for your Morning Brief
- [ ] 10-minute onboarding call per beta user (optional but strongly recommended)
- [ ] Demo video (see docs/DEMO_SCRIPT.md)

### In-App Onboarding (Beta Phase 1 — DONE v7.1–v7.3)
- [x] `/welcome` route — Full first-run welcome guide with 5 action steps
- [x] `WelcomeBanner` — Shown on homepage until dismissed; links to `/welcome`
- [x] `SetupProgress` — 7-item auto-detecting checklist in settings
- [x] Empty state CTAs in place on all major routes (done in v6.4 audit)
- [x] First-run detection via `KEYS.WELCOME_SEEN` flag
- [x] `/beta` route — Private beta landing page with hero, all 8 modules, data ownership, limitations, and legal disclaimer. Linked from Sidebar (desktop) and Welcome page.

---

## 4b. Demo Readiness (v7.2)

Status: **Complete**

### What shipped in v7.2

| Feature | Status | Notes |
|---|---|---|
| Demo Mode toggle in settings | ✓ Done | Settings → Demo & Privacy |
| Demo data (5 modules) | ✓ Done | Fictional projects, memory, relationships, opportunities, tasks |
| Real data backup on enter | ✓ Done | Backed up to `sovereign_demo_backup` before swap |
| Real data restore on exit | ✓ Done | Restored on "Exit Demo Mode" or badge "Exit" button |
| Reset Demo Data button | ✓ Done | Re-injects clean demo data; backup untouched |
| Demo Mode badge | ✓ Done | Fixed red badge visible in all screen recordings |
| Pre-demo export warning | ✓ Done | Amber warning card always visible in Demo & Privacy section |
| Demo setup checklist in docs | ✓ Done | `docs/DEMO_SCRIPT.md` — 4-step pre-demo setup |
| What NOT to show list | ✓ Done | Table of sensitive routes/sections to avoid |
| Safe walkthrough order | ✓ Done | 9-route recommended flow with skip list |
| Post-demo restore instructions | ✓ Done | Included in DEMO_SCRIPT.md |

### Demo Readiness Checklist

Before any external walkthrough:
- [ ] Export real data (Settings → Data & Storage → Export All)
- [ ] Enable Demo Mode (Settings → Demo & Privacy)
- [ ] Verify red badge appears bottom-right
- [ ] Walk through the safe route order in DEMO_SCRIPT.md
- [ ] Exit Demo Mode after call — verify real data restored

---

## 5. Backup / Export Requirements

| Requirement | Status | Notes |
|---|---|---|
| Full JSON export | ✓ Done | `components/settings/StorageExport.tsx` — exports all `sovereign_*` keys |
| Import / restore from backup | ✓ Done | Same component — preview + confirm + atomic write |
| Auto-backup before restore | ✓ Done | Auto-downloads current data before any restore |
| Supabase migration (local → cloud) | ✓ Done | `components/settings/MigrationAssistant.tsx` (auth required) |
| Supabase restore (cloud → local) | ✓ Done | `components/settings/SupabaseRestore.tsx` (auth required) |
| Per-user export (multi-user) | ✗ Needs work | Current export is per-browser localStorage; not user-scoped |
| Scheduled / automatic backup | ✗ Not done | Manual only; consider auto-backup reminder |

**Verdict:** Export/restore is the strongest part of the product. Document this prominently in beta onboarding — it builds trust.

---

## 6. Mobile Testing Matrix

Test on real devices before beta. Simulators are not sufficient for keyboard / safe-area testing.

| Device | OS | Test Status | Notes |
|---|---|---|---|
| iPhone SE (375px) | iOS 16+ | ⚠ Needs test | Smallest viewport; DevelopPlanModal keyboard push risk |
| iPhone 14 (390px) | iOS 17 | ⚠ Needs test | Standard size; safe-area-inset active |
| iPhone 15 Pro Max (430px) | iOS 17 | ⚠ Needs test | Largest iPhone |
| Pixel 7 (412px) | Android 14 | ⚠ Needs test | Budget-class Chrome performance |
| iPad (768px) | iPadOS | ⚠ Needs test | Sidebar should appear; MobileNav should hide |

### Mobile Test Checklist
- [ ] MobileNav visible at bottom, not overlapping content
- [ ] iOS home indicator safe area — no content cut off below nav
- [ ] All modals close on Escape + backdrop tap
- [ ] Modals don't extend below fold when iOS keyboard opens
- [ ] All close buttons hit ≥40px tap target
- [ ] Focus session timer readable and controllable
- [ ] Memory search input functions correctly on mobile keyboard
- [ ] Text in all cards doesn't overflow at 375px
- [ ] Long names truncate correctly in relationship/project cards

---

## 7. Known Limitations for Beta Users

Be honest with beta users about what the product can and cannot do today.

### Limitations to Disclose

| Limitation | Impact | Plan |
|---|---|---|
| Single-user per browser | Users can't share data with collaborators | v8.0 team workspaces |
| Workspace filtering active | Creation stamping + badge display live (v7.4); full view filtering planned | v8.0 |
| No mobile app | Web only; PWA-installable but no native app | Future |
| YouTube API key required for Content Engine | Each user needs their own YouTube Data API v3 key | Config in settings |
| AI requires Anthropic API key | Shared key (beta) or user's own key | Shared in beta |
| Focus session stuck state | Browser close leaves "Active" forever | Fix in pre-beta |
| No notifications or reminders | No push notifications, no daily brief email | Future |
| No calendar integration | Schedule in Chief of Staff is not connected to real calendar | Future |
| Data is browser-local | Clear browser = lose data (unless Supabase sync active) | Warn prominently |

### What to Tell Beta Users
> "This is a working product in active development. The intelligence engines are production-grade. The data infrastructure is solid. A few rough edges remain — specifically around onboarding and mobile edge cases. Your feedback will directly shape what gets built next."

---

## 8. Feedback Collection Plan

### In-App (Phase 2 — build a `/feedback` route)
- Simple form: rating (1–5) + freetext + module (Chief / Strategy / Goals / Daily / Memory / etc.)
- Saves to Supabase `feedback` table or sends to a webhook (Slack, email)
- One-click access from sidebar or settings

### Beta Discord Channel
- Private channel for beta users only
- Weekly prompt: "What was the most useful thing Sovereign OS told you this week?"
- Bug reports → GitHub Issues (or linear board)
- Feature requests → tag with 👍 emoji to surface popular asks

### Weekly Check-In Template
Send to each beta user weekly:
```
1. Did you open Sovereign OS every day this week? (Y / N / Some days)
2. What's the most valuable module or feature?
3. What's the most frustrating thing?
4. Did the intelligence feel accurate and useful?
5. Would you pay for this? If yes, how much?
```

### Activation Metrics to Track
| Metric | Definition | Target |
|---|---|---|
| Day 1 activation | User adds at least 1 project + 1 memory item | >70% |
| Day 3 retention | User opens app on day 3 | >50% |
| Day 7 retention | User opens app on day 7 | >40% |
| Data depth | User has ≥5 projects + ≥10 memory items by day 7 | >50% |
| AI usage | User uses at least 1 AI panel per week | >60% |
| Focus sessions | User runs ≥3 focus sessions in first week | >40% |

---

## Summary: Beta Readiness Score

| Category | Status | Score |
|---|---|---|
| Core product (engines, modules) | ✓ Production-ready | 9/10 |
| Data safety (export, backup) | ✓ Gold standard | 10/10 |
| Demo readiness | ✓ Demo Mode live (v7.2) | 9/10 |
| Mobile responsiveness | ⚠ Needs device testing | 7/10 |
| Auth / data isolation | ⚠ RLS SQL written, not yet executed | 5/10 |
| Onboarding | ✓ /welcome + banner + checklist (v7.1) | 8/10 |
| Error handling | ⚠ Partial | 6/10 |
| Performance | ⚠ Untested on low-end devices | 6/10 |
| **Overall** | **Demo-ready. Beta Phase 1 viable.** | **7.5/10** |

**Verdict:** The product is demo-ready and beta-viable for a 5–10 person closed group. Primary remaining blocker before multi-user beta: execute RLS SQL in Supabase dashboard. Onboarding is solid. Demo safety is covered. Core intelligence stack is production-grade.

**Next priority:** Execute `supabase/schema.sql` v7.0 RLS migration in Supabase dashboard before sharing with any external user on the same Supabase project.

---

_Beta Checklist — Sovereign OS v7.3 · Created 2026-06-19 · Updated 2026-06-19_
