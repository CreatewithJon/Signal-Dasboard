# Supabase Sync Plan — Sovereign OS

> This document covers the architecture for migrating Sovereign OS from
> browser-local localStorage to Supabase-backed persistence with cross-device
> sync, backups, and future workspace support.

_Version: v4.6 (Read Preview — read-only Supabase inspection with local vs remote comparison)_
_Last updated: 2026-06-18_

---

## Why localStorage Remains Active

localStorage is the current source of truth for all Sovereign OS data.
Migrating to Supabase is a multi-step process — doing it all at once risks data
loss, broken UX, and cascading bugs across the ~15 components that read from it.

**The phased approach:**
- v4.0 — Foundation: install client, define schema, status visibility, docs ✓
- v4.1 — Dual-write: Memory — localStorage + Supabase in parallel ✓
- v4.2 — Dual-write: Projects, Tasks, Content, Focus Sessions ✓
- v4.3 — Sync Health + Restore: per-module last-write tracking, settings health panel, manual backup restore ✓
- v4.4 — Auth Readiness: optional magic-link sign-in, user_id cache, getCachedUserId() in repositories ✓
- v4.5 — Migration Assistant: dry-run preview + manual push of localStorage data to Supabase ✓
- v4.6 — Read Preview: read-only Supabase inspection, local vs remote count comparison ✓ (current)
- v4.7 — RLS: row-level security; data private by default
- v4.8 — Read shift: components read from Supabase; localStorage becomes write-through cache

At each phase, the system is fully functional and the previous layer remains intact.

---

## What Supabase Will Store

| Table | Maps to localStorage key | Notes |
|---|---|---|
| `projects` | `sovereign_projects` | Full project records |
| `project_tasks` | `sovereign_project_tasks` | FK to projects |
| `memory_items` | `sovereign_memory_items` | Tags/people as jsonb |
| `content_items` | `sovereign_content_items` | Platforms as jsonb array |
| `focus_sessions` | `sovereign_focus_sessions` | Timer/review data |
| `planner_entries` | `sovereign_planner_*` | Unified table by horizon |
| `habits` | `sovereign_habits` | Habit definitions |
| `habit_logs` | `sovereign_habit_log` | One row per habit per day |
| `profiles` | n/a | User metadata (v4.2+) |

**Not migrated to Supabase (remain localStorage-only for now):**
- `sovereign_ai_messages` — ephemeral; not worth persisting
- `sovereign_note` — quick scratch pad; ephemeral
- `sovereign_sessions` / `sovereign_streak` — computed daily values
- `sovereign_btc_stack` — sensitive; migrate only when auth is live
- `sovereign_brand_*` — low frequency; migrate in v4.4
- `sovereign_narratives` — being superseded by memory_items
- `sovereign_teleprompter_script` — ephemeral tool state

---

## Proposed Sync Strategy

### v4.1 — Dual Write: Memory ✓

Memory items dual-write via `lib/repositories/memoryRepository.ts`.
Pattern: `saveMemoryItemDual(item)` — localStorage first, Supabase in background.
Returns `DualWriteResult { local, supabase, error? }`. UI shows sync status.

### v4.2 — Dual Write: All Core Modules ✓

Repositories created for all remaining core modules:

| Repository | Table | Operations |
|---|---|---|
| `lib/repositories/projectRepository.ts` | `projects` | create, update, archive (upsert) |
| `lib/repositories/projectRepository.ts` | `project_tasks` | create, update, delete, batch |
| `lib/repositories/contentRepository.ts` | `content_items` | create, update, archive |
| `lib/repositories/focusSessionRepository.ts` | `focus_sessions` | start, complete, abandon |

**Wiring pattern:** Pages keep their existing full-array localStorage writes unchanged.
Each mutation function fires `upsertXSupabase(item)` in the background (`void`).
This avoids seed data regression (projects page seeds) and minimizes diff surface.

**Reorders not synced** — `reorderTasks` in projects page does not have a Supabase
sync because the schema has no `sort_order` field. Reorder is localStorage-only.

**Memory saves from focus + content** — `handleSaveReview` (focus page) and
`saveToMemory` (ContentAIPanel) now call `saveMemoryItemDual` instead of direct
`localStorage.setItem`, completing cross-module memory dual-write coverage.

### v4.3 — Sync Health + Manual Restore ✓

New utilities, components, and enhanced StorageExport:

| File | Purpose |
|---|---|
| `lib/supabase/syncHealth.ts` | `recordSyncResult()` called by all repos after Supabase writes; `getSyncHealth()` aggregates report |
| `components/settings/SyncHealth.tsx` | Settings panel — per-module table with local count, last sync result, warnings |
| `components/settings/StorageExport.tsx` | Enhanced: Export (unchanged) + Restore from backup (new) |

**`sovereign_sync_status` localStorage key** — stores last Supabase write result per module:
```json
{
  "memory":         { "module": "memory", "operation": "upsert", "timestamp": "...", "local": "success", "supabase": "skipped" },
  "projects":       { "module": "projects", ... },
  "project_tasks":  { "module": "project_tasks", ... },
  "content":        { "module": "content", ... },
  "focus_sessions": { "module": "focus_sessions", ... }
}
```

**Restore safety constraints:**
- File must be valid JSON with at least one recognized `sovereign_*` key
- Preview screen shows key names + item counts before any write
- Pre-restore backup is automatically downloaded before overwriting
- Reload button shown after successful restore (no auto-reload)
- No auto-import; confirmation button required

### v4.6 — Read Preview ✓

Read-only Supabase inspection for post-migration verification:

| File | Purpose |
|---|---|
| `lib/supabase/readPreview.ts` | `fetchSupabasePreview()` — counts + latest 5 records per module |
| `components/settings/SupabaseReadPreview.tsx` | Settings panel with comparison table and expandable record previews |

**Fetch behavior:**
- `fetchSupabasePreview()` requires `getCachedUserId() !== null`
- Runs a count query (`select id, { count: exact, head: true }`) per table
- Runs a latest-5 query (`select id, title, updated_at order by updated_at desc limit 5`) per table
- Compares Supabase counts against local counts from repository read functions
- Module-level errors are non-fatal; other modules still load

**Comparison table:** Module | Local | Supabase | Diff
- Diff `✓` = counts match
- Diff `+N local` = N more items in localStorage than Supabase (migration needed)
- Diff `N remote` = more items in Supabase than local (unusual; worth investigating)

**Expandable rows:** Click any module row to see the latest 5 Supabase records (id prefix, title, time-ago)

**Safety:** No writes, merges, or deletes. Persistent warning banner: "Verification only. Supabase is not yet the source of truth."

**RLS note:** Until v4.7, all table rows are returned (no user_id filter). This is expected for single-user personal use.

### v4.5 — Migration Assistant ✓

New utility and settings panel for manually pushing localStorage data to Supabase:

| File | Purpose |
|---|---|
| `lib/supabase/localMigration.ts` | `analyzeLocalDataForMigration()` (dry run) + `migrateLocalDataToSupabase()` (write) |
| `components/settings/MigrationAssistant.tsx` | Settings panel with analyze → preview → confirm → migrate → result flow |

**Migration flow:**
1. User clicks Analyze — reads localStorage, counts eligible items per module, shows dry-run table
2. User reviews preview, checks confirmation checkbox
3. User clicks Run Migration — upserts each eligible item via existing repository functions
4. Result table shows succeeded / failed counts per module

**Safety constraints:**
- Requires authenticated user (`getCachedUserId() !== null`)
- localStorage is never read for auth gate — uses `getCachedUserId()` sync check
- All upserts use the item's existing `id` → idempotent; safe to run multiple times
- Individual item failures do not abort migration; continue-on-error
- localStorage is NEVER modified at any point
- `analyzeLocalDataForMigration()` is pure — no writes, no Supabase calls

**Modules covered:** Memory, Projects, Project Tasks, Content Items, Focus Sessions

### v4.4 — Auth Integration

- Add Supabase Auth (magic link or Google OAuth)
- On sign-in: associate existing local data with user_id
- Migration endpoint: POST `/api/v4/migrate` accepts localStorage dump,
  upserts all records with the authenticated user_id
- Session persisted via Supabase Auth cookie

### v4.5 — Row-Level Security

```sql
alter table projects enable row level security;
create policy "users see own data"
  on projects for all
  using (auth.uid() = user_id);
```

Repeat for all tables. After this phase, data is fully private per user.

### v4.6 — Read Shift

- Components read from Supabase on mount
- localStorage used as a write-through cache (optimistic updates)
- Conflict resolution: last-write-wins by `updated_at`
- Offline: reads from localStorage; writes queued for sync on reconnect

---

## Conflict Handling

**v4.1 / v4.2 (dual write, no read shift):**
No conflicts possible — localStorage is sole source of truth, Supabase is
a shadow copy. Reads never happen from Supabase.

**v4.4 (read shift):**
Strategy: last-write-wins by `updated_at`.

If Supabase has `updated_at > localStorage.updated_at`:
- Use Supabase version, update localStorage cache

If localStorage has `updated_at > Supabase.updated_at`:
- Use localStorage version, upsert to Supabase

To handle concurrent edits from two devices:
- Show a "conflict detected" toast with a diff view (future)
- Default: server (Supabase) wins to prevent data fragmentation

---

## Backup / Export Approach

**Before Supabase (v4.0 / v4.1):**
- Export: Settings page will have "Export All Data" button
- Downloads a `sovereign-os-backup-YYYY-MM-DD.json` with all localStorage keys
- Import: "Restore from backup" reads the file and writes to localStorage

**After Supabase (v4.2+):**
- Nightly Supabase scheduled backup (built-in on paid plans)
- Point-in-time recovery via Supabase Pro
- Manual export still available as JSON download via `/api/export`

---

## Future Workspace Architecture

When Sovereign OS expands to support multiple users or teams:

```
profiles
  └── workspaces (future table)
       ├── workspace_members
       └── [all tables gain workspace_id column]
```

Isolation model: data is scoped to `workspace_id` (which defaults to
the user's personal workspace). Sharing is opt-in per item.

**Row-level security pattern:**
```sql
using (
  workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid()
  )
)
```

This supports: personal use → shared workspace → team workspace, all within
the same schema without restructuring.

---

## Migration Phases Summary

| Phase | Version | What changes |
|---|---|---|
| Foundation | v4.0 | Install client, schema, status utility, docs — no data movement |
| Dual Write | v4.1 | Writes go to localStorage + Supabase; reads unchanged |
| Auth | v4.2 | User identity; migration endpoint; user_id populated |
| RLS | v4.3 | Row-level security enabled; data private per user |
| Read Shift | v4.4 | Reads from Supabase; localStorage as cache; offline support |

---

## Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

Both are public-safe (anon key is intended to be exposed to browsers).
Service role key is NOT used and must never be exposed to the browser.

---

## How to Set Up Supabase Project

1. Create project at https://supabase.com/dashboard
2. Go to Settings → API → copy Project URL and anon public key
3. Add to Vercel environment variables:
   ```bash
   npx vercel env add NEXT_PUBLIC_SUPABASE_URL
   npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```
4. Run `supabase/schema.sql` in the Supabase SQL Editor
5. Redeploy — Settings page will show "Supabase Ready" status

That's it for v4.0. No other changes needed until v4.1 dual-write is implemented.
