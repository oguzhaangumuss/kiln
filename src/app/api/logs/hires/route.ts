import { NextResponse } from "next/server";
import { listRecentHires } from "@/application/list-recent-hires";
import { createLeaseStore } from "@/infrastructure/leases/create-lease-store";

export async function GET() {
  try {
    const result = await listRecentHires(createLeaseStore(), 40);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" },
    });
  } catch {
    // The hire book being unreachable is not the same as a broken marketplace.
    // An empty tape with a stated reason keeps the tab honest and browsable;
    // a 502 turns it into a dead end. Rows are never invented either way.
    return NextResponse.json(
      {
        items: [],
        degraded: true,
        notice: "The hire book is unreachable right now, so no hires can be listed.",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}
