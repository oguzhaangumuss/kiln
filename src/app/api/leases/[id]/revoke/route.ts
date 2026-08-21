import { NextResponse } from "next/server";
import { revokeLease } from "@/application/revoke-lease";
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
  try {
    const lease = await revokeLease(createLeaseStore(), id, wallet);
    return NextResponse.json(lease);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Revoke failed." },
      { status: 404 },
    );
  }
}
