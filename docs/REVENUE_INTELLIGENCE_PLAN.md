# REVENUE_INTELLIGENCE_PLAN.md — Sovereign OS v7.7

_Created: 2026-06-20_

---

## Overview

Revenue Intelligence is an executive layer that answers the four questions every operator should be able to answer at a glance:

1. **Where is money likely to come from?** — pipeline by workspace, probability-weighted forecasts
2. **Which workspace is ahead or behind target?** — per-workspace goal tracking and gaps
3. **What revenue risks exist?** — overdue high-value deals, stalled projects, dormant relationships
4. **What should be prioritized to increase revenue?** — concrete, actionable suggestions

This is an intelligence layer, not accounting software. It does not replace a CRM. It helps you see what matters and act on it.

---

## Architecture

### Pure Engine Pattern

`lib/revenue/engine.ts` follows the same pure-function contract as all engines in Sovereign OS:

- Accepts a fully pre-loaded `RevenueEngineInput` object
- Returns a deterministic `RevenueSnapshot`
- Zero side effects, zero localStorage access, zero async
- Caller handles all data loading and settings resolution

### Revenue Calculation

```
Pipeline Value  = sum(estimated_value) for active opportunities
Expected Revenue = sum(estimated_value × close_probability) for active opportunities
Closed Revenue  = sum(estimated_value) for Converted opportunities
Revenue Gap     = monthly_goal - total_expected_revenue
```

**Default close probability**: 0.25 (25%) — applied to opportunities with no `close_probability` set.

**Active opportunity statuses**: Detected, Reviewing, Active

### Opportunity Revenue Fields (v7.7 Extensions)

Three optional fields added to `Opportunity` type (backwards-compatible):

| Field | Type | Default | Purpose |
|---|---|---|---|
| `estimated_value?` | number | 0 | Deal/contract value in USD |
| `close_probability?` | number (0–1) | settings default | Likelihood of closing |
| `expected_close_date?` | string (YYYY-MM-DD) | — | When the deal is expected to close |

These fields are editable in the Opportunity form (Revenue Intelligence section) and visible on the `/revenue` page.

### Workspace Revenue

For each workspace:

| Field | Computation |
|---|---|
| `pipelineValue` | sum of `estimated_value` for active opps |
| `expectedRevenue` | sum of `estimated_value × close_probability` for active opps |
| `closedRevenue` | sum of `estimated_value` for Converted opps |
| `activeOpportunityCount` | count of active opps |
| `overdueOpportunityCount` | count where `expected_close_date < today` |
| `revenueGoal` | `monthlyRevenueGoal / workspace_count` |
| `revenueGap` | `revenueGoal - expectedRevenue` |
| `confidenceScore` | 0–100 composite (see below) |

**Confidence Score** (per workspace):
- +20 per active opp (max 40)
- +10 per attached relationship (max 20)
- +15 per recently-updated opp (last 7 days, max 30)
- -10 per overdue opp (max -30)
- -5 per stalled project (Active, past due date, max -20)

### Revenue Risks

| Severity | Trigger |
|---|---|
| Critical | High-value opp (>$1,000) overdue + no contacts attached |
| Critical | High-value opp overdue + no follow-up scheduled |
| High | Workspace expected < 50% of its revenue goal |
| High | Stalled project (Active, past due) linked to active opp |
| Medium | Opp with close probability < 20% and estimated value > 0 |
| Medium | Dormant relationship linked to active opportunity |

### Revenue Suggestions

Generated from data patterns:

| Trigger | Action |
|---|---|
| Related person with overdue follow-up | "Follow up with [name] on [opp]" |
| Active opp with score ≥ 70 + value set | "Convert [opp] into a proposal" |
| Detected opp with no related people | "Schedule a discovery call for [opp]" |
| Dormant person linked to active opp | "Re-engage [name]" |
| Active opp with value but no close date | "Set an expected close date on [opp]" |

---

## Files

### New Files (v7.7)

| File | Purpose |
|---|---|
| `lib/revenue/engine.ts` | Pure `computeRevenueSnapshot()` engine + helpers |
| `app/revenue/page.tsx` | Revenue Intelligence page (6 sections) |
| `components/RevenueCard.tsx` | Compact Executive zone card for homepage |
| `components/settings/RevenueSettings.tsx` | Revenue defaults settings panel |
| `docs/REVENUE_INTELLIGENCE_PLAN.md` | This document |

### Modified Files (v7.7)

| File | Change |
|---|---|
| `lib/types/opportunities.ts` | Added `estimated_value?`, `close_probability?`, `expected_close_date?` |
| `lib/workspaces/analytics.ts` | Added `pipelineValue` and `expectedRevenue` to `WorkspaceAnalytics` |
| `lib/keys.ts` | Added `REVENUE_SETTINGS` key |
| `app/opportunities/page.tsx` | Revenue fields added to `OppForm` UI |
| `components/DashboardShell.tsx` | `RevenueCard` added to Executive zone |
| `components/ChiefOfStaffCard.tsx` | Revenue Signal section + imports |
| `components/Sidebar.tsx` | `/revenue` added to `SYSTEM_NAV` |
| `app/settings/page.tsx` | Revenue Defaults section added |

---

## Revenue Page Sections

### Section 1 — Executive Revenue Summary
- 4 stat cards: Pipeline, Forecast, Closed, Goal Gap
- Color-coded gap (green = ahead, amber = close, red = behind)
- Highest-value workspace callout

### Section 2 — Revenue by Workspace
- Full table: Pipeline, Forecast, Closed, Active Opps, Overdue, Confidence Score, Goal Gap
- Color-coded confidence bar and gap indicator

### Section 3 — Pipeline Forecast
- Bar visualization: pipeline vs expected revenue per workspace
- Stacked bars (gray = pipeline, green = expected)
- Empty state prompts to add estimated values

### Section 4 — Revenue Risks
- Full sorted risk list (Critical → High → Medium)
- Severity badge, message, category

### Section 5 — Revenue Suggestions
- Up to 8 actionable suggestions sorted by priority
- Priority badge (High/Medium), action, reason

### Section 6 — Goal Tracking
- Goal vs expected progress bar
- Gap calculation with color coding
- Links to Settings to update goal

---

## Chief of Staff Integration

`ChiefOfStaffCard.tsx` now includes a **Revenue Signal** section at the bottom of the card:

- Per-workspace: name, expected revenue, gap indicator
- Total expected revenue across all workspaces
- "Full report →" link to `/revenue`
- Only shown when there are workspaces with pipeline activity

Example display:
```
Revenue Signal
Agentic Systems    $12.0k   +$2.0k
DWT                $2.5k    -$2.5k
Crypto Mondays     $0       -$5.0k
──────────────────────────────────
Total expected     $14.5k
```

---

## Homepage Integration

`RevenueCard` is placed in the Executive zone of the Command Center alongside Chief of Staff, Strategic Planner, Goals, Weekly Review, and System Health.

Displays:
- Forecast (probability-weighted expected revenue)
- Goal gap (ahead/behind target)
- Goal progress bar
- Highest-value workspace
- Top revenue risk
- "Full report →" link to `/revenue`

---

## Workspace Analytics Enhancement

`lib/workspaces/analytics.ts` now computes two additional fields per workspace:

- `pipelineValue`: sum of `estimated_value` for active opportunities
- `expectedRevenue`: sum of `estimated_value × (close_probability ?? 0.25)` for active opps

These are available in all consumers of `WorkspaceAnalytics` (workspace page, chief card, system health, etc.) without any additional computation.

---

## Revenue Settings

Stored at `sovereign_revenue_settings` in localStorage.

| Setting | Default | Purpose |
|---|---|---|
| `defaultCloseProbability` | 0.25 (25%) | Applied to opps without a close probability set |
| `monthlyRevenueGoal` | 5000 | Monthly revenue target for gap calculations |

Accessible in Settings → Revenue Defaults. Configurable with a slider (probability) and number input (goal).

---

## Future Enhancements

- **Per-workspace revenue goals**: Allow setting individual goals per workspace
- **Revenue history**: Track closed revenue over time (monthly charts)
- **CRM sync**: Import/export to HubSpot, Notion, etc.
- **Revenue projections**: 30/60/90-day rolling forecasts
- **Contract value tracking**: Multi-stage deal tracking with milestone values
- **Commission calculator**: Personal revenue share tracking for contractor work

---

_Sovereign OS — Revenue Intelligence v7.7_
