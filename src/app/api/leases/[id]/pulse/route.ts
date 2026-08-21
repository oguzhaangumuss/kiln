import { NextResponse } from "next/server";
import { pulseLease } from "@/application/pulse-lease";
import { createLeaseStore } from "@/infrastructure/leases/create-lease-store";
import { readSessionWallet } from "@/infrastructure/session";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const wallet = await readSessionWallet();
  if (!wallet) {
    return NextResponse.json({ error: "Sign in to the hire book first." }, { status: 401 });
  }
  const { id } = await context.params;
  const store = createLeaseStore();
  const existing = await store.get(id);
  if (!existing || existing.wallet !== wallet) {
    return NextResponse.json({ error: "Lease not found." }, { status: 404 });
  }
  const result = await pulseLease(store, id);
  const heartbeats = await store.recentHeartbeats(id, 20);
  return NextResponse.json({ ...result, heartbeats });
}
