-- ============================================================
-- Sovereign OS — Supabase Schema
-- Version: v4.0 (Foundation)
--
-- Run this file against your Supabase project to create tables.
-- Tables are designed to mirror the existing localStorage structure
-- so migration from local data is straightforward.
--
-- v4.0: Tables only — no auth, no RLS, no sync logic yet.
-- v4.1: Add sync writes (localStorage → Supabase on save).
-- v4.2: Add Supabase Auth (user_id populated).
-- v4.3: Add RLS policies.
-- v4.4: Reads shift to Supabase; localStorage becomes write-through cache.
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── profiles ──────────────────────────────────────────────────────────────
-- One row per user (populated when auth is wired up in v4.2).

create table if not exists profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique,                        -- null until auth; fk to auth.users
  email       text,
  display_name text,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── projects ───────────────────────────────────────────────────────────────

create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid,                               -- fk to profiles.user_id (nullable for now)
  title       text not null,
  status      text not null default 'Active'      check (status in ('Idea','Active','Paused','Shipped','Archived')),
  category    text not null default 'Other',
  priority    text not null default 'Medium'      check (priority in ('Low','Medium','High','Critical')),
  description text not null default '',
  objective   text not null default '',
  next_action text not null default '',
  due_date    text not null default '',           -- YYYY-MM-DD string (mirrors localStorage format)
  notes       text not null default '',
  links       jsonb not null default '[]',        -- string[]
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── project_tasks ──────────────────────────────────────────────────────────

create table if not exists project_tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid,
  project_id  uuid references projects(id) on delete cascade,
  title       text not null,
  status      text not null default 'Todo'        check (status in ('Todo','In Progress','Done')),
  priority    text not null default 'Medium'      check (priority in ('Low','Medium','High','Critical')),
  due_date    text not null default '',
  notes       text not null default '',
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── memory_items ───────────────────────────────────────────────────────────

create table if not exists memory_items (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid,
  title               text not null,
  content             text not null default '',
  type                text not null default 'Note' check (type in ('Note','Person','Project Context','Meeting','Decision','Idea','Resource','Client','Content')),
  importance          text not null default 'Medium' check (importance in ('Low','Medium','High','Critical')),
  source              text not null default 'Manual' check (source in ('Manual','AI','Project','Imported')),
  tags                jsonb not null default '[]',        -- string[]
  related_project_ids jsonb not null default '[]',        -- uuid[]
  related_people      jsonb not null default '[]',        -- string[]
  metadata            jsonb not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── content_items ──────────────────────────────────────────────────────────

create table if not exists content_items (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid,
  title              text not null,
  status             text not null default 'Idea'  check (status in ('Idea','Drafting','Ready','Published','Archived')),
  priority           text not null default 'Medium' check (priority in ('Low','Medium','High','Critical')),
  format             text not null default 'Other',
  platforms          jsonb not null default '[]',        -- string[]
  description        text not null default '',
  notes              text not null default '',
  related_project_id uuid references projects(id) on delete set null,
  publish_date       text not null default '',           -- YYYY-MM-DD
  metadata           jsonb not null default '{}',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ── focus_sessions ─────────────────────────────────────────────────────────

create table if not exists focus_sessions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid,
  title              text not null,
  source_type        text not null default 'Custom' check (source_type in ('Project','Task','Content','Planner','Custom')),
  source_id          text,                              -- optional reference id
  project_id         uuid references projects(id) on delete set null,
  started_at         timestamptz not null,
  ended_at           timestamptz,
  planned_minutes    integer not null default 25,
  actual_minutes     integer,
  status             text not null default 'Active'   check (status in ('Active','Completed','Abandoned')),
  notes              text,
  completed_summary  text,
  blockers           text,
  next_action        text,
  saved_to_memory    boolean not null default false,
  metadata           jsonb not null default '{}',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ── planner_entries ────────────────────────────────────────────────────────
-- Flexible table for daily/weekly/monthly/vision planner items.

create table if not exists planner_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid,
  horizon     text not null check (horizon in ('daily','weekly','monthly','1yr','3yr','5yr','review')),
  period_key  text not null,                            -- e.g. "2026-06-17" for daily, "2026-W25" for weekly
  text        text not null,
  done        boolean not null default false,
  sort_order  integer not null default 0,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── habits ─────────────────────────────────────────────────────────────────

create table if not exists habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid,
  name        text not null,
  icon        text not null default '✦',
  sort_order  integer not null default 0,
  archived    boolean not null default false,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── habit_logs ─────────────────────────────────────────────────────────────

create table if not exists habit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid,
  habit_id    uuid references habits(id) on delete cascade,
  log_date    text not null,                            -- YYYY-MM-DD
  completed   boolean not null default true,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  -- One log entry per habit per day
  unique (habit_id, log_date)
);

-- ============================================================
-- Indexes for common query patterns
-- ============================================================

create index if not exists idx_projects_user_id         on projects(user_id);
create index if not exists idx_projects_status           on projects(status);
create index if not exists idx_project_tasks_project_id  on project_tasks(project_id);
create index if not exists idx_project_tasks_user_id     on project_tasks(user_id);
create index if not exists idx_memory_items_user_id      on memory_items(user_id);
create index if not exists idx_memory_items_importance   on memory_items(importance);
create index if not exists idx_content_items_user_id     on content_items(user_id);
create index if not exists idx_content_items_status      on content_items(status);
create index if not exists idx_focus_sessions_user_id    on focus_sessions(user_id);
create index if not exists idx_focus_sessions_status     on focus_sessions(status);
create index if not exists idx_planner_entries_user_id   on planner_entries(user_id);
create index if not exists idx_planner_entries_horizon   on planner_entries(horizon, period_key);
create index if not exists idx_habits_user_id            on habits(user_id);
create index if not exists idx_habit_logs_habit_id       on habit_logs(habit_id);
create index if not exists idx_habit_logs_date           on habit_logs(log_date);

-- ============================================================
-- updated_at auto-update trigger
-- ============================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ declare
  t text;
begin
  foreach t in array array[
    'profiles','projects','project_tasks','memory_items',
    'content_items','focus_sessions','planner_entries','habits','habit_logs'
  ] loop
    execute format(
      'create trigger trg_%s_updated_at before update on %s for each row execute function set_updated_at()',
      t, t
    );
  end loop;
exception when duplicate_object then null;
end $$;

-- ============================================================
-- v5.6 — Vector Memory Migration (OPTIONAL — run separately)
-- ============================================================
-- This migration adds semantic embedding support to memory_items.
-- DO NOT run this as part of the base schema setup.
-- Run ONLY after confirming pgvector is available in your Supabase project.
--
-- Prerequisites:
--   1. Your Supabase project must have the pgvector extension available.
--      (All Supabase projects include pgvector — verify in Database > Extensions)
--   2. Enable the extension: uncomment and run the CREATE EXTENSION line below.
--   3. Apply the ALTER TABLE and function/index below.
--   4. Set OPENAI_API_KEY in your Vercel environment to enable embedding generation.
--   5. Use the "Generate embedding" button on individual memory items to index them.
--      (Auto-bulk-embedding is intentionally deferred to v5.7+)
--
-- After applying this migration, the vector search path in
-- lib/vector/semanticMemory.ts will activate automatically.
--
-- ── Step 1: Enable pgvector ──────────────────────────────────────────────
--
-- create extension if not exists vector;
--
-- ── Step 2: Add embedding columns to memory_items ────────────────────────
--
-- alter table memory_items
--   add column if not exists embedding        vector(1536),   -- OpenAI text-embedding-3-small
--   add column if not exists embedding_model  text,           -- e.g. "text-embedding-3-small"
--   add column if not exists embedded_at      timestamptz;    -- when embedding was generated
--
-- ── Step 3: Add IVFFlat index for cosine similarity search ───────────────
-- Run AFTER a meaningful number of rows have embeddings (typically 100+).
-- Index must be created manually — CONCURRENTLY won't work in a transaction.
--
-- create index if not exists idx_memory_items_embedding
--   on memory_items
--   using ivfflat (embedding vector_cosine_ops)
--   with (lists = 100);
--
-- ── Step 4: Create match_memories RPC function ────────────────────────────
-- This function is called by lib/vector/semanticMemory.ts when vector search
-- is active. Adjust match_threshold and match_count as needed.
--
-- create or replace function match_memories(
--   query_embedding vector(1536),
--   match_threshold float  default 0.7,
--   match_count     int    default 10
-- )
-- returns table (
--   id         uuid,
--   title      text,
--   similarity float
-- )
-- language sql stable
-- as $$
--   select
--     id,
--     title,
--     1 - (embedding <=> query_embedding) as similarity
--   from memory_items
--   where embedding is not null
--     and 1 - (embedding <=> query_embedding) > match_threshold
--   order by similarity desc
--   limit match_count;
-- $$;
--
-- After applying, flip VECTOR_DB_READY = true in lib/vector/semanticMemory.ts
-- and set vectorDbReady = true in app/api/vector/status/route.ts.
-- See docs/VECTOR_MEMORY_PLAN.md for the full activation checklist.
-- ============================================================

-- ============================================================
-- v7.0 — Row-Level Security (RLS) Policies
-- ============================================================
--
-- OVERVIEW
-- --------
-- RLS ensures each authenticated user can only read and write
-- their own rows. Without RLS, any authenticated user can query
-- any other user's data via the Supabase anon key.
--
-- IMPORTANT: This migration is REQUIRED before sharing the app
-- with any external users. Run it once RLS is ready to activate.
--
-- TABLES COVERED (5 synced modules):
--   memory_items, projects, project_tasks, content_items, focus_sessions
--
-- TABLES NOT COVERED (local-only modules):
--   planner_entries, habits, habit_logs
--   These tables are not yet synced. Add RLS when sync is added.
--
-- ANONYMOUS / LOCAL MODE
-- ----------------------
-- The app works 100% in localStorage-only mode without Supabase.
-- When Supabase is configured but the user is NOT signed in,
-- writes use user_id = null. Once RLS is active, those null-user_id
-- rows will NOT be readable by anyone — this is intentional and safe
-- for the local-first architecture (reads come from localStorage).
--
-- NULL USER_ID MIGRATION WARNING
-- --------------------------------
-- If you have existing rows with user_id = null (written before auth
-- was set up), those rows become inaccessible once RLS is active.
-- Run the UPDATE statements below BEFORE enabling RLS to assign
-- those rows to the correct user.
--
-- Step 0: Find your user UUID (run as authenticated user):
--   select auth.uid();
--
-- Step 1: Assign orphaned rows to your user (replace <YOUR-UUID>):
--   update memory_items    set user_id = '<YOUR-UUID>' where user_id is null;
--   update projects        set user_id = '<YOUR-UUID>' where user_id is null;
--   update project_tasks   set user_id = '<YOUR-UUID>' where user_id is null;
--   update content_items   set user_id = '<YOUR-UUID>' where user_id is null;
--   update focus_sessions  set user_id = '<YOUR-UUID>' where user_id is null;
--
-- Step 2: Verify no null rows remain:
--   select count(*) from memory_items   where user_id is null;
--   select count(*) from projects       where user_id is null;
--   select count(*) from project_tasks  where user_id is null;
--   select count(*) from content_items  where user_id is null;
--   select count(*) from focus_sessions where user_id is null;
--
-- Step 3: Apply RLS (run the statements below).
--
-- POLICY DESIGN
-- -------------
-- One "for all" policy per table: read + insert + update + delete
-- all require auth.uid() = user_id.
-- The "with check" clause on inserts/updates prevents a user from
-- writing a row with a different user_id than their own.
--
-- No anonymous read policy is created. Rows with user_id = null
-- are inaccessible once RLS is active (SQL NULL comparison = NULL,
-- which is falsy). This is the correct security posture.
--
-- SERVICE ROLE: The Supabase service_role key bypasses RLS by
-- default. Do NOT expose service_role to the browser. It is safe
-- to use in server-side route handlers that need admin access.
-- ============================================================

-- ── memory_items ─────────────────────────────────────────────────────────

alter table memory_items enable row level security;

create policy "memory_items: users own their rows"
  on memory_items
  for all
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── projects ──────────────────────────────────────────────────────────────

alter table projects enable row level security;

create policy "projects: users own their rows"
  on projects
  for all
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── project_tasks ─────────────────────────────────────────────────────────
-- Note: project_tasks.project_id references projects(id).
-- Because projects has RLS, a task whose project is not owned by the
-- current user will also be invisible (the JOIN fails the projects policy).
-- The task-level policy adds defense-in-depth.

alter table project_tasks enable row level security;

create policy "project_tasks: users own their rows"
  on project_tasks
  for all
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── content_items ─────────────────────────────────────────────────────────

alter table content_items enable row level security;

create policy "content_items: users own their rows"
  on content_items
  for all
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── focus_sessions ────────────────────────────────────────────────────────

alter table focus_sessions enable row level security;

create policy "focus_sessions: users own their rows"
  on focus_sessions
  for all
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── OPTIONAL: temporary dev/migration bypass (DISABLED BY DEFAULT) ────────
-- If you need to inspect or fix all rows as a superuser during migration,
-- use the Supabase SQL editor (which runs as service_role, bypassing RLS).
-- Do NOT create a permissive anonymous policy in production.
--
-- -- NEVER enable this in production:
-- create policy "TEMP: allow all for migration"
--   on memory_items for all using (true) with check (true);
-- ── (disabled — do not uncomment without understanding the security impact) ─

-- ============================================================
-- v7.0 — Verification Queries
-- Run these after applying RLS to confirm policies are in place.
-- ============================================================
--
-- select tablename, rowsecurity
-- from pg_tables
-- where schemaname = 'public'
--   and tablename in ('memory_items','projects','project_tasks','content_items','focus_sessions');
--
-- select tablename, policyname, cmd, qual
-- from pg_policies
-- where schemaname = 'public'
-- order by tablename;
--
-- Expected: rowsecurity = true for each covered table.
-- Expected: 5 policies, one per table, cmd = 'ALL'.
-- ============================================================
