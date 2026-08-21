import type { Agent } from "@/domain/agent";
import { TtlCache } from "@/infrastructure/catalog/ttl-cache";

const cache = new TtlCache<Agent>(180_000);

function keysOf(agent: Agent): string[] {
  return [
    agent.id,
    agent.agentId,
    `${agent.chainId}:${agent.agentId}`,
    agent.erc8004,
  ].filter((key) => key.trim().length > 0);
}

export function rememberListedAgents(agents: Agent[]): void {
  for (const agent of agents) {
    const existing = recallListedAgent(agent.id) ?? recallListedAgent(agent.agentId);
    const next =
      existing?.cardHydrated && !agent.cardHydrated
        ? {
            ...agent,
            a2aEndpoint: existing.a2aEndpoint ?? agent.a2aEndpoint,
            mcpEndpoint: existing.mcpEndpoint ?? agent.mcpEndpoint,
            extraServices: existing.extraServices.length ? existing.extraServices : agent.extraServices,
            claimedJobs: existing.claimedJobs.length ? existing.claimedJobs : agent.claimedJobs,
            cardHydrated: true,
            mandate: existing.mandate.length > agent.mandate.length ? existing.mandate : agent.mandate,
          }
        : agent;
    for (const key of keysOf(next)) {
      cache.set(key, next);
    }
  }
}

export function recallListedAgent(id: string): Agent | undefined {
  const direct = cache.get(id);
  if (direct) return direct;
  const token = id.split(":").pop();
  if (token && token !== id) return cache.get(token);
  return undefined;
}
