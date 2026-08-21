import { NextResponse } from "next/server";
import { pulseDueLeases } from "@/application/pulse-lease";
import { createLeaseStore } from "@/infrastructure/leases/create-lease-store";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const result = await pulseDueLeases(createLeaseStore(), 20);
  return NextResponse.json(result);
}

export const POST = GET;
