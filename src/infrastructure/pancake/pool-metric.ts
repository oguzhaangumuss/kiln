import type { PancakePort, PoolMetric } from "@/application/ports/pancake-port";
import { TtlCache } from "@/infrastructure/catalog/ttl-cache";

const cache = new TtlCache<PoolMetric | null>(60_000);

const CANDIDATES = [
  "https://explorer.pancakeswap.com/api/cached/pools/list?orderBy=tvlUSD&protocols=v3&chains=bsc",
  "https://explorer.pancakeswap.com/api/cached/pools/farming?chain=bsc",
];

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function toBps(apr: number): number {
  return apr > 1 ? Math.round(apr * 100) : Math.round(apr * 10_000);
}

function toUsd(value: number): number {
  return value > 1e12 ? value / 1e12 : value;
}

function pickPool(payload: unknown): PoolMetric | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const list = Array.isArray(root.rows)
    ? root.rows
    : Array.isArray(root.data)
      ? root.data
      : Array.isArray(root.pools)
        ? root.pools
        : Array.isArray(payload)
          ? payload
          : [];
  const first = list.find((row) => row && typeof row === "object") as
    | Record<string, unknown>
    | undefined;
  if (!first) return null;

  const apr24 = first.apr24h;
  const apr =
    num(first.apr) ??
    num(first.lpApr) ??
    num(first.farmApr) ??
    num(first.apr7d) ??
    num(apr24) ??
    num((apr24 as Record<string, unknown> | undefined)?.value);
  const rawTvl = num(first.tvlUSD) ?? num(first.tvlUsd) ?? num(first.tvl) ?? num(first.liquidityUSD);
  const tvl = rawTvl === null ? null : toUsd(rawTvl);
  if (apr === null && tvl === null) return null;
  return {
    aprBps: apr === null ? null : toBps(apr),
    tvlUsd: tvl,
    source: "pancakeswap-public",
  };
}

export class PancakePoolMetric implements PancakePort {
  async snapshot(): Promise<PoolMetric | null> {
    const hit = cache.get("bsc-top");
    if (hit !== undefined) return hit;

    for (const url of CANDIDATES) {
      try {
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(8000),
          cache: "no-store",
        });
        if (!res.ok) continue;
        const metric = pickPool(await res.json());
        if (metric) {
          cache.set("bsc-top", metric);
          return metric;
        }
      } catch {
        // next public URL — never invent APR
      }
    }
    cache.set("bsc-top", null);
    return null;
  }
}

export function createPancake(): PancakePort {
  return new PancakePoolMetric();
}
