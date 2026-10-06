export type ActionRisk = "read_only" | "write" | "human_only";
export type ActionType =
  | "seo.read.gsc"
  | "seo.read.ga4"
  | "seo.read.upgradeseo"
  | "seo.read.backlinks"
  | "seo.read.geolint"
  | "seo.read.trends"
  | "seo.read.gbp"
  | "seo.read.playwright"
  | "seo.write.content"
  | "seo.write.metadata"
  | "seo.human.canonical"
  | "seo.human.url"
  | "seo.human.redirect"
  | "seo.human.robots";
export interface ActionDefinition {
  type: ActionType;
  moduleId: "seo";
  risk: ActionRisk;
  description: string;
}
export const ACTION_REGISTRY: Record<ActionType, ActionDefinition> = {
  "seo.read.gsc": {
    type: "seo.read.gsc",
    moduleId: "seo",
    risk: "read_only",
    description: "Read current Google Search Console data.",
  },
  "seo.read.ga4": {
    type: "seo.read.ga4",
    moduleId: "seo",
    risk: "read_only",
    description: "Read current Google Analytics 4 data.",
  },
  "seo.read.upgradeseo": {
    type: "seo.read.upgradeseo",
    moduleId: "seo",
    risk: "read_only",
    description: "Read current UpgradeSEO data.",
  },
  "seo.read.backlinks": {
    type: "seo.read.backlinks",
    moduleId: "seo",
    risk: "read_only",
    description: "Read current backlink and referring-domain data.",
  },
  "seo.read.geolint": {
    type: "seo.read.geolint",
    moduleId: "seo",
    risk: "read_only",
    description: "Read GEO and AI-search optimization analysis.",
  },
  "seo.read.trends": {
    type: "seo.read.trends",
    moduleId: "seo",
    risk: "read_only",
    description: "Read current search and trend intelligence.",
  },
  "seo.read.gbp": {
    type: "seo.read.gbp",
    moduleId: "seo",
    risk: "read_only",
    description: "Read Google Business Profile data.",
  },
  "seo.read.playwright": {
    type: "seo.read.playwright",
    moduleId: "seo",
    risk: "read_only",
    description: "Read website pages through browser-based inspection.",
  },
  "seo.write.content": {
    type: "seo.write.content",
    moduleId: "seo",
    risk: "write",
    description: "Prepare a content write operation.",
  },
  "seo.write.metadata": {
    type: "seo.write.metadata",
    moduleId: "seo",
    risk: "write",
    description: "Prepare a metadata write operation.",
  },
  "seo.human.canonical": {
    type: "seo.human.canonical",
    moduleId: "seo",
    risk: "human_only",
    description: "Canonical changes require human execution.",
  },
  "seo.human.url": {
    type: "seo.human.url",
    moduleId: "seo",
    risk: "human_only",
    description: "URL changes require human execution.",
  },
  "seo.human.redirect": {
    type: "seo.human.redirect",
    moduleId: "seo",
    risk: "human_only",
    description: "Redirect changes require human execution.",
  },
  "seo.human.robots": {
    type: "seo.human.robots",
    moduleId: "seo",
    risk: "human_only",
    description: "Robots changes require human execution.",
  },
};
export function getActionDefinition(
  type: string,
): ActionDefinition | undefined {
  return ACTION_REGISTRY[type as ActionType];
}
