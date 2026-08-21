import type { Agent } from "@/domain/agent";
import type { AgentSort, CatalogPage, CatalogQuery } from "@/domain/catalog-query";
import { assessTrust } from "@/domain/trust";
import type { TrustReport } from "@/domain/trust";
import type { AgentCatalogPort } from "@/application/ports/agent-catalog-port";
import type { KilnMemoryPort } from "@/application/ports/kiln-memory-port";
import type { PancakePort } from "@/application/ports/pancake-port";
import { applyPublicMarket, usesPublicMarket } from "@/application/apply-public-market";
import { rememberListedAgents } from "@/infrastructure/catalog/agent-lookup-cache";

export type ListedAgent = {
  agent: Agent;
  trust: TrustReport;
};

export type ListAgentsResult = CatalogPage & {
  items: ListedAgent[];
};

function warningFor(feed: ListAgentsResult["feed"]): string {
  if (feed === "synthetic") {
    return "Showing sample agents. The live 8004scan index and the on-chain fallback are both unavailable.";
  }
  if (feed === "bsc-rpc") {
    return "Showing the on-chain ERC-8004 registry. 8004scan search is unavailable. Registration is permissionless, so a mint is not a trust signal.";
  }
  return "Live 8004scan index on BNB Smart Chain. Registration is permissionless; a mint is not a trust signal.";
}

const PULSE_RANK: Record<string, number> = { live: 0, stale: 1, unknown: 2 };
const RISK_RANK: Record<string, number> = { low: 0, medium: 1, high: 2 };

function sortListed(items: ListedAgent[], sort: AgentSort): ListedAgent[] {
  if (sort === "relevance") return items;
  const ranked = [...items];
  ranked.sort((a, b) => {
    if (sort === "feedback") return b.agent.totalFeedbacks - a.agent.totalFeedbacks;
    if (sort === "score") return (b.agent.averageScore ?? -1) - (a.agent.averageScore ?? -1);
    if (sort === "live") return PULSE_RANK[a.agent.pulse] - PULSE_RANK[b.agent.pulse];
    if (sort === "name") return a.agent.handle.localeCompare(b.agent.handle);
    return RISK_RANK[a.trust.heat] - RISK_RANK[b.trust.heat];
  });
  return ranked;
}

export async function listAgents(
  catalog: AgentCatalogPort,
  kiln: KilnMemoryPort,
  pancake: PancakePort,
  query: CatalogQuery,
): Promise<ListAgentsResult> {
  const limit = Math.min(Math.max(query.limit, 1), 50);
  const offset = Math.max(query.offset, 0);
  const raw = await catalog.page({
    offset,
    limit,
    q: query.q,
    category: query.category,
    pulse: query.pulse,
    x402Only: query.x402Only,
    minFeedback: query.minFeedback,
    doorOnly: query.doorOnly,
  });

  const marketOnPage = raw.agents.some((agent) => usesPublicMarket(agent.kind));
  const metric = marketOnPage ? await pancake.snapshot() : null;

  const items: ListedAgent[] = raw.agents.map((agent) => {
    const enriched: Agent = applyPublicMarket(agent, metric);
    return {
      agent: enriched,
      trust: assessTrust(enriched, kiln.get(enriched.id)),
    };
  });

  const filtered = query.hideHighHeat
    ? items.filter((row) => row.trust.heat !== "high")
    : items;

  rememberListedAgents(filtered.map((row) => row.agent));

  return {
    items: sortListed(filtered, query.sort),
    totalOnChain: raw.totalOnChain,
    offset,
    limit,
    feed: raw.feed,
    warning:
      raw.searchDegraded
        ? "8004scan search is temporarily unavailable. Results are filtered from the cached index and may be incomplete."
        : warningFor(raw.feed),
  };
}
