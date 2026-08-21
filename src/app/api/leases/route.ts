import { NextResponse } from "next/server";
import { listMyLeases } from "@/application/list-my-leases";
import { openLease } from "@/application/open-lease";
import type { Agent } from "@/domain/agent";
import type { SampleTrace } from "@/domain/sample-trace";
import { createLeaseStore } from "@/infrastructure/leases/create-lease-store";
import { readSessionWallet } from "@/infrastructure/session";

export async function GET() {
  const wallet = await readSessionWallet();
  if (!wallet) {
    return NextResponse.json({ error: "Sign in to the hire book first." }, { status: 401 });
  }
  const items = await listMyLeases(createLeaseStore(), wallet);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const wallet = await readSessionWallet();
  if (!wallet) {
    return NextResponse.json({ error: "Sign in to the hire book first." }, { status: 401 });
  }
  const body = (await request.json()) as {
    agent?: Agent;
    maxUsdt?: number;
    hours?: number;
    envelopeTx?: string | null;
    envelopeOnchainId?: number | null;
    sampleHash?: string | null;
    sampleTrace?: SampleTrace | null;
    hiredAt?: string;
  };
  if (!body.agent?.id) {
    return NextResponse.json({ error: "Agent snapshot missing." }, { status: 400 });
  }
  const lease = await openLease(createLeaseStore(), {
    wallet,
    agent: body.agent,
    maxUsdt: Number(body.maxUsdt ?? 0),
    hours: Number(body.hours ?? 0),
    hiredAt: body.hiredAt ?? new Date().toISOString(),
    envelopeTx: body.envelopeTx ?? null,
    envelopeOnchainId: body.envelopeOnchainId ?? null,
    sampleHash: body.sampleHash ?? null,
    sampleTrace: body.sampleTrace ?? null,
  });
  return NextResponse.json(lease);
}
