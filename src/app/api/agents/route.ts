import type { AgentKind } from "@/domain/agent";
import { NextResponse } from "next/server";
import { listAgents } from "@/application/list-agents";
import { createCatalog } from "@/infrastructure/catalog/create-catalog";
import { kilnMemory } from "@/infrastructure/catalog/kiln-memory";
import { createPancake } from "@/infrastructure/pancake/pool-metric";

const KINDS: Array<AgentKind | "all"> = [
  "all",
  "monitoring",
  "grid",
  "health-factor",
  "yield",
  "unknown",
];

function categoryOf(raw: string | null): AgentKind | "all" {
  if (raw && (KINDS as string[]).includes(raw)) return raw as AgentKind | "all";
  return "all";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const offset = Number(url.searchParams.get("offset") ?? "0");
  const limit = Number(url.searchParams.get("limit") ?? "25");
  const hideHighHeat = url.searchParams.get("hideHighHeat") === "1";
  const q = url.searchParams.get("q") ?? "";
  const category = categoryOf(url.searchParams.get("category"));

  try {
    const result = await listAgents(createCatalog(), kilnMemory, createPancake(), {
      offset: Number.isFinite(offset) ? offset : 0,
      limit: Number.isFinite(limit) ? limit : 25,
      hideHighHeat,
      q,
      category,
    });
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Catalog read failed (SCAN_FAIL). Synthetic feed should still load." },
      { status: 502 },
    );
  }
}
