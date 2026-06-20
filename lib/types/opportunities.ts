// ── Opportunity types — Sovereign OS v5.1 ─────────────────────────────────

export type OpportunityType =
  | "Partnership"
  | "Content"
  | "Client"
  | "Product"
  | "Event"
  | "Education"
  | "Revenue"
  | "Personal";

export type OpportunityStatus =
  | "Detected"   // auto-surfaced by Chief of Staff engine
  | "Reviewing"  // user has opened and is evaluating
  | "Active"     // being actively pursued
  | "Converted"  // converted to project / content / task / memory
  | "Archived";  // dismissed

export type OpportunityConversionTarget =
  | "Project"
  | "ContentItem"
  | "Task"
  | "Memory";

export interface OpportunityConversion {
  target:     OpportunityConversionTarget;
  target_id:  string;
  converted_at: string; // ISO
}

export interface Opportunity {
  id:               string;
  title:            string;
  description:      string;         // angle / core insight
  type:             OpportunityType;
  status:           OpportunityStatus;
  score:            number;         // 0–100
  score_reasoning:  string;         // why this score
  suggested_action: string;         // recommended next step
  related_people:   string[];       // names
  related_project_ids: string[];
  related_memory_ids:  string[];
  source:           "detected" | "manual"; // detected = from Chief engine, manual = user-created
  conversion:       OpportunityConversion | null;
  notes:            string;
  workspace_id?:    string;         // v7.4 — undefined = Personal (backwards-compatible)
  // v7.7 — Revenue Intelligence fields (optional, backwards-compatible)
  estimated_value?:     number;     // estimated deal/contract value in dollars
  close_probability?:   number;     // 0.0–1.0 (e.g. 0.4 = 40%). Default: 0.25
  expected_close_date?: string;     // "YYYY-MM-DD" — when the deal is expected to close
  created_at:       string; // ISO
  updated_at:       string; // ISO
}
