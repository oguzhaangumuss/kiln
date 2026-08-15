import type { Agent } from "@/domain/agent";
import type { AgentCatalogPort, CatalogPageRequest, RawPage } from "@/application/ports/agent-catalog-port";
import { AgentRegistry } from "@/infrastructure/agent-registry";

function matches(agent: Agent, request: CatalogPageRequest): boolean {
  if (request.category !== "all" && agent.kind !== request.category) return false;
  const q = request.q.trim().toLowerCase();
  if (!q) return true;
  const hay = `${agent.handle} ${agent.mandate} ${agent.kind}`.toLowerCase();
  return q.split(/\s+/).every((word) => hay.includes(word));
}

export class SyntheticCatalog implements AgentCatalogPort {
  async page(request: CatalogPageRequest): Promise<RawPage> {
    const all = new AgentRegistry().all().filter((agent) => matches(agent, request));
    const offset = Math.max(request.offset, 0);
    const limit = Math.min(Math.max(request.limit, 1), 50);
    return {
      agents: all.slice(offset, offset + limit),
      totalOnChain: all.length,
      feed: "synthetic",
    };
  }
}
