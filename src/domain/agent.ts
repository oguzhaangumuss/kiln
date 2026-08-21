import type { AdvertisedService, PublishedJob } from "@/domain/published-job";

export type AgentKind = "rebalancing" | "grid" | "health-factor" | "yield" | "unknown";

export type Pulse = "live" | "stale" | "unknown";

export type Agent = {
  id: string;
  agentId: string;
  handle: string;
  kind: AgentKind;
  pulse: Pulse;
  lastActivityBlock: number;
  mandate: string;
  erc8004: string;
  owner: string;
  agentUri: string;
  pancakeAprBps: number | null;
  pancakeTvlUsd: number | null;
  pancakePair: string | null;
  pancakeFeeBps: number | null;
  pancakeTick: number | null;
  pancakePrice: number | null;
  cardReadable: boolean;
  totalFeedbacks: number;
  averageScore: number | null;
  x402Supported: boolean;
  chainId: number;
  protocols: string[];
  a2aEndpoint: string | null;
  mcpEndpoint: string | null;
  claimedJobs: PublishedJob[];
  extraServices: AdvertisedService[];
  cardHydrated: boolean;
};

export function hasWorkDoor(
  agent: Pick<Agent, "protocols" | "a2aEndpoint" | "mcpEndpoint">,
): boolean {
  return agent.protocols.length > 0 || Boolean(agent.a2aEndpoint || agent.mcpEndpoint);
}
