import { NextResponse } from "next/server";
import { fireSample } from "@/infrastructure/sample-kiln";
import { findAgent } from "@/infrastructure/catalog/find-agent";
import { kilnMemory } from "@/infrastructure/catalog/kiln-memory";

export async function POST(request: Request) {
  const body = (await request.json()) as { agentId?: string; skip?: boolean };
  const agentId = body.agentId?.trim();
  if (!agentId) {
    return NextResponse.json({ error: "agentId required" }, { status: 400 });
  }

  const agent = await findAgent(agentId);
  if (!agent) {
    return NextResponse.json({ error: "Agent not in index" }, { status: 404 });
  }

  if (body.skip) {
    kilnMemory.set(agent.id, "skipped");
    return NextResponse.json({ skipped: true, agentId: agent.id });
  }

  try {
    const attestation = await fireSample(agent);
    kilnMemory.set(agent.id, "passed");
    return NextResponse.json(attestation);
  } catch {
    kilnMemory.set(agent.id, "failed");
    return NextResponse.json({ error: "Kiln sample failed" }, { status: 502 });
  }
}
