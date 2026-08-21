import type { AgentKind } from "@/domain/agent";

/**
 * Official first-class Kiln categories (BNB Agent Studio marketplace brief).
 * Order matches the hackathon table. `unknown` is a leftover chip, not a fifth track.
 */
export const FIRST_CLASS_KINDS: AgentKind[] = [
  "rebalancing",
  "grid",
  "yield",
  "health-factor",
];

export const AGENT_KINDS: AgentKind[] = [...FIRST_CLASS_KINDS, "unknown"];

export const CATEGORY_MANDATE: Record<AgentKind, string> = {
  rebalancing: "Manages LP ranges and resets positions automatically.",
  grid: "Places and manages automated grid orders.",
  yield: "Routes liquidity to the highest available APR.",
  "health-factor": "Protects lending positions from liquidation.",
  unknown: "This card does not map to a first-class Kiln category yet.",
};

const KEYWORDS: Array<{ kind: AgentKind; needles: string[] }> = [
  {
    kind: "rebalancing",
    needles: [
      "rebalanc",
      "clmm",
      "concentrated",
      "lp range",
      "range reset",
      "reset position",
      "concentrated liquidity",
    ],
  },
  {
    kind: "health-factor",
    needles: ["health factor", "health-factor", "liquidat", "ltv", "collateral", "venus"],
  },
  {
    kind: "grid",
    needles: ["grid", "band", "grid trading"],
  },
  {
    kind: "yield",
    needles: ["yield", "cake", "farm", "apr", "apy", "pancake", "swap", "trading"],
  },
];

export function classifyKind(text: string): AgentKind {
  const t = text.toLowerCase();
  for (const row of KEYWORDS) {
    if (row.needles.some((n) => t.includes(n))) return row.kind;
  }
  return "unknown";
}

export function parseAgentKind(raw: unknown): AgentKind {
  if (raw === "monitoring") return "rebalancing";
  if (typeof raw === "string" && (AGENT_KINDS as string[]).includes(raw)) {
    return raw as AgentKind;
  }
  return "unknown";
}

export function categorySearchQ(category: AgentKind | "all"): string {
  if (category === "yield") return "yield";
  if (category === "health-factor") return "liquidation";
  if (category === "grid") return "grid";
  if (category === "rebalancing") return "rebalance";
  return "";
}

export function categorySearchNeedles(category: AgentKind | "all"): string[] {
  if (category === "yield") return ["yield", "pancake", "apr"];
  if (category === "health-factor") return ["liquidation", "health factor", "ltv"];
  if (category === "grid") return ["grid", "band"];
  if (category === "rebalancing") return ["rebalance", "lp range", "clmm"];
  return [];
}

export function kindLabel(kind: AgentKind | "all"): string {
  if (kind === "all") return "All";
  if (kind === "rebalancing") return "Rebalancing";
  if (kind === "grid") return "Grid";
  if (kind === "yield") return "Yield";
  if (kind === "health-factor") return "Health factor";
  return "Unclassified";
}
