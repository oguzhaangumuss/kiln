import type { Agent, AgentKind, Pulse } from "@/domain/agent";

export type CatalogFeed = "synthetic" | "bsc-rpc" | "8004scan";

export type AgentSort =
  | "relevance"
  | "feedback"
  | "score"
  | "live"
  | "name"
  | "risk";

export type PulseFilter = "all" | Pulse;

export type CatalogQuery = {
  offset: number;
  limit: number;
  hideHighHeat: boolean;
  q: string;
  category: AgentKind | "all";
  sort: AgentSort;
  pulse: PulseFilter;
  x402Only: boolean;
  minFeedback: number;
  doorOnly: boolean;
};

export type CatalogPage = {
  totalOnChain: number;
  offset: number;
  limit: number;
  feed: CatalogFeed;
  warning: string;
};

export function parseAgentSort(raw: string | null): AgentSort {
  const value = raw?.trim() ?? "relevance";
  if (
    value === "feedback" ||
    value === "score" ||
    value === "live" ||
    value === "name" ||
    value === "risk"
  ) {
    return value;
  }
  return "relevance";
}

export function parsePulseFilter(raw: string | null): PulseFilter {
  const value = raw?.trim() ?? "all";
  if (value === "live" || value === "stale" || value === "unknown") return value;
  return "all";
}

export function matchesDiscovery(
  agent: Agent,
  query: Pick<CatalogQuery, "q" | "category" | "pulse" | "x402Only" | "minFeedback" | "doorOnly">,
): boolean {
  if (query.category !== "all" && agent.kind !== query.category) return false;
  if (query.pulse !== "all" && agent.pulse !== query.pulse) return false;
  if (query.x402Only && !agent.x402Supported) return false;
  if (query.doorOnly && agent.protocols.length === 0 && !agent.a2aEndpoint && !agent.mcpEndpoint) {
    return false;
  }
  if (agent.totalFeedbacks < query.minFeedback) return false;
  const q = query.q.trim().toLowerCase();
  if (!q) return true;
  const hay =
    `${agent.handle} ${agent.mandate} ${agent.kind} ${agent.agentId} ${agent.owner}`.toLowerCase();
  return q
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => hay.includes(word));
}
