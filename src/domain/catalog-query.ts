import type { AgentKind } from "@/domain/agent";

export type CatalogFeed = "synthetic" | "bsc-rpc" | "8004scan";

export type CatalogQuery = {
  offset: number;
  limit: number;
  hideHighHeat: boolean;
  q: string;
  category: AgentKind | "all";
};

export type CatalogPage = {
  totalOnChain: number;
  offset: number;
  limit: number;
  feed: CatalogFeed;
  warning: string;
};
