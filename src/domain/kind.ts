import type { AgentKind } from "@/domain/agent";

const KEYWORDS: Array<{ kind: AgentKind; needles: string[] }> = [
  { kind: "yield", needles: ["yield", "lp", "cake", "farm", "apr", "liquidity", "trading", "swap"] },
  { kind: "health-factor", needles: ["health", "liquidat", "ltv", "collateral"] },
  { kind: "grid", needles: ["grid", "range", "band"] },
  { kind: "monitoring", needles: ["monitor", "watch", "wallet", "alert", "scan"] },
];

export function classifyKind(text: string): AgentKind {
  const t = text.toLowerCase();
  for (const row of KEYWORDS) {
    if (row.needles.some((n) => t.includes(n))) return row.kind;
  }
  return "unknown";
}

export function categorySearchQ(category: AgentKind | "all"): string {
  if (category === "yield") return "yield";
  if (category === "health-factor") return "liquidation";
  if (category === "grid") return "grid";
  if (category === "monitoring") return "wallet";
  return "";
}

export const AGENT_KINDS: AgentKind[] = [
  "monitoring",
  "grid",
  "health-factor",
  "yield",
  "unknown",
];
