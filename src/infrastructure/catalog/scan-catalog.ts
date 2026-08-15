import type { Agent, AgentKind, Pulse } from "@/domain/agent";
import { classifyKind, categorySearchQ } from "@/domain/kind";
import type { AgentCatalogPort, CatalogPageRequest, RawPage } from "@/application/ports/agent-catalog-port";
import { TtlCache } from "@/infrastructure/catalog/ttl-cache";
import { BSC_IDENTITY_REGISTRY } from "@/infrastructure/erc8004/addresses";

const BASE = "https://8004scan.io/api/v1/public";
const BSC_CHAIN = 56;
const CACHE_MS = 45_000;

type ScanAgent = {
  id?: string;
  agent_id?: string;
  token_id?: string;
  chain_id?: number;
  contract_address?: string;
  owner_address?: string;
  name?: string | null;
  description?: string | null;
  image_url?: string | null;
  total_feedbacks?: number;
  average_score?: number;
  x402_supported?: boolean;
  created_at?: string;
  updated_at?: string;
};

type ScanEnvelope<T> = {
  success?: boolean;
  data?: T;
  meta?: { pagination?: { page?: number; limit?: number; total?: number; hasMore?: boolean } };
  error?: { message?: string };
};

const pageCache = new TtlCache<RawPage>(CACHE_MS);
const listCache = new TtlCache<{ rows: ScanAgent[]; total: number }>(CACHE_MS);
const inflight = new Map<string, Promise<RawPage>>();

function headers(): HeadersInit {
  const key = process.env.SCAN_8004_API_KEY?.trim();
  const h: Record<string, string> = { Accept: "application/json" };
  if (key) h.Authorization = `Bearer ${key}`;
  return h;
}

async function scanGet<T>(path: string): Promise<ScanEnvelope<T>> {
  const res = await fetch(`${BASE}${path}`, {
    headers: headers(),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  const body = (await res.json()) as ScanEnvelope<T>;
  if (!res.ok || body.success === false) {
    throw new Error(body.error?.message ?? `8004scan HTTP ${res.status}`);
  }
  return body;
}

function pulseFrom(row: ScanAgent, readable: boolean): Pulse {
  if (!readable) return "unknown";
  const stamp = Date.parse(row.updated_at ?? row.created_at ?? "");
  if (!Number.isFinite(stamp)) return "unknown";
  const ageMs = Date.now() - stamp;
  if (ageMs < 7 * 24 * 60 * 60 * 1000) return "live";
  return "stale";
}

function toAgent(row: ScanAgent): Agent {
  const tokenId = String(row.token_id ?? "");
  const chainId = Number(row.chain_id ?? BSC_CHAIN);
  const registry = row.contract_address || BSC_IDENTITY_REGISTRY;
  const handle = (row.name || `AGENT-${tokenId}`).slice(0, 48);
  const mandate = (row.description || "No readable agent card.").slice(0, 220);
  const readable = Boolean(row.description || (row.name && !row.name.startsWith("Agent #")));

  return {
    id: row.agent_id || `${chainId}:${registry}:${tokenId}`,
    agentId: tokenId,
    handle,
    kind: classifyKind(`${handle} ${mandate}`),
    pulse: pulseFrom(row, readable),
    lastActivityBlock: 0,
    mandate,
    erc8004: `${registry}:${tokenId}`,
    owner: row.owner_address || "0x0000000000000000000000000000000000000000",
    agentUri: row.image_url || `https://8004scan.io/agent/${chainId}/${tokenId}`,
    pancakeAprBps: null,
    pancakeTvlUsd: null,
    cardReadable: readable,
    totalFeedbacks: Number(row.total_feedbacks ?? 0),
    averageScore: typeof row.average_score === "number" ? row.average_score : null,
    x402Supported: Boolean(row.x402_supported),
    chainId,
  };
}

function matchesQuery(agent: Agent, q: string, category: AgentKind | "all"): boolean {
  if (category !== "all" && agent.kind !== category) return false;
  if (!q.trim()) return true;
  const hay = `${agent.handle} ${agent.mandate} ${agent.kind}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => hay.includes(word));
}

export class ScanCatalog implements AgentCatalogPort {
  async page(request: CatalogPageRequest): Promise<RawPage> {
    const limit = Math.min(Math.max(request.limit, 1), 50);
    const offset = Math.max(request.offset, 0);
    const page = Math.floor(offset / limit) + 1;
    const q = request.q.trim();
    const category = request.category;
    const cacheKey = `56|${page}|${limit}|${q}|${category}`;

    const cached = pageCache.get(cacheKey);
    if (cached) return cached;

    const pending = inflight.get(cacheKey);
    if (pending) return pending;

    const job = this.fetchPage(page, limit, q, category).then((raw) => {
      pageCache.set(cacheKey, raw);
      inflight.delete(cacheKey);
      return raw;
    });
    inflight.set(cacheKey, job);
    try {
      return await job;
    } catch (err) {
      inflight.delete(cacheKey);
      throw err;
    }
  }

  private async fetchPage(
    page: number,
    limit: number,
    q: string,
    category: AgentKind | "all",
  ): Promise<RawPage> {
    const searchQ = q || categorySearchQ(category);
    let rows: ScanAgent[] = [];
    let total = 0;
    let listed: { rows: ScanAgent[]; total: number } | null = null;

    if (searchQ) {
      try {
        const searched = await scanGet<ScanAgent[]>(
          `/agents/search?q=${encodeURIComponent(searchQ)}&chainId=${BSC_CHAIN}&page=${page}&limit=${limit}`,
        );
        rows = Array.isArray(searched.data) ? searched.data : [];
        total = searched.meta?.pagination?.total ?? rows.length;
      } catch {
        listed = await this.listBsc(page, limit);
        rows = listed.rows;
        total = listed.total;
      }
    } else {
      listed = await this.listBsc(page, limit);
      rows = listed.rows;
      total = listed.total;
    }

    const bscOnly = rows.filter((row) => Number(row.chain_id) === BSC_CHAIN);
    let agents = bscOnly.map(toAgent).filter((agent) => matchesQuery(agent, q, category));
    let searchDegraded = Boolean(searchQ) && listed !== null;

    if ((q || category !== "all") && agents.length < limit) {
      searchDegraded = true;
      const seen = new Set(agents.map((agent) => agent.id));
      const startPage = Math.max(1, page);
      for (let p = startPage; p < startPage + 4 && agents.length < limit; p += 1) {
        const extra = await this.listBsc(p, 25);
        for (const row of extra.rows) {
          if (Number(row.chain_id) !== BSC_CHAIN) continue;
          const agent = toAgent(row);
          if (!matchesQuery(agent, q, category) || seen.has(agent.id)) continue;
          seen.add(agent.id);
          agents.push(agent);
          if (agents.length >= limit) break;
        }
        total = extra.total;
      }
    }

    if (agents.length === 0) {
      agents = bscOnly.map(toAgent);
      searchDegraded = true;
    }

    return { agents, totalOnChain: total, feed: "8004scan", searchDegraded };
  }

  private async listBsc(page: number, limit: number): Promise<{ rows: ScanAgent[]; total: number }> {
    const key = `list|56|${page}|${limit}`;
    const hit = listCache.get(key);
    if (hit) return hit;
    const listed = await scanGet<ScanAgent[]>(
      `/agents?chainId=${BSC_CHAIN}&page=${page}&limit=${limit}`,
    );
    const value = {
      rows: Array.isArray(listed.data) ? listed.data : [],
      total: listed.meta?.pagination?.total ?? 0,
    };
    listCache.set(key, value);
    return value;
  }
}

export async function fetchScanAgent(chainId: number, tokenId: string): Promise<Agent> {
  const body = await scanGet<ScanAgent>(`/agents/${chainId}/${tokenId}`);
  if (!body.data) throw new Error("8004scan agent missing");
  return toAgent(body.data);
}
