import { describe, expect, it } from "vitest";
import type { Agent, AgentKind } from "@/domain/agent";
import { applyPublicMarket } from "@/application/apply-public-market";
import { buildCategoryDeck, informedMetricLine } from "@/domain/category-deck";
import { classifyKind, FIRST_CLASS_KINDS } from "@/domain/kind";
import { hireBlockers } from "@/domain/hire-blockers";
import { toHireLogEntry } from "@/domain/hire-log";
import { interleaveRoundRobin } from "@/domain/interleave";
import { createCatalogPorts } from "@/infrastructure/catalog/create-catalog";

function agent(kind: AgentKind, extra: Partial<Agent> = {}): Agent {
  return {
    id: extra.id ?? `id-${kind}`,
    agentId: "1",
    handle: extra.handle ?? kind,
    kind,
    pulse: "live",
    lastActivityBlock: 0,
    mandate: extra.mandate ?? kind,
    erc8004: "reg:1",
    owner: "0xabc",
    agentUri: "https://8004scan.io/agent/56/1",
    pancakeAprBps: extra.pancakeAprBps ?? null,
    pancakeTvlUsd: extra.pancakeTvlUsd ?? null,
    pancakePair: extra.pancakePair ?? null,
    pancakeFeeBps: extra.pancakeFeeBps ?? null,
    pancakeTick: extra.pancakeTick ?? null,
    pancakePrice: extra.pancakePrice ?? null,
    cardReadable: true,
    totalFeedbacks: 0,
    averageScore: null,
    x402Supported: false,
    chainId: 56,
    protocols: [],
    a2aEndpoint: null,
    mcpEndpoint: null,
    claimedJobs: extra.claimedJobs ?? [],
    extraServices: [],
    cardHydrated: true,
  };
}

describe("createCatalogPorts", () => {
  it("does not include a synthetic catalog", () => {
    const names = createCatalogPorts().map((port) => port.constructor.name);
    expect(names).not.toContain("SyntheticCatalog");
    expect(names).toEqual(["ScanCatalog", "Erc8004RpcCatalog"]);
  });
});

describe("equal-depth briefing", () => {
  it("uses the same keys for every first-class kind", () => {
    const keys = FIRST_CLASS_KINDS.map((kind) => Object.keys(buildCategoryDeck(agent(kind))).sort());
    for (const row of keys) {
      expect(row).toEqual(keys[0]);
      expect(row).toEqual(
        ["audience", "fundsNote", "kind", "metricBody", "metricTitle", "mismatch", "officialMandate", "pancakeProduct"].sort(),
      );
    }
  });

  it("does not put pancake APR on the compact list line", () => {
    const yieldAgent = agent("yield", { pancakeAprBps: 1234, pancakeTvlUsd: 1 });
    expect(informedMetricLine(yieldAgent, false)).toBe("");
    expect(informedMetricLine(agent("health-factor"), false)).toBe("");
  });
});

describe("applyPublicMarket", () => {
  it("does not write pancake fields onto a health-factor agent", () => {
    const metric = {
      aprBps: 900,
      tvlUsd: 10,
      source: "pancake-explorer",
      pair: "CAKE/USDT",
      feeBps: 2500,
      tick: 1,
      price: 1.1,
    };
    const next = applyPublicMarket(agent("health-factor"), metric);
    expect(next.pancakeAprBps).toBeNull();
    expect(next.pancakePair).toBeNull();
  });
});

describe("hire log DTO", () => {
  it("truncates the wallet and never copies sample_trace", () => {
    const entry = toHireLogEntry({
      hiredAt: "2026-08-22T00:00:00.000Z",
      handle: "Grid-1",
      kind: "grid",
      wallet: "0x1234567890abcdef1234567890abcdef12345678",
      envelopeTx: "0xdead",
      maxUsdt: 50,
    });
    expect(entry.walletShort).toBe("0x1234…5678");
    expect(entry).not.toHaveProperty("sample_trace");
    expect(JSON.stringify(entry)).not.toContain("0x1234567890abcdef1234567890abcdef12345678");
  });
});

describe("hire log route", () => {
  it("degrades to an empty tape instead of a dead end", async () => {
    const { GET } = await import("@/app/api/logs/hires/route");
    // No SUPABASE_URL in the test env, so the store is in-memory and empty.
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[] };
    expect(Array.isArray(body.items)).toBe(true);
  });
});

describe("hireBlockers", () => {
  it("lists four reasons when nothing is ready", () => {
    const reasons = hireBlockers({
      connected: false,
      sampled: false,
      capOk: false,
      contractsReady: false,
    });
    expect(reasons).toHaveLength(4);
  });
});

describe("classifyKind", () => {
  it("matches first-class needles in documented order", () => {
    expect(classifyKind("rebalance lp range")).toBe("rebalancing");
    expect(classifyKind("liquidation health factor")).toBe("health-factor");
    expect(classifyKind("grid trading band")).toBe("grid");
    expect(classifyKind("yield pancake apr")).toBe("yield");
    expect(classifyKind("hello world")).toBe("unknown");
  });

  // Real BSC cards mention several categories. Scoring, not scan order, decides.
  it("keeps a yield mandate that also says rebalance", () => {
    expect(
      classifyKind("BORT Yield Weaver Farm Strategist. Operates on BSC, can rebalance."),
    ).toBe("yield");
    expect(classifyKind("Auto-compounding yield farm vault with rebalancing of LP range")).toBe(
      "yield",
    );
  });

  it("keeps a rebalancer that merely names PancakeSwap", () => {
    expect(
      classifyKind("BNB LP Range Rebalancer. PancakeSwap V3 concentrated-liquidity rebalancer."),
    ).toBe("rebalancing");
  });

  it("keeps health factor when the card also mentions liquidity", () => {
    expect(
      classifyKind("Reads a Venus lending position and returns its health factor and collateral"),
    ).toBe("health-factor");
  });

  it("does not let a bare 'trading' claim yield", () => {
    expect(classifyKind("autonomous trading agent")).toBe("unknown");
  });
});

describe("interleaveRoundRobin", () => {
  it("does not pad shorter groups", () => {
    const mixed = interleaveRoundRobin(
      [
        [{ id: "r1" }, { id: "r2" }],
        [{ id: "g1" }],
        [{ id: "y1" }, { id: "y2" }, { id: "y3" }],
        [],
      ],
      (row) => row.id,
    );
    expect(mixed.map((row) => row.id)).toEqual(["r1", "g1", "y1", "r2", "y2", "y3"]);
  });
});
