export type ProjectStatus = "Idea" | "Active" | "Paused" | "Shipped" | "Archived";
export type ProjectCategory =
  | "Personal"
  | "Client"
  | "Agentic Systems"
  | "DWT"
  | "Sovereign OS"
  | "Crypto Mondays"
  | "UNLV"
  | "Other";
export type ProjectPriority = "Low" | "Medium" | "High" | "Critical";
export type TaskStatus = "Todo" | "In Progress" | "Done";

export interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  category: ProjectCategory;
  priority: ProjectPriority;
  description: string;
  objective: string;
  next_action: string;
  due_date: string;      // "YYYY-MM-DD" or ""
  links: string[];       // array of URLs
  notes: string;
  workspace_id?: string; // v7.4 — undefined = Personal (backwards-compatible)
  created_at: string;    // ISO
  updated_at: string;    // ISO
}

export interface ProjectTask {
  id: string;
  project_id: string;
  title: string;
  status: TaskStatus;
  priority: ProjectPriority;
  due_date: string;
  notes: string;
  workspace_id?: string; // v7.4
  created_at: string;
  updated_at: string;
}
