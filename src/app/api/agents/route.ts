import type { AgentKind } from "@/domain/agent";
import { NextResponse } from "next/server";
import { listAgents } from "@/application/list-agents";
import { parseAgentSort, parsePulseFilter } from "@/domain/catalog-query";
import { AGENT_KINDS } from "@/domain/kind";
import { createCatalog } from "@/infrastructure/catalog/create-catalog";
import { kilnMemory } from "@/infrastructure/catalog/kiln-memory";
import { createPancake } from "@/infrastructure/pancake/pool-metric";

function categoryOf(raw: string | null): AgentKind | "all" {
  if (!raw || raw === "all") return "all";
  if (raw === "monitoring") return "rebalancing";
  if ((AGENT_KINDS as string[]).includes(raw)) return raw as AgentKind;
  return "all";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const offset = Number(url.searchParams.get("offset") ?? "0");
  const limit = Number(url.searchParams.get("limit") ?? "25");
  const hideHighHeat = url.searchParams.get("hideHighHeat") === "1";
  const q = url.searchParams.get("q") ?? "";
  const category = categoryOf(url.searchParams.get("category"));
  const sort = parseAgentSort(url.searchParams.get("sort"));
  const pulse = parsePulseFilter(url.searchParams.get("pulse"));
  const x402Only = url.searchParams.get("x402") === "1";
  const minFeedback = Number(url.searchParams.get("minFeedback") ?? "0");
  const doorOnly = url.searchParams.get("door") === "1";

  try {
    const result = await listAgents(createCatalog(), kilnMemory, createPancake(), {
      offset: Number.isFinite(offset) ? offset : 0,
      limit: Number.isFinite(limit) ? limit : 25,
      hideHighHeat,
      q,
      category,
      sort,
      pulse,
      x402Only,
      minFeedback: Number.isFinite(minFeedback) ? Math.max(0, minFeedback) : 0,
      doorOnly,
    });
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "The agent catalog could not be loaded. Please try again." },
      { status: 502 },
    );
  }
}
