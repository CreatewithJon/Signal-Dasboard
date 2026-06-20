# WORKSPACE_PLAN.md — Sovereign OS v6.7

> Architecture document for the multi-workspace model. This covers the foundation schema, activation phases, and data isolation strategy.

_Created: 2026-06-19_

---

## 1. What Is a Workspace?

A **Workspace** is a named context that groups data and activity around a specific purpose.

The five workspaces planned for Sovereign OS:

| Workspace            | Type      | Purpose |
|---|---|---|
| Personal             | Personal  | Default — personal goals, habits, focus, memory |
| Agentic Systems      | Company   | AI services business — projects, clients, content |
| Digital Wealth Transfer | Company | DWT marketplace and brand — content, leads, relationships |
| Crypto Mondays       | Community | Las Vegas Bitcoin community chapter — events, contacts, content |
| Client Workspaces    | Client    | Per-client work — proposals, projects, follow-ups |

---

## 2. Current State (v6.7 — Foundation)

### What Exists
- `lib/types/workspace.ts` — `Workspace` schema, `WorkspaceType`, `DEFAULT_WORKSPACE`, `WORKSPACE_COLORS`
- `lib/keys.ts` — `KEYS.WORKSPACES` (`sovereign_workspaces`), `KEYS.ACTIVE_WORKSPACE_ID` (`sovereign_active_workspace_id`)
- `components/WorkspaceSwitcher.tsx` — sidebar switcher: shows active workspace name + color; dropdown to switch when multiple exist
- `components/settings/WorkspaceSettings.tsx` — create / edit / archive workspaces in /settings
- `/settings` — Workspaces section added at top

### What Does NOT Exist Yet
- Data filtering — projects, tasks, content, memory, opportunities, relationships are NOT scoped per workspace
- `workspace_id` on existing data schemas — schemas are unchanged; no migration required
- Supabase workspace table — no cloud-side schema yet
- Permission model — no access control
- Workspace-level AI context — AI panels do not know which workspace they're operating in

---

## 3. Workspace Schema

```typescript
interface Workspace {
  id:          string;        // "personal" for default, "ws-{timestamp}" for created
  name:        string;        // Display name: "Agentic Systems"
  type:        WorkspaceType; // Personal | Company | Project | Client | Community | Education
  description: string;
  color:       string;        // Hex accent: "#8b5cf6"
  archived:    boolean;
  created_at:  string;        // ISO timestamp
  updated_at:  string;
}
```

### localStorage Keys
- `sovereign_workspaces` — `Workspace[]` — all workspaces including archived
- `sovereign_active_workspace_id` — `string` — id of currently displayed workspace

### Personal Default
The Personal workspace (`id: "personal"`) is auto-created if `sovereign_workspaces` is empty. It cannot be archived.

---

## 4. Activation Phases

### Phase v6.7 — Foundation (Current)
- Schema defined
- CRUD in settings
- Switcher in sidebar
- No data filtering

### Phase v7.0 — Workspace Tags (Planned)
- Add `workspace_id?: string` to new objects created when a non-Personal workspace is active
- Existing data retains `workspace_id: undefined` (treated as Personal)
- No forced migration of existing data
- Filter badges on list views: "All / [Workspace Name]"

### Phase v7.1 — Workspace Filter UI (Planned)
- Module-level filter by workspace on: Projects, Content, Opportunities, Relationships, Memory
- Header filter pill: `[Personal ▾]` → select workspace → content updates
- Engines (Chief, Strategy, Actions) respect active workspace filter
- Daily Rhythm scoped per workspace

### Phase v7.2 — Workspace Intelligence (Planned)
- Chief of Staff brief per workspace: "Agentic Systems brief" vs "DWT brief"
- /daily → workspace-aware morning brief
- Cross-workspace summary available on homepage

### Phase v7.3 — Cloud Workspace Sync (Planned)
- Supabase `workspaces` table
- `workspace_id` column on all synced tables
- RLS: users can only read/write their own workspace data
- Workspace sharing (read-only access to collaborators) — future

---

## 5. Data Safety Contract

- **No existing data is migrated or modified in v6.7.**
- All existing `sovereign_*` keys remain untouched.
- Existing data has no `workspace_id` — it will be interpreted as "Personal" when filtering activates.
- The Personal workspace cannot be archived.
- Adding or removing workspaces in settings has zero effect on any stored data.

---

## 6. Why These Five Workspaces?

| Workspace            | Revenue / Purpose |
|---|---|
| Personal             | Foundation — daily operating rhythm, learning, health, growth |
| Agentic Systems      | Primary cash flow — AI implementation services ($500–$1,500+ per client) |
| Digital Wealth Transfer | Authority + marketplace — content pipeline, directory, leads |
| Crypto Mondays LV    | Community ops — event coordination, chapter growth, relationships |
| Client Workspaces    | Delivery — per-client context isolation, project tracking |

---

_Architecture: Sovereign OS · Last updated: 2026-06-19_
