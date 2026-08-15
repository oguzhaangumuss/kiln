export type AgentKind = "monitoring" | "grid" | "health-factor" | "yield" | "unknown";

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
  cardReadable: boolean;
  totalFeedbacks: number;
  averageScore: number | null;
  x402Supported: boolean;
  chainId: number;
};
