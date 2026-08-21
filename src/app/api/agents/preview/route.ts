import { NextResponse } from "next/server";
import type { Agent } from "@/domain/agent";
import { previewAgentWork } from "@/application/preview-agent-work";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    agentId?: string;
    tokenId?: string;
    chainId?: number;
    agent?: Partial<Agent>;
  };
  const agentId = body.agentId?.trim() || body.tokenId?.trim();
  if (!agentId) {
    return NextResponse.json({ error: "Select an agent first." }, { status: 400 });
  }

  try {
    const preview = await previewAgentWork(agentId, {
      tokenId: body.tokenId?.trim(),
      chainId: body.chainId,
      snapshot: body.agent ?? null,
    });
    if (!preview) {
      return NextResponse.json({ error: "This agent is not in the current index." }, { status: 404 });
    }
    return NextResponse.json(preview);
  } catch {
    return NextResponse.json({ error: "Could not load this agent’s published jobs." }, { status: 502 });
  }
}
