# Supabase Sync Plan — Sovereign OS

> This document covers the architecture for migrating Sovereign OS from
> browser-local localStorage to Supabase-backed persistence with cross-device
> sync, backups, and future workspace support.

_Version: v4.0 (Foundation only — no sync active yet)_
_Last updated: 2026-06-17_

---

## Why localStorage Remains Active

localStorage is the current source of truth for all Sovereign OS data.
Migrating to Supabase is a multi-step process — doing it all at once risks data
loss, broken UX, and cascading bugs across the ~15 components that read from it.

**The phased approach:**
- v4.0 — Foundation: install client, define schema, status visibility, docs
- v4.1 — Write sync: writes go to both localStorage AND Supabase in parallel
- v4.2 — Auth: user_id populated; data is scoped per user
- v4.3 — RLS: row-level security; data is private by default
- v4.4 — Read shift: components read from Supabase; localStorage becomes cache

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

### v4.1 — Dual Write (parallel, no read shift)

When a user saves any record:
1. Write to localStorage (existing behavior — unchanged)
2. If Supabase is configured, write to Supabase in the background
3. Failures are silent — localStorage remains authoritative
4. No reads from Supabase yet

Implementation pattern:
```ts
async function saveProject(project: Project) {
  // 1. Always save locally first
  persist(KEYS.PROJECTS, [...projects]);

  // 2. Background sync to Supabase if available
  const sb = getSupabaseClient();
  if (sb) {
    await sb.from("projects").upsert(toSupabaseProject(project)).catch(console.warn);
  }
}
```

### v4.2 — Auth Integration

- Add Supabase Auth (magic link or Google OAuth)
- On sign-in: associate existing local data with user_id
- Migration endpoint: POST `/api/v4/migrate` accepts localStorage dump,
  upserts all records with the authenticated user_id
- Session persisted via Supabase Auth cookie

### v4.3 — Row-Level Security

```sql
alter table projects enable row level security;
create policy "users see own data"
  on projects for all
  using (auth.uid() = user_id);
```

Repeat for all tables. After this phase, data is fully private per user.

### v4.4 — Read Shift

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
