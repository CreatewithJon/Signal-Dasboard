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
  created_at:       string; // ISO
  updated_at:       string; // ISO
}
