import type { Agent, AgentKind, Pulse } from "@/domain/agent";
import { classifyKind, categorySearchQ, categorySearchNeedles } from "@/domain/kind";
import type { AgentCatalogPort, CatalogPageRequest, RawPage } from "@/application/ports/agent-catalog-port";
import { TtlCache } from "@/infrastructure/catalog/ttl-cache";
import { BSC_IDENTITY_REGISTRY } from "@/infrastructure/erc8004/addresses";

const BSC_CHAIN = 56;
const CACHE_MS = 120_000;

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

type AuthList = {
  items?: ScanAgent[];
  total?: number;
  limit?: number;
  offset?: number;
  detail?: string;
};

function scanKey(): string {
  return process.env.SCAN_8004_API_KEY?.trim() ?? "";
}

const pageCache = new TtlCache<RawPage>(CACHE_MS);
const listCache = new TtlCache<{ rows: ScanAgent[]; total: number }>(CACHE_MS);
const inflight = new Map<string, Promise<RawPage>>();

function chainQuery(): string {
  return scanKey() ? `chain_id=${BSC_CHAIN}` : `chainId=${BSC_CHAIN}`;
}

function scanBase(): string {
  return scanKey() ? "https://8004scan.io/api/v1" : "https://8004scan.io/api/v1/public";
}

function headers(): HeadersInit {
  const key = scanKey();
  const h: Record<string, string> = { Accept: "application/json" };
  if (key) h["X-API-Key"] = key;
  return h;
}

async function scanGet<T>(path: string): Promise<ScanEnvelope<T>> {
  const res = await fetch(`${scanBase()}${path}`, {
    headers: headers(),
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  const body = (await res.json()) as ScanEnvelope<T> & AuthList;
  if (!res.ok || body.success === false) {
    const message =
      body.error?.message ??
      (typeof body.detail === "string" ? body.detail : null) ??
      `8004scan HTTP ${res.status}`;
    throw new Error(message);
  }
  if (Array.isArray(body.items) && body.data === undefined) {
    return {
      success: true,
      data: body.items as T,
      meta: {
        pagination: {
          total: Number(body.total ?? body.items.length),
          limit: Number(body.limit ?? 0),
          page: 1,
          hasMore: Number(body.offset ?? 0) + body.items.length < Number(body.total ?? 0),
        },
      },
    };
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
    const needles = q.trim()
      ? [q.trim()]
      : categorySearchNeedles(category);
    const searchQ = needles[0] ?? categorySearchQ(category);

    if (searchQ) {
      const searched = await this.searchPages(needles, page, limit);
      if (searched) {
        const bscOnly = searched.rows.filter((row) => Number(row.chain_id) === BSC_CHAIN);
        let agents = bscOnly.map(toAgent);
        if (q.trim()) {
          agents = agents.filter((agent) => matchesQuery(agent, q, "all"));
        }
        return {
          agents: agents.slice(0, limit),
          totalOnChain: Math.max(searched.total, agents.length),
          feed: "8004scan",
          searchDegraded: false,
        };
      }
    }

    const listed = await this.listBsc(page, limit);
    const bscOnly = listed.rows.filter((row) => Number(row.chain_id) === BSC_CHAIN);

    if (!q.trim() && category === "all") {
      return {
        agents: bscOnly.map(toAgent),
        totalOnChain: listed.total,
        feed: "8004scan",
      };
    }

    const offset = (page - 1) * limit;
    const agents: Agent[] = [];
    const seen = new Set<string>();
    const startPage = 1;
    const maxPages = 24;

    for (let p = startPage; p < startPage + maxPages && agents.length < limit; p += 1) {
      const extra = p === page ? listed : await this.listBsc(p, 25);
      for (const row of extra.rows) {
        if (Number(row.chain_id) !== BSC_CHAIN) continue;
        const agent = toAgent(row);
        if (!matchesQuery(agent, q, category) || seen.has(agent.id)) continue;
        seen.add(agent.id);
        if (seen.size <= offset) continue;
        agents.push(agent);
        if (agents.length >= limit) break;
      }
    }

    const filled = agents.length >= limit;
    return {
      agents,
      totalOnChain: filled ? offset + limit + 1 : offset + agents.length,
      feed: "8004scan",
      searchDegraded: true,
    };
  }

  private async searchPages(
    needles: string[],
    page: number,
    limit: number,
  ): Promise<{ rows: ScanAgent[]; total: number } | null> {
    for (const needle of needles) {
      try {
        const searched = await scanGet<ScanAgent[]>(
          scanKey()
            ? `/agents?search=${encodeURIComponent(needle)}&${chainQuery()}&page=${page}&limit=${limit}`
            : `/agents/search?q=${encodeURIComponent(needle)}&${chainQuery()}&page=${page}&limit=${limit}`,
        );
        const rows = Array.isArray(searched.data) ? searched.data : [];
        if (rows.length === 0) continue;
        return {
          rows,
          total: searched.meta?.pagination?.total ?? rows.length,
        };
      } catch {
        continue;
      }
    }
    return null;
  }

  private async listBsc(page: number, limit: number): Promise<{ rows: ScanAgent[]; total: number }> {
    const key = `list|56|${page}|${limit}`;
    const hit = listCache.get(key);
    if (hit) return hit;
    const listed = await scanGet<ScanAgent[]>(
      `/agents?${chainQuery()}&page=${page}&limit=${limit}`,
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
