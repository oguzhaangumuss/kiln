import type { Agent } from "@/domain/agent";
import type { SampleTrace } from "@/domain/sample-trace";
import { applyPublicMarket, usesPublicMarket } from "@/application/apply-public-market";
import { findAgent, type AgentLookupHint } from "@/infrastructure/catalog/find-agent";
import { probeAgent } from "@/infrastructure/agent-probe";
import { createPancake } from "@/infrastructure/pancake/pool-metric";

export type PreviewAgentWork = {
  agent: Agent;
  trace: SampleTrace;
};

export async function previewAgentWork(
  id: string,
  hint?: AgentLookupHint,
): Promise<PreviewAgentWork | null> {
  const found = await findAgent(id, hint);
  if (!found) return null;
  const metric = usesPublicMarket(found.kind) ? await createPancake().snapshot() : null;
  const agent = applyPublicMarket(found, metric);
  const trace = await probeAgent(agent);
  return { agent, trace };
}
