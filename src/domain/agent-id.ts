import type { Agent } from "@/domain/agent";

export function tokenIdOf(agent: Pick<Agent, "agentId">): bigint {
  const raw = agent.agentId.replace(/[^\d]/g, "") || "0";
  try {
    return BigInt(raw);
  } catch {
    return BigInt(0);
  }
}
