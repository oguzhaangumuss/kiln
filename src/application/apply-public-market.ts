import type { Agent } from "@/domain/agent";
import type { PoolMetric } from "@/application/ports/pancake-port";

export function usesPublicMarket(kind: Agent["kind"]): boolean {
  return kind === "yield" || kind === "rebalancing" || kind === "grid";
}

export function applyPublicMarket(agent: Agent, metric: PoolMetric | null): Agent {
  if (!usesPublicMarket(agent.kind)) return agent;
  return {
    ...agent,
    pancakeAprBps: metric?.aprBps ?? agent.pancakeAprBps,
    pancakeTvlUsd: metric?.tvlUsd ?? agent.pancakeTvlUsd,
    pancakePair: metric?.pair ?? agent.pancakePair,
    pancakeFeeBps: metric?.feeBps ?? agent.pancakeFeeBps,
    pancakeTick: metric?.tick ?? agent.pancakeTick,
    pancakePrice: metric?.price ?? agent.pancakePrice,
  };
}
