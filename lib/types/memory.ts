export type MemoryType =
  | "Note"
  | "Person"
  | "Project Context"
  | "Meeting"
  | "Decision"
  | "Idea"
  | "Resource"
  | "Client"
  | "Content";

export type MemoryImportance = "Low" | "Medium" | "High" | "Critical";

export type MemorySource = "Manual" | "AI" | "Project" | "Imported";

export interface MemoryItem {
  id: string;
  title: string;
  content: string;
  type: MemoryType;
  tags: string[];
  relatedProjectIds: string[];
  relatedPeople: string[];
  importance: MemoryImportance;
  source: MemorySource;
  createdAt: string;
  updatedAt: string;
}
