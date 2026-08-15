import type { Agent } from "@/domain/agent";
import type { CatalogPage } from "@/domain/catalog-query";
import type { CatalogQuery } from "@/domain/catalog-query";
import { assessTrust } from "@/domain/trust";
import type { TrustReport } from "@/domain/trust";
import type { AgentCatalogPort } from "@/application/ports/agent-catalog-port";
import type { KilnMemoryPort } from "@/application/ports/kiln-memory-port";
import type { PancakePort } from "@/application/ports/pancake-port";

export type ListedAgent = {
  agent: Agent;
  trust: TrustReport;
};

export type ListAgentsResult = CatalogPage & {
  items: ListedAgent[];
};

function warningFor(feed: ListAgentsResult["feed"]): string {
  if (feed === "synthetic") {
    return "SYNTHETIC FEED — 8004scan and RPC failed. UI marks this bay as synthetic. Never treat it as the live index.";
  }
  if (feed === "bsc-rpc") {
    return "BSC ERC-8004 RPC page (8004scan unavailable). Registration is permissionless; mint ≠ honest.";
  }
  return "8004scan BSC index. Pages of 25. Registration is permissionless; mint ≠ honest.";
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
  });

  const yieldOnPage = raw.agents.some((agent) => agent.kind === "yield");
  const metric = yieldOnPage ? await pancake.snapshot() : null;

  const items: ListedAgent[] = raw.agents.map((agent) => {
    const enriched: Agent =
      agent.kind === "yield"
        ? {
            ...agent,
            pancakeAprBps: metric?.aprBps ?? null,
            pancakeTvlUsd: metric?.tvlUsd ?? null,
          }
        : agent;
    return {
      agent: enriched,
      trust: assessTrust(enriched, kiln.get(enriched.id)),
    };
  });

  const filtered = query.hideHighHeat
    ? items.filter((row) => row.trust.heat !== "high")
    : items;

  return {
    items: filtered,
    totalOnChain: raw.totalOnChain,
    offset,
    limit,
    feed: raw.feed,
    warning:
      raw.searchDegraded
        ? "8004scan search is down. Category/q filtered from cached BSC index pages — not a full 200k dump."
        : warningFor(raw.feed),
  };
}
