import { matchesDiscovery } from "@/domain/catalog-query";
import type { AgentCatalogPort, CatalogPageRequest, RawPage } from "@/application/ports/agent-catalog-port";
import { AgentRegistry } from "@/infrastructure/agent-registry";

export class SyntheticCatalog implements AgentCatalogPort {
  async page(request: CatalogPageRequest): Promise<RawPage> {
    const all = new AgentRegistry().all().filter((agent) => matchesDiscovery(agent, request));
    const offset = Math.max(request.offset, 0);
    const limit = Math.min(Math.max(request.limit, 1), 50);
    return {
      agents: all.slice(offset, offset + limit),
      totalOnChain: all.length,
      feed: "synthetic",
    };
  }
}
