import { NextResponse } from "next/server";
import { fireSample } from "@/infrastructure/sample-kiln";
import { findAgent } from "@/infrastructure/catalog/find-agent";
import type { Agent } from "@/domain/agent";
import { kilnMemory } from "@/infrastructure/catalog/kiln-memory";
import { applyPublicMarket, usesPublicMarket } from "@/application/apply-public-market";
import { createPancake } from "@/infrastructure/pancake/pool-metric";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    agentId?: string;
    tokenId?: string;
    chainId?: number;
    skip?: boolean;
    agent?: Partial<Agent>;
  };
  const agentId = body.agentId?.trim() || body.tokenId?.trim();
  if (!agentId) {
    return NextResponse.json({ error: "Select an agent before running a sample." }, { status: 400 });
  }

  const agent = await findAgent(agentId, {
    tokenId: body.tokenId?.trim(),
    chainId: body.chainId,
    snapshot: body.agent ?? null,
  });
  if (!agent) {
    return NextResponse.json({ error: "This agent is not in the current index." }, { status: 404 });
  }

  if (body.skip) {
    kilnMemory.set(agent.id, "skipped");
    return NextResponse.json({ skipped: true, agentId: agent.id });
  }

  try {
    const metric = usesPublicMarket(agent.kind) ? await createPancake().snapshot() : null;
    const enriched = applyPublicMarket(agent, metric);
    const attestation = await fireSample(enriched);
    kilnMemory.set(
      agent.id,
      attestation.trace.hydrateFailed || (attestation.trace.endpoint && !attestation.trace.reachable)
        ? "failed"
        : "passed",
    );
    return NextResponse.json(attestation);
  } catch {
    kilnMemory.set(agent.id, "failed");
    return NextResponse.json({ error: "The sample run could not be completed." }, { status: 502 });
  }
}
