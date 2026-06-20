# RLS_SECURITY_PLAN.md — Sovereign OS v7.0

> Row-Level Security architecture and activation plan for Supabase tables.
> This document is required reading before enabling Supabase sync for external users.

_Created: 2026-06-19_

---

## 1. Current Auth Model

Sovereign OS uses **optional Supabase auth** — the app is fully functional without signing in.

| Mode | Supabase configured | Signed in | `user_id` on writes | RLS effect |
|---|---|---|---|---|
| Anonymous Local | No | No | N/A (no Supabase writes) | N/A |
| Supabase Auth Ready | Yes | No | `null` | Rows not readable once RLS active |
| Authenticated | Yes | Yes | `auth.uid()` (UUID) | Only own rows visible |

**Key library files:**
- `lib/supabase/authStatus.ts` — `getAuthStatus()`, `sendMagicLink()`, `signOut()`
- `lib/supabase/client.ts` — singleton Supabase client; returns `null` when unconfigured
- `components/auth/AuthListener.tsx` — initialises auth state listener in root layout
- All 4 repositories — `getCachedUserId()` stamps `user_id` on every Supabase write

---

## 2. Why RLS Is Required Before External Users

Without RLS, the Supabase **anon key** (which is embedded in the browser client) allows any authenticated user to query any other user's rows. This means:

- User A signs in → can `SELECT * FROM memory_items` and read User B's memories
- User A can `DELETE FROM projects` and destroy User B's work
- There is **no application-level check** that prevents cross-user access at the database level

RLS moves the security boundary to the database itself. Even if the application code has a bug, a user cannot access data that doesn't belong to them.

**RLS is a hard requirement before sharing the app with any external user on the same Supabase project.**

---

## 3. Tables Covered by v7.0 RLS

| Table | Module | RLS Added | Policy |
|---|---|---|---|
| `memory_items` | Memory | ✓ v7.0 | `auth.uid() = user_id` |
| `projects` | Projects | ✓ v7.0 | `auth.uid() = user_id` |
| `project_tasks` | Projects | ✓ v7.0 | `auth.uid() = user_id` |
| `content_items` | Content | ✓ v7.0 | `auth.uid() = user_id` |
| `focus_sessions` | Focus | ✓ v7.0 | `auth.uid() = user_id` |

---

## 4. Tables NOT Yet Covered

| Table | Module | Status | Plan |
|---|---|---|---|
| `planner_entries` | Planner | Local-only — no sync yet | Add RLS when sync is added |
| `habits` | Habits | Local-only — no sync yet | Add RLS when sync is added |
| `habit_logs` | Habits | Local-only — no sync yet | Add RLS when sync is added |
| `profiles` | Auth | One row per user — already user-scoped by design | Add profile RLS in v7.1 |

---

## 5. Policy Design

All 5 covered tables use the same policy pattern:

```sql
alter table <table> enable row level security;

create policy "<table>: users own their rows"
  on <table>
  for all                              -- covers SELECT, INSERT, UPDATE, DELETE
  using     (auth.uid() = user_id)     -- read gate
  with check (auth.uid() = user_id);   -- write gate (prevents spoofing user_id)
```

### Why `for all` (not separate SELECT/INSERT/UPDATE/DELETE policies)?
One `for all` policy is simpler and less error-prone. The `using` clause gates reads and deletes. The `with check` clause gates inserts and updates. Together they cover the full access surface.

### Why no anonymous read policy?
Rows with `user_id = null` are inaccessible once RLS is active. In SQL, `auth.uid() = null` evaluates to `NULL` (not `true`), which is treated as denied. This is the correct security posture:
- Data written before auth was set up (user_id null) should be migrated to a real user before RLS is enabled.
- Leaving null rows accessible would create a public data exposure vector.

### Service Role Exception
The Supabase `service_role` key bypasses RLS by default. It is safe to use in **server-side route handlers** (e.g., Next.js API routes that import from `lib/supabase/server.ts`). It must **never** be exposed to the browser or client-side code.

---

## 6. Anonymous / Local Mode Explanation

When the app runs in localStorage-only mode (no Supabase configured), RLS has no effect — there are no Supabase reads or writes. The app works identically.

When Supabase is configured but the user is **not signed in** (`supabase-auth-ready` mode):
- Writes use `user_id = null` (existing behavior since v4.4)
- Once RLS is active, these `user_id = null` rows become inaccessible via the anon key
- **This is not a breaking change for local-first mode** — reads still come from localStorage
- The Supabase rows are write-through copies; if they become inaccessible, the user still has their full local data

**Recommendation:** Encourage users to sign in before enabling Supabase sync, so `user_id` is populated from the start.

---

## 7. Migration Concern: Existing `user_id = null` Rows

If you have already been writing to Supabase while unauthenticated (mode = `supabase-auth-ready`), those rows have `user_id = null`. Once RLS is enabled, they become inaccessible via the authenticated anon key.

### Step-by-Step Migration

```sql
-- Step 0: Sign in to your Supabase project via magic link in the app.
-- Then find your user UUID:
select auth.uid();
-- Copy the result — this is <YOUR-UUID>

-- Step 1: Claim all null-user_id rows
-- Run in Supabase SQL editor (runs as service_role, bypasses RLS):
update memory_items    set user_id = '<YOUR-UUID>' where user_id is null;
update projects        set user_id = '<YOUR-UUID>' where user_id is null;
update project_tasks   set user_id = '<YOUR-UUID>' where user_id is null;
update content_items   set user_id = '<YOUR-UUID>' where user_id is null;
update focus_sessions  set user_id = '<YOUR-UUID>' where user_id is null;

-- Step 2: Verify no null rows remain
select 'memory_items'   as tbl, count(*) from memory_items   where user_id is null
union all
select 'projects',                count(*) from projects       where user_id is null
union all
select 'project_tasks',           count(*) from project_tasks  where user_id is null
union all
select 'content_items',           count(*) from content_items  where user_id is null
union all
select 'focus_sessions',          count(*) from focus_sessions where user_id is null;
-- All counts should be 0.

-- Step 3: Apply RLS (copy from supabase/schema.sql v7.0 section)
```

### If You Skip This Step
Any rows with `user_id = null` will silently become inaccessible after RLS is enabled. The app continues to work because reads come from localStorage — but those Supabase rows become orphaned. You can reclaim them later from the Supabase SQL editor (which runs as service_role and bypasses RLS).

---

## 8. Applying the RLS Migration

The full SQL is in `supabase/schema.sql` under the **v7.0 — Row-Level Security** section.

To apply:
1. Sign in to your Supabase project → SQL Editor
2. Complete the null `user_id` migration above (Step 0–2)
3. Run the v7.0 RLS section from `supabase/schema.sql`
4. Run the verification queries (also in the schema file)

Expected output from verification:
```
tablename       | rowsecurity
----------------|------------
memory_items    | true
projects        | true
project_tasks   | true
content_items   | true
focus_sessions  | true

tablename       | policyname                              | cmd
----------------|----------------------------------------|-----
content_items   | content_items: users own their rows    | ALL
focus_sessions  | focus_sessions: users own their rows   | ALL
memory_items    | memory_items: users own their rows     | ALL
project_tasks   | project_tasks: users own their rows    | ALL
projects        | projects: users own their rows         | ALL
```

---

## 9. Testing Checklist

### Before Enabling RLS
- [ ] Signed in to the app via magic link (settings → Identity & Auth)
- [ ] Confirmed `auth.uid()` returns a non-null UUID in Supabase SQL editor
- [ ] Ran null user_id migration — all 5 counts = 0
- [ ] Verified app still syncs correctly to Supabase (check Sync Health in settings)

### After Enabling RLS
- [ ] App still loads and reads data from localStorage (unchanged)
- [ ] New memory items saved from `/memory` appear in Supabase `memory_items` with correct `user_id`
- [ ] New projects saved from `/projects` appear in Supabase `projects` with correct `user_id`
- [ ] Supabase SQL editor query `select * from memory_items` (as authenticated user) returns only own rows
- [ ] Supabase SQL editor query with `set role anon` shows zero rows (RLS blocks anon reads)
- [ ] Migration Assistant in settings still works (uses service_role via server-side route handler)
- [ ] Read Mode toggle (settings → Read Mode) returns correct data when Supabase read is enabled
- [ ] Vector memory search still returns correct results

### Multi-User Test (when second user exists)
- [ ] User A's rows are not visible when logged in as User B
- [ ] User B cannot delete User A's rows
- [ ] Users can still operate independently without seeing each other's data

---

## 10. Future RLS Extensions

| Version | Change |
|---|---|
| v7.1 | Add `profiles` table RLS (`user_id = auth.uid()`) |
| v7.2 | Add `workspace_id` scoping to policies (workspace isolation) |
| v7.3 | Add RLS for `planner_entries`, `habits`, `habit_logs` when sync is added |
| v7.5 | Shared workspace read policy: `user_id = auth.uid() OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE member_id = auth.uid())` |

---

_RLS Security Plan — Sovereign OS v7.0 · Created 2026-06-19_
