/**
 * lib/goalDecomposition/engine.ts
 *
 * Goal Decomposition Engine — Sovereign OS v6.1
 *
 * Turns each strategic objective into concrete milestones, tasks,
 * content ideas, relationship follow-ups, and opportunities.
 * Pure computation — no AI calls.
 */

import type { StrategicPlan, StrategicObjective } from "@/lib/strategicPlanner/engine";
import type { Project, ProjectTask, ProjectPriority } from "@/lib/types/projects";
import type { ContentItem, ContentFormat, ContentPlatform, ContentPriority } from "@/lib/types/content";
import type { Opportunity, OpportunityType } from "@/lib/types/opportunities";
import type { Person } from "@/lib/types/relationships";
import type { MemoryItem } from "@/lib/types/memory";

// ── Output Types ────────────────────────────────────────────────────────────

export interface GoalMilestone {
  id:          string;
  title:       string;
  description: string;
  timeframe:   "30d" | "60d" | "90d";
}

export interface SuggestedTask {
  id:                 string;
  title:              string;
  priority:           ProjectPriority;
  rationale:          string;
  suggestedProjectId: string;   // "" if no existing project match
  projectTitle:       string;   // display name
}

export interface SuggestedContent {
  id:        string;
  title:     string;
  format:    ContentFormat;
  platforms: ContentPlatform[];
  angle:     string;
  priority:  ContentPriority;
}

export interface SuggestedFollowUp {
  id:           string;
  personId:     string;   // "" if no existing person match
  personName:   string;
  reason:       string;
  action:       string;
  followUpDate: string;   // YYYY-MM-DD (todayStr + 7)
}

export interface SuggestedOpportunity {
  id:              string;
  title:           string;
  type:            OpportunityType;
  description:     string;
  suggestedAction: string;
}

export interface DecomposedGoal {
  objectiveId:             string;
  objectiveTitle:          string;
  objectiveWhy:            string;
  milestones:              GoalMilestone[];
  suggestedTasks:          SuggestedTask[];
  suggestedContent:        SuggestedContent[];
  suggestedFollowUps:      SuggestedFollowUp[];
  suggestedOpportunities:  SuggestedOpportunity[];
  existingRelatedProjects: { id: string; title: string }[];
}

export interface DecompositionResult {
  generatedAt:                 string;
  decomposedGoals:             DecomposedGoal[];
  totalSuggestedTasks:         number;
  totalSuggestedContent:       number;
  totalSuggestedFollowUps:     number;
  totalSuggestedOpportunities: number;
}

// ── Input ───────────────────────────────────────────────────────────────────

export interface DecompositionInput {
  todayStr:      string;
  strategicPlan: StrategicPlan;
  projects:      Project[];
  projectTasks:  ProjectTask[];
  contentItems:  ContentItem[];
  opportunities: Opportunity[];
  people:        Person[];
  memoryItems:   MemoryItem[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function uid(prefix: string, idx: number): string {
  return `${prefix}_${idx}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type Theme =
  | "ai"
  | "bitcoin"
  | "content"
  | "dwt"
  | "education"
  | "revenue"
  | "relationships"
  | "general";

function detectTheme(text: string): Theme {
  const t = text.toLowerCase();
  if (/\b(ai|automation|chatbot|bot|agent|llm|gpt|claude|system|workflow)\b/.test(t)) return "ai";
  if (/\b(bitcoin|btc|crypto|defi|blockchain|web3|lightning|satoshi)\b/.test(t)) return "bitcoin";
  if (/\b(content|youtube|video|brand|audience|channel|social|post|script)\b/.test(t)) return "content";
  if (/\b(dwt|digital wealth|marketplace|directory|listing|platform)\b/.test(t)) return "dwt";
  if (/\b(edu|course|teach|learn|unlv|class|student|bootcamp|training)\b/.test(t)) return "education";
  if (/\b(revenue|income|client|sales|money|earn|business|offer|close|deal)\b/.test(t)) return "revenue";
  if (/\b(network|relationship|community|partner|connect|meet|event|crypto mondays)\b/.test(t)) return "relationships";
  return "general";
}

function impactToPriority(impact: string): ProjectPriority {
  if (impact === "transformative") return "Critical";
  if (impact === "high")           return "High";
  if (impact === "medium")         return "Medium";
  return "Low";
}

// ── Milestones ──────────────────────────────────────────────────────────────

const MILESTONE_30: Record<Theme, string> = {
  ai:            "Define AI system requirements + land first test client outreach",
  bitcoin:       "Publish foundational Bitcoin educational piece",
  content:       "Ship first content piece + outline 4-week calendar",
  dwt:           "Define DWT value proposition + reach first 3 companies",
  education:     "Complete course outline + first module draft",
  revenue:       "Identify 5 qualified prospects + send first outreach",
  relationships: "Reconnect with 3 key contacts + schedule one call",
  general:       "Define scope + ship first visible deliverable",
};

const MILESTONE_60: Record<Theme, string> = {
  ai:            "Deliver second client system or upgrade the first",
  bitcoin:       "Reach first 100 engaged followers or subscribers",
  content:       "Publish 10 pieces + land first collaboration",
  dwt:           "List first 5 companies + drive initial traffic",
  education:     "Complete 50% of course content",
  revenue:       "Close first paid engagement or retainer",
  relationships: "Deepen top 3 relationships into active projects",
  general:       "Achieve mid-point milestone with measurable output",
};

const MILESTONE_90: Record<Theme, string> = {
  ai:            "Stable recurring client or productized AI offer live",
  bitcoin:       "Recognized voice in Bitcoin education niche",
  content:       "Consistent publishing cadence with growing audience",
  dwt:           "DWT directory with 10+ listings + first revenue",
  education:     "First cohort launched or course live",
  revenue:       "First revenue milestone from this objective hit",
  relationships: "Formalized partnerships or active referral pipeline",
  general:       "Clear outcome reached: shipped, closed, or established",
};

function deriveMilestones(obj: StrategicObjective): GoalMilestone[] {
  const theme = detectTheme(obj.title);
  const ms: GoalMilestone[] = [];
  let idx = 0;

  ms.push({
    id:          uid(`ms_${obj.id}`, idx++),
    title:       MILESTONE_30[theme],
    description: `Establish clarity and prove the path is viable. One concrete visible output within 30 days.`,
    timeframe:   "30d",
  });

  // Extra validation checkpoint for hard/very-hard objectives
  if (obj.difficulty === "hard" || obj.difficulty === "very-hard") {
    ms.push({
      id:          uid(`ms_${obj.id}`, idx++),
      title:       `Validate core assumption — run one test or pilot`,
      description: `Before full commitment, confirm the path is right. One call, prototype, or pilot is enough to proceed with confidence.`,
      timeframe:   "30d",
    });
  }

  ms.push({
    id:          uid(`ms_${obj.id}`, idx++),
    title:       MILESTONE_60[theme],
    description: `Build visible momentum. 60-day output should be something you can point to publicly.`,
    timeframe:   "60d",
  });

  ms.push({
    id:          uid(`ms_${obj.id}`, idx++),
    title:       MILESTONE_90[theme],
    description: `Arrive at a concrete outcome. Evaluate what worked and plan the next 90-day cycle.`,
    timeframe:   "90d",
  });

  return ms;
}

// ── Task Suggestions ────────────────────────────────────────────────────────

const TASK_TEMPLATES: Record<Theme, string[]> = {
  ai: [
    "Draft AI system offer page with pricing tiers",
    "Identify 5 local businesses for AI automation outreach",
    "Build a proof-of-concept automation workflow",
    "Write case study for first deployed AI system",
    "Create client onboarding checklist for AI engagements",
    "Set up client reporting dashboard",
    "Document system architecture for future scale",
  ],
  bitcoin: [
    "Write 'Bitcoin 101' educational guide for beginners",
    "Set up automated DCA tracking spreadsheet",
    "Research Lightning Network use cases for content",
    "Outline Bitcoin content series (5 topics)",
    "Identify Bitcoin educator accounts to collaborate with",
    "Create Bitcoin savings goal tracker",
  ],
  content: [
    "Script first long-form video",
    "Design 3 thumbnail templates",
    "Schedule 4 posts for next week",
    "Write email newsletter outline",
    "Research top-performing content in niche",
    "Create content repurposing workflow",
    "Batch record 3 short-form clips",
  ],
  dwt: [
    "Define directory category structure",
    "Draft company listing template",
    "Identify first 10 companies to approach",
    "Write copy for DWT homepage value proposition",
    "Set up lead intake form for providers",
    "Create pricing page for directory listings",
    "Reach out to 3 potential launch partners",
  ],
  education: [
    "Define course learning outcomes",
    "Outline first 5 modules",
    "Record first module video or lesson",
    "Create student workbook template",
    "Set up course platform or landing page",
    "Identify first 10 beta students to enroll",
  ],
  revenue: [
    "List 10 qualified prospects",
    "Write personalized cold outreach template",
    "Send 5 outreach messages to warm leads",
    "Schedule 3 discovery calls",
    "Create one-page offer summary",
    "Follow up with warm leads from last 30 days",
    "Define pricing tiers and packages",
  ],
  relationships: [
    "Identify top 10 relationships to prioritize",
    "Send personal check-in to 5 contacts",
    "Schedule coffee chat or call with top contact",
    "Write personal update to share with network",
    "Join one relevant community or event",
    "Introduce two contacts who should know each other",
  ],
  general: [
    "Define success criteria and key results",
    "Identify key blockers and document mitigation plan",
    "Research best practices or relevant case studies",
    "Create project plan with weekly milestones",
    "Schedule dedicated focus block (3 hrs/week minimum)",
    "Review and clean up related open tasks",
  ],
};

function suggestTasks(
  obj: StrategicObjective,
  projects: Project[],
  projectTasks: ProjectTask[]
): SuggestedTask[] {
  const theme    = detectTheme(obj.title);
  const priority = impactToPriority(obj.impact);

  const relatedProject = projects.find(
    (p) => obj.relatedProjects.includes(p.id) && p.status !== "Archived"
  );
  const projectId    = relatedProject?.id    ?? "";
  const projectTitle = relatedProject?.title ?? "No linked project";

  // Gather existing task titles for deduplication
  const existingOpen = new Set(
    projectTasks
      .filter((t) => obj.relatedProjects.includes(t.project_id) && t.status !== "Done")
      .map((t) => t.title.toLowerCase().slice(0, 20))
  );

  const templates = TASK_TEMPLATES[theme] ?? TASK_TEMPLATES.general;
  const filtered  = templates.filter((t) => !existingOpen.has(t.toLowerCase().slice(0, 20)));

  return filtered.slice(0, 6).map((title, i) => ({
    id:                 uid(`task_${obj.id}`, i),
    title,
    priority,
    rationale:          `Supports "${obj.title}" — theme-matched execution action`,
    suggestedProjectId: projectId,
    projectTitle,
  }));
}

// ── Content Suggestions ─────────────────────────────────────────────────────

type ContentTemplate = Omit<SuggestedContent, "id">;

const CONTENT_TEMPLATES: Record<Theme, ContentTemplate[]> = {
  ai: [
    { title: "How I Built an AI Lead Generation System for a Local Business", format: "Video",   platforms: ["YouTube", "LinkedIn"],  angle: "Behind-the-scenes case study. Builds authority and attracts clients.", priority: "High" },
    { title: "5 AI Automations Every Small Business Needs in 2026",           format: "Article", platforms: ["LinkedIn", "Blog"],      angle: "Educational roundup. Drives search traffic + inbound DMs.",          priority: "High" },
    { title: "AI vs Hiring: The Real Cost Comparison for Service Businesses", format: "Post",    platforms: ["LinkedIn", "Instagram"], angle: "Contrarian angle. High engagement + client magnet.",                  priority: "Medium" },
  ],
  bitcoin: [
    { title: "Why I Hold Bitcoin (And Why You Should Consider It)",     format: "Video", platforms: ["YouTube", "Instagram"], angle: "Personal story. Builds trust and draws in beginners.",            priority: "High" },
    { title: "Bitcoin in 5 Minutes: What Beginners Need to Know",       format: "Short", platforms: ["YouTube", "Instagram"], angle: "Short-form education. Shareable and algorithm-friendly.",         priority: "High" },
    { title: "How I Automate My Bitcoin Savings Every Month",           format: "Post",  platforms: ["Instagram", "LinkedIn"], angle: "Practical how-to. Drives DMs and follow inquiries.",            priority: "Medium" },
  ],
  content: [
    { title: "How I Create a Week of Content in One Day",     format: "Video",   platforms: ["YouTube", "Instagram"], angle: "Productivity angle. High search demand + repurposable.", priority: "High" },
    { title: "My Full Content System: From Idea to Published", format: "Article", platforms: ["Blog", "Newsletter"],   angle: "Deep dive. Builds authority and email list.",             priority: "High" },
    { title: "The Content Formats That Are Growing My Audience", format: "Post", platforms: ["LinkedIn", "Instagram"], angle: "Data-driven share. Easy to engage with.",                  priority: "Medium" },
  ],
  dwt: [
    { title: "How Digital Wealth Transfer Helps Las Vegas Businesses Find AI Tools", format: "Article", platforms: ["Blog", "LinkedIn"],      angle: "Introduces DWT. SEO-friendly + trust-building.", priority: "High" },
    { title: "Why Local Businesses Need a Tech Provider — Not Just a Freelancer",    format: "Post",    platforms: ["LinkedIn", "Instagram"], angle: "Positions DWT as the solution.",                  priority: "High" },
  ],
  education: [
    { title: "What You'll Learn in My AI Automation Course",                     format: "Video",   platforms: ["YouTube", "Instagram"], angle: "Course preview. Builds waitlist.",         priority: "High" },
    { title: "Why Most People Fail at Learning AI (And What to Do Instead)",     format: "Article", platforms: ["Blog", "Newsletter"],   angle: "Contrarian angle. Drives enrollment.",     priority: "High" },
  ],
  revenue: [
    { title: "How Much Does an AI System Actually Cost? (Real Pricing)",  format: "Article", platforms: ["Blog", "LinkedIn"],      angle: "Transparent pricing. Filters qualified leads.",  priority: "High" },
    { title: "3 Ways I Generated Revenue with AI This Month",             format: "Post",    platforms: ["Instagram", "LinkedIn"], angle: "Income report style. High engagement.",          priority: "High" },
  ],
  relationships: [
    { title: "Why I Spend 2 Hours a Week on Relationship Building",  format: "Post",    platforms: ["LinkedIn", "Instagram"], angle: "Personal philosophy. Builds community.",              priority: "Medium" },
    { title: "How I Use AI to Stay in Touch with My Network",         format: "Article", platforms: ["Blog", "Newsletter"],   angle: "Combines AI + relationships. Practical + shareable.", priority: "Medium" },
  ],
  general: [
    { title: "Building in Public: My Progress Toward This Goal",      format: "Post",    platforms: ["Instagram", "LinkedIn"], angle: "Transparent progress share. Authentic and engaging.",  priority: "Medium" },
    { title: "Lessons Learned So Far (What I'd Do Differently)",      format: "Article", platforms: ["Blog", "Newsletter"],   angle: "Reflection. Demonstrates expertise and honesty.",       priority: "Medium" },
  ],
};

function suggestContent(
  obj: StrategicObjective,
  contentItems: ContentItem[]
): SuggestedContent[] {
  const theme     = detectTheme(obj.title);
  const templates = CONTENT_TEMPLATES[theme] ?? CONTENT_TEMPLATES.general;

  const existing = new Set(contentItems.map((c) => c.title.toLowerCase().slice(0, 20)));
  const filtered  = templates.filter((t) => !existing.has(t.title.toLowerCase().slice(0, 20)));

  return filtered.slice(0, 3).map((c, i) => ({
    ...c,
    id: uid(`content_${obj.id}`, i),
    priority: impactToPriority(obj.impact) as ContentPriority,
  }));
}

// ── Follow-Up Suggestions ───────────────────────────────────────────────────

type FollowUpTemplate = { personName: string; reason: string; action: string };

const FOLLOWUP_TEMPLATES: Record<Theme, FollowUpTemplate[]> = {
  ai: [
    { personName: "Prospective AI client", reason: "Warm lead who expressed interest in AI automation", action: "Send personalized follow-up with 3-sentence value prop" },
    { personName: "Tech partner or integrator", reason: "Potential collaboration on AI systems delivery", action: "Schedule intro call to explore partnership" },
  ],
  bitcoin: [
    { personName: "Bitcoin community contact", reason: "Connected at Crypto Mondays or online", action: "Share recent Bitcoin content + start a real conversation" },
    { personName: "Bitcoin-curious friend or follower", reason: "Has expressed interest in crypto but hasn't acted", action: "Send one educational resource with personal note" },
  ],
  content: [
    { personName: "Content collaborator", reason: "Creator with overlapping audience for collab video", action: "Send DM proposing collab or cross-promotion" },
    { personName: "Email list subscriber or fan", reason: "Highly engaged person worth acknowledging", action: "Send personal reply to their last message or comment" },
  ],
  dwt: [
    { personName: "DWT prospect company", reason: "Business that fits the directory", action: "Send intro email explaining the platform + listing offer" },
    { personName: "DWT advisor or partner", reason: "Could help shape direction or open doors", action: "Schedule 20-minute strategy call" },
  ],
  education: [
    { personName: "Potential course student", reason: "Expressed interest in AI or automation education", action: "Share course preview and early-bird offer" },
    { personName: "UNLV or institutional contact", reason: "Potential educational partnership", action: "Send brief intro + curriculum overview" },
  ],
  revenue: [
    { personName: "Warm sales lead", reason: "Previous inquiry or contact who hasn't converted", action: "Send personalized follow-up with updated offer" },
    { personName: "Former client", reason: "Past client worth re-engaging for upsell or referral", action: "Check in on results from your previous work together" },
  ],
  relationships: [
    { personName: "Dormant high-value contact", reason: "Connected years ago but haven't spoken recently", action: "Send genuine, no-pitch check-in message" },
    { personName: "Community member or event contact", reason: "Met at an event or in a group but never deepened", action: "Invite to coffee or a quick call to reconnect" },
  ],
  general: [
    { personName: "Key stakeholder or advisor", reason: `Relevant to achieving this strategic objective`, action: "Schedule a 20-minute clarity or accountability call" },
  ],
};

function suggestFollowUps(
  obj: StrategicObjective,
  projects: Project[],
  people: Person[],
  todayStr: string
): SuggestedFollowUp[] {
  const theme       = detectTheme(obj.title);
  const followUpDate = addDays(todayStr, 7);
  const results: SuggestedFollowUp[] = [];
  let idx = 0;

  // 1. People already linked to related projects
  const linked = people.filter(
    (p) =>
      p.status !== "Archived" &&
      p.related_project_ids.some((pid) => obj.relatedProjects.includes(pid))
  );
  for (const person of linked.slice(0, 2)) {
    results.push({
      id:           uid(`fu_${obj.id}`, idx++),
      personId:     person.id,
      personName:   person.name,
      reason:       `Linked to a project supporting "${obj.title}"`,
      action:       "Check in on progress + share latest update",
      followUpDate,
    });
  }

  // 2. Theme-based suggestions — try to match existing people first
  if (results.length < 3) {
    const templates = FOLLOWUP_TEMPLATES[theme] ?? FOLLOWUP_TEMPLATES.general;
    for (const tmpl of templates) {
      if (results.length >= 3) break;
      // Prefer Prospect/Client/Partner already in system
      const match = people.find(
        (p) =>
          p.status !== "Archived" &&
          (p.relationship_type === "Prospect" || p.relationship_type === "Client" || p.relationship_type === "Partner") &&
          !results.some((r) => r.personId === p.id)
      );
      results.push({
        id:           uid(`fu_${obj.id}`, idx++),
        personId:     match?.id     ?? "",
        personName:   match?.name   ?? tmpl.personName,
        reason:       tmpl.reason,
        action:       tmpl.action,
        followUpDate,
      });
    }
  }

  return results.slice(0, 3);
}

// ── Opportunity Suggestions ─────────────────────────────────────────────────

type OppTemplate = Omit<SuggestedOpportunity, "id">;

const OPP_TEMPLATES: Record<Theme, OppTemplate[]> = {
  ai: [
    { title: "AI Revenue System Retainer — Local Business", type: "Revenue",     description: "Monthly AI automation retainer for a Las Vegas business.",           suggestedAction: "Identify one warm prospect and make the retainer offer." },
    { title: "AI Tools Partnership with SaaS Provider",     type: "Partnership", description: "Referral or white-label partnership with an AI software company.",    suggestedAction: "Research 3 relevant SaaS companies and reach out about referral terms." },
  ],
  bitcoin: [
    { title: "Bitcoin Education Speaking Slot",  type: "Event",   description: "Speaking opportunity at Crypto Mondays LV or similar event.",             suggestedAction: "Contact event organizer with 2-sentence pitch for a 15-minute slot." },
    { title: "Bitcoin Content Sponsorship Deal", type: "Revenue", description: "Brand deal with a Bitcoin-adjacent company sponsoring your content.",       suggestedAction: "Identify 2 brands whose audience overlaps with yours and send partnership inquiry." },
  ],
  content: [
    { title: "YouTube Brand Integration Deal",        type: "Revenue",     description: "Sponsorship from a brand aligned with AI, Bitcoin, or digital business.", suggestedAction: "Identify 3 brands and send partnership inquiry." },
    { title: "Content Collaboration — Cross-Promo", type: "Content",     description: "Collab video or newsletter swap with a creator in an adjacent niche.",      suggestedAction: "DM 2 creators whose audiences overlap with yours." },
  ],
  dwt: [
    { title: "DWT Premium Listing — First Paying Client",  type: "Client",      description: "A company paying for enhanced placement in the DWT directory.",    suggestedAction: "Pitch premium listing to top 3 directory candidates this week." },
    { title: "DWT Partnership — AI or Blockchain Firm",    type: "Partnership", description: "Strategic partner who brings their client network to DWT.",         suggestedAction: "Reach out to 2 established firms about featured partnership slots." },
  ],
  education: [
    { title: "UNLV AI Workshop Partnership",         type: "Education", description: "Collaboration with UNLV to deliver AI curriculum or workshops.",     suggestedAction: "Contact department chair with course outline and pilot proposal." },
    { title: "Corporate AI Training Engagement",     type: "Client",    description: "Company that wants internal AI training for their team.",             suggestedAction: "Identify 2 mid-size companies in Las Vegas and pitch a training package." },
  ],
  revenue: [
    { title: "AI Revenue Systems Retainer — New Client", type: "Client",      description: "Monthly retainer for AI systems build + ongoing optimization.",  suggestedAction: "Send proposal to warmest prospect in your pipeline." },
    { title: "Referral Partnership — Marketing Agency",  type: "Partnership", description: "Agency that refers clients needing AI automation.",               suggestedAction: "Contact 2 local marketing agencies about a referral agreement." },
  ],
  relationships: [
    { title: "Community Leadership — Crypto Mondays LV", type: "Personal",     description: "Formalize or expand community leadership position.",             suggestedAction: "Propose an expanded or formal role to chapter leadership." },
    { title: "Strategic Advisor Relationship",           type: "Personal",     description: "Mentor or advisor who is further ahead on this path.",           suggestedAction: "Identify one person and send a thoughtful, specific request for guidance." },
  ],
  general: [
    { title: `Opportunity: ${""} (from strategy)`,      type: "Personal",     description: `Converting a strategic objective into a tracked opportunity.`,   suggestedAction: `Define the specific win condition and start pursuing it actively.` },
  ],
};

function suggestOpportunities(
  obj: StrategicObjective,
  opportunities: Opportunity[]
): SuggestedOpportunity[] {
  const theme     = detectTheme(obj.title);
  const existing  = new Set(opportunities.map((o) => o.title.toLowerCase().slice(0, 25)));
  const templates = OPP_TEMPLATES[theme] ?? OPP_TEMPLATES.general;
  const filtered  = templates.filter((t) => !existing.has(t.title.toLowerCase().slice(0, 25)));

  return filtered.slice(0, 2).map((o, i) => {
    const title = o.title.includes(`${""} (from strategy)`)
      ? `${obj.title.slice(0, 50)} — opportunity`
      : o.title;
    return { ...o, id: uid(`opp_${obj.id}`, i), title };
  });
}

// ── Main Export ─────────────────────────────────────────────────────────────

export function computeGoalDecomposition(input: DecompositionInput): DecompositionResult {
  const { todayStr, strategicPlan, projects, projectTasks, contentItems, opportunities, people } = input;

  const decomposedGoals: DecomposedGoal[] = strategicPlan.topObjectives.map((obj) => {
    const existingRelatedProjects = projects
      .filter((p) => obj.relatedProjects.includes(p.id) && p.status !== "Archived")
      .map((p) => ({ id: p.id, title: p.title }));

    return {
      objectiveId:             obj.id,
      objectiveTitle:          obj.title,
      objectiveWhy:            obj.whyItMatters,
      milestones:              deriveMilestones(obj),
      suggestedTasks:          suggestTasks(obj, projects, projectTasks),
      suggestedContent:        suggestContent(obj, contentItems),
      suggestedFollowUps:      suggestFollowUps(obj, projects, people, todayStr),
      suggestedOpportunities:  suggestOpportunities(obj, opportunities),
      existingRelatedProjects,
    };
  });

  return {
    generatedAt:                 new Date().toISOString(),
    decomposedGoals,
    totalSuggestedTasks:         decomposedGoals.reduce((s, g) => s + g.suggestedTasks.length, 0),
    totalSuggestedContent:       decomposedGoals.reduce((s, g) => s + g.suggestedContent.length, 0),
    totalSuggestedFollowUps:     decomposedGoals.reduce((s, g) => s + g.suggestedFollowUps.length, 0),
    totalSuggestedOpportunities: decomposedGoals.reduce((s, g) => s + g.suggestedOpportunities.length, 0),
  };
}
