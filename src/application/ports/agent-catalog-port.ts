import type { Agent } from "@/domain/agent";
import type { CatalogFeed, CatalogQuery } from "@/domain/catalog-query";

export type CatalogPageRequest = Pick<
  CatalogQuery,
  "offset" | "limit" | "q" | "category" | "pulse" | "x402Only" | "minFeedback" | "doorOnly"
>;

export type RawPage = {
  agents: Agent[];
  totalOnChain: number;
  feed: CatalogFeed;
  searchDegraded?: boolean;
};

export type AgentCatalogPort = {
  page(request: CatalogPageRequest): Promise<RawPage>;
};
