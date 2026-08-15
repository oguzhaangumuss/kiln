import type { Agent } from "@/domain/agent";
import { AgentRegistry } from "@/infrastructure/agent-registry";
import { fetchScanAgent } from "@/infrastructure/catalog/scan-catalog";

export async function findAgent(id: string): Promise<Agent | null> {
  const synthetic = new AgentRegistry()
    .all()
    .find((agent) => agent.id === id || agent.agentId === id);
  if (synthetic) return synthetic;

  const tokenId = id.split(":").pop() ?? id;
  const chainPart = id.includes(":") ? Number(id.split(":")[0]) : 56;
  const chainId = Number.isFinite(chainPart) && chainPart > 0 ? chainPart : 56;
  try {
    return await fetchScanAgent(chainId, tokenId);
  } catch {
    return null;
  }
}
