export type FocusSessionStatus = "Active" | "Completed" | "Abandoned";
export type FocusSessionSourceType = "Project" | "Task" | "Content" | "Planner" | "Custom";

export interface FocusSession {
  id: string;
  title: string;
  sourceType: FocusSessionSourceType;
  sourceId?: string;
  projectId?: string;
  startedAt: string;      // ISO timestamp
  endedAt?: string;       // ISO timestamp
  plannedMinutes: number;
  actualMinutes?: number;
  status: FocusSessionStatus;
  notes?: string;
  completedSummary?: string;
  blockers?: string;
  nextAction?: string;
  savedToMemory: boolean;
}
