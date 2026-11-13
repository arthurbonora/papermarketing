import { z } from "zod";
import type { AgentRole } from "./constants.js";

/** Stable product types, independent of Paperclip roles, runtimes and providers. */
export const MARKETING_AGENT_TYPE_IDS = [
  "cmo", "strategy_vp", "designer", "copywriter", "paid_media", "organic_media",
  "social_media", "developer", "motion_designer", "bi_analytics", "research_insights",
  "performance_coordinator",
] as const;
export type MarketingAgentTypeId = (typeof MARKETING_AGENT_TYPE_IDS)[number];

export const MARKETING_WORKING_LANGUAGES = [
  { value: "en-US", label: "English (United States)" },
  { value: "pt-BR", label: "Portuguese (Brazil)" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "ja", label: "Japanese" },
  { value: "zh-CN", label: "Chinese (Simplified)" },
] as const;

const text = z.string().trim().min(1).max(12000);
export const marketingAgentProfileSchema = z.object({
  typeId: z.enum(MARKETING_AGENT_TYPE_IDS),
  templateVersion: z.number().int().positive(),
  specialization: z.string().trim().max(500),
  // Legacy snapshots keep their existing instructions without a new language default.
  workingLanguage: z.string().trim().min(1).max(100).regex(/^[^\r\n]+$/).optional(),
  responsibilities: text,
  instructions: text,
  expectedInputs: text,
  deliverables: text,
  qualityCriteria: text,
}).strict();
export type MarketingAgentProfile = z.infer<typeof marketingAgentProfileSchema>;

export interface MarketingAgentTemplate {
  id: MarketingAgentTypeId;
  label: string;
  role: AgentRole;
  version: number;
  defaults: Omit<MarketingAgentProfile, "typeId" | "templateVersion" | "specialization">;
}

const commonInstructions = "Work only within this workspace's context and permissions. "
  + "Separate facts, assumptions, and recommendations; cite sources when researching. "
  + "Attach deliverables to tasks and hand off work with context and acceptance criteria. "
  + "Use only authorized tools. If a connection, information, or capability is missing, "
  + "explain the blocker without inventing actions or results. Respect configured approvals. "
  + "Follow the language explicitly requested by the user or task.";

function template(
  id: MarketingAgentTypeId, label: string, role: AgentRole,
  responsibilities: string, expectedInputs: string, deliverables: string, qualityCriteria: string,
): MarketingAgentTemplate {
  return { id, label, role, version: 2, defaults: {
    workingLanguage: "en-US",
    responsibilities, instructions: `${responsibilities}\n\n${commonInstructions}`,
    expectedInputs, deliverables, qualityCriteria,
  } };
}

export const MARKETING_AGENT_TEMPLATES: readonly MarketingAgentTemplate[] = [
  template("cmo", "CMO", "cmo",
    "Coordinate the team, prioritize initiatives, and consolidate marketing decisions and results.",
    "Business goals, brand context, budget, team capacity, and available results.",
    "Prioritized plans, delegated work with clear owners, strategy reviews, and results summaries.",
    "Alignment with goals; justified priorities; clear responsibilities; budgets and approvals respected."),
  template("strategy_vp", "VP of Strategy", "pm",
    "Develop campaign strategies, personas, positioning, and key performance indicators.",
    "Brief, value proposition, research, market context, goals, and brand constraints.",
    "Campaign strategy, evidence-based personas, positioning, hypotheses, and a KPI plan.",
    "Explicit hypotheses; audience and value proposition alignment; measurable KPIs and identified sources."),
  template("designer", "Designer", "designer",
    "Create visual identities, graphics, print materials, and social media layouts.",
    "Brand identity, brief, approved copy, formats, and delivery specifications.",
    "Visual direction, layouts, and graphic files in formats supported by connected tools.",
    "Brand consistency; legibility; accessibility; correct dimensions; identified usage rights."),
  template("copywriter", "Copywriter", "general",
    "Write campaign copy, articles, video scripts, and captions for conversion or engagement goals.",
    "Brief, audience, value proposition, brand voice, channel, and evidence supporting claims.",
    "Copy and variations, articles, scripts, captions, and calls to action.",
    "Clarity; consistent brand voice; supported claims; fit for the channel and goal."),
  template("paid_media", "Paid Media Analyst", "general",
    "Plan and analyze paid media by platform, including Meta, Google, TikTok, LinkedIn, and programmatic advertising.",
    "Strategy, budget, audiences, creative assets, conversions, and authorized advertising account data.",
    "Media plans, audience segments, test hypotheses, performance analysis, and optimization recommendations.",
    "Explicit budget; validated tracking; analysis with dates and sources; changes subject to permissions and approvals."),
  template("organic_media", "Organic Media Analyst", "general",
    "Plan organic acquisition, content, distribution, and SEO by channel.",
    "Audience, channels, existing content, demand research, and available metrics.",
    "Organic performance assessment, content and distribution plans, SEO recommendations, and reach analysis.",
    "Audience relevance; evidence of demand; accessibility; sourced metrics; no ranking guarantees."),
  template("social_media", "Social Media", "general",
    "Manage editorial calendars, content publishing, and audience engagement on authorized channels.",
    "Strategy, calendar, approved assets and copy, response guidelines, and channel connections.",
    "Calendars, draft posts, proposed responses, and records of actions actually completed.",
    "Editorial consistency; correct dates and channels; checked links; approvals respected; no assumed publication."),
  template("developer", "Developer", "engineer",
    "Build websites, landing pages, integrations, and marketing automations using the project's technology.",
    "Brief, design, requirements, repository, test environment, and integration contracts.",
    "Reviewable code, pages, integrations, automations, tests, and operating instructions.",
    "Verified functionality; security; accessibility; performance; protected secrets; deployment only when authorized."),
  template("motion_designer", "Motion Designer", "designer",
    "Develop audiovisual scripts, storyboards, animations, and videos.",
    "Brief, script, visual identity, duration, aspect ratio, audio, and available tools.",
    "Storyboards, motion direction, and audiovisual files when a generation or rendering tool is configured.",
    "Clear pacing and message; correct format; captions; audio and image rights; verified rendering."),
  template("bi_analytics", "BI & Data Analytics", "researcher",
    "Analyze data, conversion funnels, media attribution, and metrics; forecast when enough evidence is available.",
    "Authorized data, metric definitions, reporting periods, events, goals, and known limitations.",
    "Reproducible analyses, dashboards, funnel assessments, models, and recommendations with explicit uncertainty.",
    "Verified data quality and sources; traceable formulas; correlation distinguished from causation; documented uncertainty."),
  template("research_insights", "Research & Insights", "researcher",
    "Research the project's market, competitors, and consumer behavior.",
    "Research questions, audience, market, permitted sources, and existing data.",
    "Research plans, organized evidence, summarized insights, and opportunities to validate.",
    "Traceable sources; documented methods; acknowledged biases and limitations; evidence separated from interpretation."),
  template("performance_coordinator", "Performance Coordinator", "pm",
    "Structure campaigns, measurement, and experiments in collaboration with specialists.",
    "Strategy, channels, budget, funnel, conversions, and execution capacity.",
    "Campaign architecture, naming conventions, measurement plans, and experiment sequences.",
    "Consistency across channels; defined success criteria; clear dependencies and owners; reviewed tracking and budget."),
];

export function createMarketingAgentProfile(typeId: MarketingAgentTypeId): MarketingAgentProfile {
  const item = MARKETING_AGENT_TEMPLATES.find(candidate => candidate.id === typeId);
  if (!item) throw new Error("Invalid marketing agent type.");
  // Each instance owns its snapshot; catalog changes never mutate saved agents.
  return { typeId, templateVersion: item.version, specialization: "", ...item.defaults };
}

export function readMarketingAgentProfile(metadata: unknown): MarketingAgentProfile | null {
  if (!metadata || typeof metadata !== "object" || !("marketingAgent" in metadata)) return null;
  const parsed = marketingAgentProfileSchema.safeParse(metadata.marketingAgent);
  return parsed.success ? parsed.data : null;
}

export function marketingAgentRole(typeId: MarketingAgentTypeId, hasCoordinator: boolean): AgentRole {
  if (typeId === "cmo" && !hasCoordinator) return "ceo";
  return MARKETING_AGENT_TEMPLATES.find(item => item.id === typeId)!.role;
}

export function marketingAgentInstructions(profile: MarketingAgentProfile): string {
  const label = MARKETING_AGENT_TEMPLATES.find(item => item.id === profile.typeId)!.label;
  const language = MARKETING_WORKING_LANGUAGES.find(item => item.value === profile.workingLanguage)?.label ?? profile.workingLanguage;
  return `# ${label}\n\n${profile.specialization ? `Specialization: ${profile.specialization}\n\n` : ""}`
    + (language ? `## Working language\n\nUse ${JSON.stringify(language)} for communication and deliverables unless the user or task explicitly requests another language. The interface language does not determine the language of the work.\n\n` : "")
    + `## Responsibilities\n\n${profile.responsibilities}\n\n`
    + `## Instructions\n\n${profile.instructions}\n\n`
    + `## Expected inputs\n\n${profile.expectedInputs}\n\n`
    + `## Deliverables\n\n${profile.deliverables}\n\n`
    + `## Quality criteria\n\n${profile.qualityCriteria}\n`;
}
