export type ContentStatus = "Idea" | "Drafting" | "Ready" | "Published" | "Archived";

export type ContentPlatform =
  | "YouTube"
  | "Instagram"
  | "LinkedIn"
  | "Blog"
  | "Podcast"
  | "Newsletter"
  | "Crypto Mondays"
  | "DWT";

export type ContentPriority = "Low" | "Medium" | "High" | "Critical";

export type ContentFormat =
  | "Video"
  | "Short"
  | "Post"
  | "Article"
  | "Email"
  | "Script"
  | "Thread"
  | "Reel"
  | "Episode"
  | "Other";

export interface ContentItem {
  id: string;
  title: string;
  status: ContentStatus;
  platforms: ContentPlatform[];
  priority: ContentPriority;
  format: ContentFormat;
  description: string;        // hook / angle / core idea
  notes: string;              // draft content, research, outline
  related_project_id: string; // "" = none
  publish_date: string;       // "YYYY-MM-DD" or ""
  workspace_id?: string;      // v7.4 — undefined = Personal (backwards-compatible)
  created_at: string;         // ISO
  updated_at: string;         // ISO
}
