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
-- Notes for v4.1 migration
-- ============================================================
-- When ready to add RLS:
--   alter table projects enable row level security;
--   create policy "users see own rows" on projects
--     for all using (auth.uid() = user_id);
-- (repeat for each table)
--
-- When migrating from localStorage:
--   Use the /api/migrate route (to be built in v4.1) to POST
--   existing localStorage dumps and upsert into these tables.
-- ============================================================
