import { NextResponse } from "next/server";
import { hireAgent } from "@/application/hire-agent";
import { openLease } from "@/application/open-lease";
import type { Agent } from "@/domain/agent";
import type { SampleTrace } from "@/domain/sample-trace";
import { findAgent } from "@/infrastructure/catalog/find-agent";
import { createLeaseStore } from "@/infrastructure/leases/create-lease-store";
import { readSessionWallet } from "@/infrastructure/session";
import {
  buildHireChallenge,
  facilitatorFromEnv,
  parsePaymentHeader,
  paymentLooksSettled,
} from "@/infrastructure/x402/hire-facilitator";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    agentId?: string;
    tokenId?: string;
    chainId?: number;
    maxUsdt?: number;
    hours?: number;
    attested?: boolean;
    skipped?: boolean;
    agent?: Agent;
    sampleHash?: string | null;
    sampleTrace?: SampleTrace | null;
  };

  const agentId = body.agentId?.trim() || body.tokenId?.trim();
  if (!agentId) {
    return NextResponse.json({ error: "Select an agent before hiring." }, { status: 400 });
  }

  const payment = parsePaymentHeader(request.headers.get("X-PAYMENT"));
  if (!payment) {
    return NextResponse.json(buildHireChallenge(Number(body.maxUsdt ?? 50)), { status: 402 });
  }

  if (!paymentLooksSettled(payment)) {
    return NextResponse.json(
      { error: "Payment proof is incomplete. Open a spend envelope, then try hiring again." },
      { status: 402 },
    );
  }

  const agent = await findAgent(agentId, {
    tokenId: body.tokenId?.trim(),
    chainId: body.chainId,
    snapshot: body.agent ?? null,
  });
  if (!agent) {
    return NextResponse.json({ error: "This agent is not in the current index." }, { status: 404 });
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

    const sessionWallet = await readSessionWallet();
    const hirer = payment.hirer?.toLowerCase() ?? null;
    if (!sessionWallet) {
      return NextResponse.json(
        { error: "Sign the hire book so this lease is stored on your wallet." },
        { status: 401 },
      );
    }
    if (hirer && hirer !== sessionWallet) {
      return NextResponse.json(
        { error: "Hire book is signed for a different wallet. Sign again from the connected account." },
        { status: 401 },
      );
    }

    try {
      const lease = await openLease(createLeaseStore(), {
        wallet: sessionWallet,
        agent,
        maxUsdt: hire.maxUsdt,
        hours: hire.hours,
        hiredAt: hire.at,
        envelopeTx: hire.txHash,
        envelopeOnchainId: payment.envelopeId ? Number(payment.envelopeId) : null,
        sampleHash: body.sampleHash ?? null,
        sampleTrace: body.sampleTrace ?? null,
      });
      hire.leaseId = lease.id;
    } catch {
      return NextResponse.json(
        { error: "Payment landed, but the hire book could not store this lease. Sign in and retry hire." },
        { status: 502 },
      );
    }

    return NextResponse.json(hire);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Hiring could not be completed." },
      { status: 403 },
    );
  }
}
