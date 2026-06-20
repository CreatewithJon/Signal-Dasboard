/**
 * lib/types/feedback.ts
 *
 * Feedback Engine types — Sovereign OS v8.1
 *
 * Captures friction, bugs, ideas, requests, and insights discovered
 * during real-world usage and beta testing.
 */

export type FeedbackType =
  | "Bug"
  | "Feature"
  | "UX"
  | "Performance"
  | "Workflow"
  | "Insight";

export type FeedbackStatus =
  | "New"
  | "Reviewing"
  | "Planned"
  | "In Progress"
  | "Completed"
  | "Rejected";

export type FeedbackPriority = "Critical" | "High" | "Medium" | "Low";

export type FeedbackSource = "Self" | "Beta User" | "Client" | "Team";

export type FeedbackConversionTarget = "project" | "task" | "opportunity" | "memory";

export interface FeedbackConversion {
  target:       FeedbackConversionTarget;
  target_id:    string;
  converted_at: string; // ISO
}

export interface FeedbackItem {
  id:                  string;
  title:               string;
  description:         string;
  type:                FeedbackType;
  status:              FeedbackStatus;
  priority:            FeedbackPriority;
  source:              FeedbackSource;
  workspace_id?:       string;   // null = personal
  related_project_id?: string;
  conversion?:         FeedbackConversion;
  created_at:          string;   // ISO
  updated_at:          string;   // ISO
}
