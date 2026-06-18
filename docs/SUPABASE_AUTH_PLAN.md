# Supabase Auth Plan — Sovereign OS

> Architecture and policy decisions for authentication and per-user data scoping.

_Version: v4.5 (Migration Assistant — manual push from localStorage to Supabase)_
_Last updated: 2026-06-18_

---

## Auth Modes

The system operates in one of three modes:

| Mode | Condition | Behavior |
|---|---|---|
| `anonymous-local` | Supabase not configured | App is fully local; no auth possible |
| `supabase-auth-ready` | Supabase configured, user not signed in | App works normally; `user_id = null` on writes |
| `authenticated` | Supabase configured + signed in | `user_id` stamped on writes; data stays in localStorage |

**The app is fully functional in all three modes.**
localStorage remains the source of truth until the Read Shift phase (v4.7).

---

## v4.4 — Auth Readiness (Current)

What changed:
- `lib/supabase/client.ts` — `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`
- `lib/supabase/authStatus.ts` — `getAuthStatus()`, `getCachedUserId()`, `initAuthListener()`, `sendMagicLink()`, `signOut()`
- `components/auth/AuthListener.tsx` — mounted in root layout; starts `onAuthStateChange` listener
- All 4 repositories — row mappers now call `getCachedUserId()` instead of hardcoding `null`
- `/settings` — Auth Status section with sign-in form (magic link) or signed-in state
- Auth is **optional** — no gating, no redirect, no forced login

What did NOT change:
- localStorage is still the source of truth
- All Supabase writes are still background fire-and-forget
- No data was migrated
- Anonymous users continue working as before

---

## Sign-In Flow (Magic Link)

1. User enters email in Settings → Auth Status section
2. `sendMagicLink(email, redirectTo)` calls `supabase.auth.signInWithOtp()`
3. Supabase emails a one-time link
4. User clicks link → redirected to `/settings` (or whatever `redirectTo` was set to)
5. `detectSessionInUrl: true` picks up the token from the URL hash
6. `onAuthStateChange` fires with `SIGNED_IN` event
7. `initAuthListener` updates `_cachedUserId` in memory
8. All subsequent Supabase row writes include the user's UUID

**Supabase Dashboard config required:**
- Auth → URL Configuration → Site URL: `https://your-domain.com`
- Auth → URL Configuration → Redirect URLs: add `https://your-domain.com/settings`
  (and `http://localhost:3000/settings` for local dev)

---

## user_id in Repositories

All four repositories now call `getCachedUserId()` when building Supabase row objects:

```typescript
// Before (v4.3 and earlier)
user_id: null

// After (v4.4+)
user_id: getCachedUserId()  // returns string | null
```

`getCachedUserId()` is synchronous — no async overhead per-write. The value is
populated by `initAuthListener()` which fires `getSession()` once on mount and
subscribes to `onAuthStateChange` for updates.

When `user_id = null` (anonymous), Supabase accepts the write normally because
the column is nullable. When auth is enabled, the value will be a valid UUID.

---

## Data Migration (v4.5 — Complete)

Migration is available via the **Data Migration** section in Settings (`/settings`).

**How it works:**
1. User must be signed in (auth gate in the UI)
2. Click **Analyze Local Data** — dry-run reads localStorage; returns counts per module
3. Review the preview table (local count, eligible, skipped)
4. Check the confirmation checkbox
5. Click **Run Migration** — upserts each item via existing repository functions
6. Result table shows succeeded/failed per module; errors listed by item ID

**Implementation:** `lib/supabase/localMigration.ts`
- `analyzeLocalDataForMigration()` — pure, no writes, no Supabase calls
- `migrateLocalDataToSupabase()` — requires `getCachedUserId() !== null`; calls existing `upsertXSupabase()` functions; continue-on-error; localStorage never touched

**This is opt-in** — user chooses when to migrate. App continues working from
localStorage before and after migration. Safe to run multiple times (idempotent upserts).

---

## Future: Row-Level Security (v4.6)

Once users are consistently signing in and data has been migrated:

```sql
-- Enable RLS on all tables
alter table projects          enable row level security;
alter table project_tasks     enable row level security;
alter table memory_items      enable row level security;
alter table content_items     enable row level security;
alter table focus_sessions    enable row level security;
alter table planner_entries   enable row level security;
alter table habits            enable row level security;
alter table habit_logs        enable row level security;

-- Policy: each user sees only their own rows
create policy "users see own rows" on projects
  for all using (auth.uid() = user_id);
-- (repeat for each table)
```

**Do not enable RLS until:**
- Auth is stable and in use
- Existing `user_id = null` rows have been updated (or deleted)
- A migration has been run to assign user_id on all historical writes

Enabling RLS while `user_id = null` rows exist will hide them from the user.

---

## Future: Anonymous → Authenticated Merge (v4.5+)

If a user has written data while anonymous (`user_id = null`) and then signs in,
those null rows will not be visible after RLS is enabled. Strategy:

1. Before enabling RLS, run a one-time migration:
   ```sql
   -- Assign all null rows to the first authenticated user (personal use case)
   update projects set user_id = '<your-uuid>' where user_id is null;
   ```
2. Or use the `/api/migrate` endpoint which will upsert localStorage data
   with the authenticated user_id, effectively claiming those records.

---

## Workspace Mode (Future — v5.x)

```
profiles
  └── workspaces
       ├── workspace_members
       └── [all tables gain workspace_id column]
```

RLS policy with workspace support:
```sql
using (
  workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid()
  )
)
```

Personal workspace is created automatically on sign-up.
Sharing is opt-in per workspace, not per item.

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

Both are browser-safe (public). Never expose the **service role key** to the browser.

---

## Security Notes

- Supabase anon key is intentionally public — it allows unauthenticated reads/writes
  per your table policies. Until RLS is enabled, all data is openly writable.
- Do not store sensitive data (BTC holdings, personal secrets) in Supabase until
  RLS is active and you have verified your policies.
- Magic links expire after 1 hour by default (configurable in Supabase Auth settings).
- Sessions are stored in `localStorage` by the Supabase client (not our sovereign
  data, the auth session itself). This is standard Supabase behavior.
