import { NextResponse } from "next/server";
import { createLeaseStore } from "@/infrastructure/leases/create-lease-store";
import {
  clearSession,
  readNonce,
  readSessionWallet,
  verifyWalletSignature,
  writeSession,
} from "@/infrastructure/session";

export async function GET() {
  const wallet = await readSessionWallet();
  return NextResponse.json({ wallet });
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { address?: string; signature?: string };
  const address = body.address?.trim();
  const signature = body.signature?.trim();
  if (!address?.startsWith("0x") || address.length !== 42 || !signature?.startsWith("0x")) {
    return NextResponse.json({ error: "Sign the hire-book message from the connected wallet." }, { status: 400 });
  }
  const nonce = await readNonce();
  if (!nonce) {
    return NextResponse.json({ error: "Nonce expired. Request a new one." }, { status: 400 });
  }
  const ok = await verifyWalletSignature(address, signature as `0x${string}`, nonce);
  if (!ok) {
    return NextResponse.json({ error: "Signature did not match this wallet." }, { status: 401 });
  }
  await writeSession(address);
  await createLeaseStore().touchWallet(address.toLowerCase());
  return NextResponse.json({ wallet: address.toLowerCase() });
}
