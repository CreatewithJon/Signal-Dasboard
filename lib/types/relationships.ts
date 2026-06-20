// ── Relationship types — Sovereign OS v5.2 ────────────────────────────────

export type RelationshipType =
  | "Founder"
  | "Client"
  | "Prospect"
  | "Partner"
  | "Mentor"
  | "Educator"
  | "Community"
  | "Other";

export type RelationshipStatus =
  | "Active"
  | "Follow Up"
  | "Dormant"
  | "Archived";

export type RelationshipPriority = "Low" | "Medium" | "High" | "Critical";

export interface Person {
  id:                       string;
  name:                     string;
  role:                     string;         // job title / what they do
  organization:             string;
  email:                    string;
  phone:                    string;
  relationship_type:        RelationshipType;
  status:                   RelationshipStatus;
  priority:                 RelationshipPriority;
  notes:                    string;
  tags:                     string[];
  related_project_ids:      string[];
  related_opportunity_ids:  string[];
  related_memory_ids:       string[];
  last_contacted_at:        string;        // ISO or ""
  next_follow_up_at:        string;        // ISO date "YYYY-MM-DD" or ""
  workspace_id?:            string;        // v7.4 — undefined = Personal (backwards-compatible)
  created_at:               string;        // ISO
  updated_at:               string;        // ISO
}
