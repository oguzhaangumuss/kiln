import { NextResponse } from "next/server";
import { issueNonce } from "@/infrastructure/session";

export async function POST() {
  const nonce = await issueNonce();
  return NextResponse.json({ nonce });
}
