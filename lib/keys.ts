/**
 * Sovereign OS — localStorage key registry
 *
 * All keys in one place so they never drift between components.
 * The OLD_KEYS list drives the one-time migration from the Signal Dashboard
 * namespace ("signal_*") to the Sovereign OS namespace ("sovereign_*").
 *
 * Rules:
 *  - Always import from this file, never hardcode strings in components.
 *  - If you add a new feature that needs persistence, add the key here first.
 *  - Never remove or rename an entry in OLD_KEYS — that list must cover every
 *    key that could exist in a user's browser from the old Signal Dashboard.
 */

// ── New sovereign_* keys ──────────────────────────────────────────────────

export const KEYS = {
  // Command Center panels
  AI_MESSAGES:       "sovereign_ai_messages",
  TASKS:             "sovereign_tasks",
  NOTE:              "sovereign_note",
  SESSIONS:          "sovereign_sessions",
  STREAK:            "sovereign_streak",
  BTC_STACK:         "sovereign_btc_stack",
  HABITS:            "sovereign_habits",
  HABIT_LOG:         "sovereign_habit_log",

  // Planner
  PLANNER_DAILY:     "sovereign_planner_daily",
  PLANNER_WEEKLY:    "sovereign_planner_weekly",
  PLANNER_MONTHLY:   "sovereign_planner_monthly",
  PLANNER_1YR:       "sovereign_planner_1yr",
  PLANNER_3YR:       "sovereign_planner_3yr",
  PLANNER_5YR:       "sovereign_planner_5yr",
  PLANNER_REVIEW:    "sovereign_planner_review",

  // Content
  TELEPROMPTER:      "sovereign_teleprompter_script",
  CONTENT_IDEAS:     "sovereign_content_ideas",
  BRAND_ROADMAP:     "sovereign_brand_roadmap_v1",

  // Brand / Projects / Memory
  NARRATIVES:        "sovereign_narratives",
  PROJECTS:          "sovereign_projects",
  PROJECT_TASKS:     "sovereign_project_tasks",
  MEMORY_ITEMS:      "sovereign_memory_items",

  // Migration sentinel — presence means migration has run
  MIGRATION_V1:      "sovereign_migration_v1_complete",
} as const;

// ── Migration map: old key → new key ─────────────────────────────────────
// Every signal_* key that ever existed in the app, mapped to its replacement.

export const MIGRATION_MAP: Record<string, string> = {
  "signal_ai_messages":        KEYS.AI_MESSAGES,
  "signal_tasks":              KEYS.TASKS,
  "signal_note":               KEYS.NOTE,
  "signal_sessions":           KEYS.SESSIONS,
  "signal_streak":             KEYS.STREAK,
  "signal_btc_stack":          KEYS.BTC_STACK,
  "signal_habits":             KEYS.HABITS,
  "signal_habit_log":          KEYS.HABIT_LOG,
  "signal_planner_daily":      KEYS.PLANNER_DAILY,
  "signal_planner_weekly":     KEYS.PLANNER_WEEKLY,
  "signal_planner_monthly":    KEYS.PLANNER_MONTHLY,
  "signal_planner_1yr":        KEYS.PLANNER_1YR,
  "signal_planner_3yr":        KEYS.PLANNER_3YR,
  "signal_planner_5yr":        KEYS.PLANNER_5YR,
  "signal_planner_review":     KEYS.PLANNER_REVIEW,
  "signal_teleprompter_script": KEYS.TELEPROMPTER,
  "signal_content_ideas":      KEYS.CONTENT_IDEAS,
  "signal_brand_roadmap_v1":   KEYS.BRAND_ROADMAP,
  "signal_narratives":         KEYS.NARRATIVES,
  "signal_projects":           KEYS.PROJECTS,
};
