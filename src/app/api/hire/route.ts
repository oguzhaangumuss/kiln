import { NextResponse } from "next/server";
import { hireAgent } from "@/application/hire-agent";
import { findAgent } from "@/infrastructure/catalog/find-agent";
import {
  buildHireChallenge,
  facilitatorFromEnv,
  parsePaymentHeader,
  paymentLooksSettled,
} from "@/infrastructure/x402/hire-facilitator";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    agentId?: string;
    maxUsdt?: number;
    hours?: number;
    attested?: boolean;
    skipped?: boolean;
  };

  const agentId = body.agentId?.trim();
  if (!agentId) {
    return NextResponse.json({ error: "agentId required" }, { status: 400 });
  }

  const payment = parsePaymentHeader(request.headers.get("X-PAYMENT"));
  if (!payment) {
    return NextResponse.json(buildHireChallenge(Number(body.maxUsdt ?? 50)), { status: 402 });
  }

  if (!paymentLooksSettled(payment)) {
    return NextResponse.json(
      { error: "X-PAYMENT must include envelopeTx (0x + 64 hex)." },
      { status: 402 },
    );
  }

  const agent = await findAgent(agentId);
  if (!agent) {
    return NextResponse.json({ error: "Agent not in index" }, { status: 404 });
  }

  try {
    const hire = hireAgent(
      agent,
      {
        maxUsdt: Number(body.maxUsdt ?? 0),
        hours: Number(body.hours ?? 0),
        revoked: false,
        onchainId: payment.envelopeId ? Number(payment.envelopeId) : null,
      },
      Boolean(body.attested),
      Boolean(body.skipped),
      facilitatorFromEnv(),
      payment.envelopeTx ?? null,
    );
    return NextResponse.json(hire);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Hire blocked" },
      { status: 403 },
    );
  }
}
