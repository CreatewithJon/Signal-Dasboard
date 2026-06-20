# FEEDBACK_ENGINE_PLAN.md — Sovereign OS v8.1

_Created: 2026-06-19_

---

## Overview

The Feedback Engine is a structured system for capturing, tracking, and acting on friction, bugs, ideas, requests, and insights discovered during real-world usage and beta testing.

This is not just a bug tracker. It is an operational input layer that feeds directly into Projects, Tasks, Opportunities, and Memory — closing the loop between what users experience and what gets built.

---

## Data Model

### FeedbackItem

```typescript
interface FeedbackItem {
  id:                  string;
  title:               string;
  description:         string;
  type:                FeedbackType;      // Bug | Feature | UX | Performance | Workflow | Insight
  status:              FeedbackStatus;    // New | Reviewing | Planned | In Progress | Completed | Rejected
  priority:            FeedbackPriority;  // Critical | High | Medium | Low
  source:              FeedbackSource;    // Self | Beta User | Client | Team
  workspace_id?:       string;
  related_project_id?: string;
  conversion?:         FeedbackConversion;
  created_at:          string;
  updated_at:          string;
}
```

### FeedbackConversion

When feedback is converted to a project, task, or memory, the conversion is recorded:

```typescript
interface FeedbackConversion {
  target:       "project" | "task" | "opportunity" | "memory";
  target_id:    string;
  converted_at: string;
}
```

---

## Architecture

### Storage

All feedback stored at `sovereign_feedback` in localStorage.

### Pure Store Pattern

`lib/feedback/store.ts` follows the same CRUD pattern as all stores in Sovereign OS:

- `loadFeedback()` — reads from localStorage
- `createFeedback()` — creates with auto-id, timestamps, workspace awareness
- `updateFeedback()` — patches with updated_at
- `deleteFeedback()` — removes by id
- `setFeedbackStatus()` — convenience status update
- `markFeedbackConverted()` — sets status to Completed and records conversion target

---

## Files

### New Files (v8.1)

| File | Purpose |
|---|---|
| `lib/types/feedback.ts` | FeedbackItem type definitions |
| `lib/feedback/store.ts` | CRUD store |
| `app/feedback/page.tsx` | Feedback Engine page (6 sections) |
| `app/api/feedback-chat/route.ts` | AI analysis endpoint |
| `components/FeedbackCard.tsx` | Operating zone homepage card |
| `docs/FEEDBACK_ENGINE_PLAN.md` | This document |

### Modified Files (v8.1)

| File | Change |
|---|---|
| `lib/keys.ts` | Added `FEEDBACK: "sovereign_feedback"` |
| `components/ChiefOfStaffCard.tsx` | Added Feedback Signal section |
| `components/DashboardShell.tsx` | Added FeedbackCard to Operating zone |
| `components/Sidebar.tsx` | Added `/feedback` to SYSTEM_NAV |

---

## Feedback Page Sections

### Section 1 — Summary Stats
- 4 stat cards: Open Issues, Critical, Open Bugs, Feature Requests
- Live counts, color-coded by severity

### Section 2 — New & Active Issues
- All items with status New or Reviewing
- Sorted by priority (Critical first)
- Expandable rows with full description, status controls, conversion actions

### Section 3 — Planned & In Progress
- Items in execution pipeline
- Same expandable row UI

### Section 4 — Insights
- All items of type Insight regardless of status
- Separate section for signal-type captures

### Section 5 — Completed & Rejected
- Historical record
- Collapsed by default when empty

### Section 6 — AI Analysis
- AI assistant powered by `feedback-chat` endpoint
- Summarizes patterns, recurring themes, priority issues
- Suggests next actions based on backlog state
- Context: top 30 items passed as structured list

---

## Conversions

From any feedback item (expanded view):

| Button | Target | Effect |
|---|---|---|
| → Project | project | Sets status Completed, records conversion.target = "project" |
| → Task | task | Sets status Completed, records conversion.target = "task" |
| → Memory | memory | Sets status Completed, records conversion.target = "memory" |

Target IDs are recorded for traceability. Deep linking to the created object is a future enhancement.

---

## Filters

| Filter | Options |
|---|---|
| Type | All / Bug / Feature / UX / Performance / Workflow / Insight |
| Priority | All / Critical / High / Medium / Low |
| Workspace | All / per workspace |

---

## Chief of Staff Integration

`ChiefOfStaffCard.tsx` now includes a **Feedback Signal** section at the bottom:

- Open issue count + critical count
- Top 2 highest-priority open items (type + title)
- "View all →" link to `/feedback`
- Only shown when open feedback exists

---

## Homepage Integration

`FeedbackCard` is placed in the Operating zone alongside Projects, Content, Relationships, and Memory.

Displays:
- Open count + critical count
- Top priority item
- Latest insight
- "View all →" link to `/feedback`
- "+ Add" quick link

---

## AI Analysis Endpoint

`/api/feedback-chat` — POST endpoint for the on-page AI assistant.

System prompt: product intelligence analyst reviewing a feedback backlog.

Context passed: structured list of top 30 items with type, priority, status, title, and description.

Designed to surface:
- Recurring patterns
- High-leverage next actions
- Issues blocking core use cases

---

## Future Enhancements

- Deep links from conversion records to created project/task
- Supabase sync for multi-device feedback capture
- Beta user submission form (public URL, stores to same table)
- Weekly feedback digest in Chief of Staff brief
- Frequency scoring (same issue reported 3x = auto-escalate to Critical)
- Bulk status update

---

_Sovereign OS — Feedback Engine v8.1_
