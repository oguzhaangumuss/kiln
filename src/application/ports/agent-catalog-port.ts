import type { Agent, AgentKind } from "@/domain/agent";
import type { CatalogFeed } from "@/domain/catalog-query";

export type CatalogPageRequest = {
  offset: number;
  limit: number;
  q: string;
  category: AgentKind | "all";
};

export type RawPage = {
  agents: Agent[];
  totalOnChain: number;
  feed: CatalogFeed;
  searchDegraded?: boolean;
};

export type AgentCatalogPort = {
  page(request: CatalogPageRequest): Promise<RawPage>;
};
