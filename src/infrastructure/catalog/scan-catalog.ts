import type { Agent, AgentKind, Pulse } from "@/domain/agent";
import { jobsFromUnknown, type AdvertisedService } from "@/domain/published-job";
import { classifyKind, categorySearchQ, categorySearchNeedles } from "@/domain/kind";
import { matchesDiscovery } from "@/domain/catalog-query";
import type { PulseFilter } from "@/domain/catalog-query";
import type { AgentCatalogPort, CatalogPageRequest, RawPage } from "@/application/ports/agent-catalog-port";
import { TtlCache } from "@/infrastructure/catalog/ttl-cache";
import { BSC_IDENTITY_REGISTRY } from "@/infrastructure/erc8004/addresses";

const BSC_CHAIN = 56;
const CACHE_MS = 120_000;

type ScanService = { name?: string; endpoint?: string };

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
  supported_protocols?: string[];
  a2a_endpoint?: string | null;
  mcp_server?: string | null;
  services?: {
    a2a?: { endpoint?: string; skills?: unknown[] };
    mcp?: { endpoint?: string; tools?: unknown[] };
  };
  raw_metadata?: {
    offchain_content?: {
      description?: string;
      services?: ScanService[];
    };
  };
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
const agentCache = new TtlCache<Agent>(CACHE_MS);
const inflight = new Map<string, Promise<RawPage>>();
const agentInflight = new Map<string, Promise<Agent>>();

function chainQuery(): string {
  return scanKey() ? `chain_id=${BSC_CHAIN}` : `chainId=${BSC_CHAIN}`;
}

const PUBLIC_BASE = "https://8004scan.io/api/v1/public";
const AUTH_BASE = "https://8004scan.io/api/v1";

function scanBase(): string {
  return scanKey() ? AUTH_BASE : PUBLIC_BASE;
}

async function scanFetch<T>(base: string, path: string, withKey: boolean): Promise<ScanEnvelope<T>> {
  const h: Record<string, string> = { Accept: "application/json" };
  if (withKey) {
    const key = scanKey();
    if (key) h["X-API-Key"] = key;
  }
  const res = await fetch(`${base}${path}`, {
    headers: h,
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
  // Keyed GET /agents/{chain}/{token} returns the agent object, not { data }.
  if (
    body.data === undefined &&
    typeof body === "object" &&
    ("token_id" in body || "agent_id" in body)
  ) {
    return { success: true, data: body as T };
  }
  return body;
}

async function scanGet<T>(path: string): Promise<ScanEnvelope<T>> {
  const keyed = Boolean(scanKey());
  try {
    return await scanFetch<T>(scanBase(), path, keyed);
  } catch (err) {
    // Keyed /agents/{chain}/{token} returns 403; public detail still works.
    if (!keyed || scanBase() === PUBLIC_BASE) throw err;
    return scanFetch<T>(PUBLIC_BASE, path, false);
  }
}

function pulseFrom(row: ScanAgent, readable: boolean): Pulse {
  if (!readable) return "unknown";
  const stamp = Date.parse(row.updated_at ?? row.created_at ?? "");
  if (!Number.isFinite(stamp)) return "unknown";
  const ageMs = Date.now() - stamp;
  if (ageMs < 7 * 24 * 60 * 60 * 1000) return "live";
  return "stale";
}

function extraServicesFrom(row: ScanAgent): AdvertisedService[] {
  const listed = row.raw_metadata?.offchain_content?.services ?? [];
  const extras: AdvertisedService[] = [];
  const seen = new Set<string>();
  for (const service of listed) {
    const name = String(service.name ?? "").trim() || "service";
    const endpoint = String(service.endpoint ?? "").trim();
    if (!endpoint) continue;
    const key = endpoint.toLowerCase();
    if (seen.has(key)) continue;
    const protocol = name.toUpperCase();
    if (protocol === "A2A" || protocol === "MCP") continue;
    seen.add(key);
    extras.push({ name, endpoint });
  }
  return extras;
}

function endpointsFrom(row: ScanAgent): {
  protocols: string[];
  a2aEndpoint: string | null;
  mcpEndpoint: string | null;
} {
  const protocols = (row.supported_protocols ?? []).map((item) => String(item));
  const a2a = row.a2a_endpoint || row.services?.a2a?.endpoint || null;
  const mcp = row.mcp_server || row.services?.mcp?.endpoint || null;
  if (a2a && !protocols.some((item) => item.toUpperCase() === "A2A")) protocols.push("A2A");
  if (mcp && !protocols.some((item) => item.toUpperCase() === "MCP")) protocols.push("MCP");
  return { protocols, a2aEndpoint: a2a, mcpEndpoint: mcp };
}

function toAgent(row: ScanAgent): Agent {
  const tokenId = String(row.token_id ?? "");
  const chainId = Number(row.chain_id ?? BSC_CHAIN);
  const registry = row.contract_address || BSC_IDENTITY_REGISTRY;
  const handle = (row.name || `AGENT-${tokenId}`).slice(0, 48);
  const mandate = (
    row.description ||
    row.raw_metadata?.offchain_content?.description ||
    "No readable agent card."
  ).slice(0, 600);
  const readable = Boolean(row.description || (row.name && !row.name.startsWith("Agent #")));
  const endpoints = endpointsFrom(row);
  const claimedJobs = [
    ...jobsFromUnknown(row.services?.a2a?.skills),
    ...jobsFromUnknown(row.services?.mcp?.tools),
  ];
  const hydrated = Boolean(endpoints.a2aEndpoint || endpoints.mcpEndpoint || row.raw_metadata);

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
    pancakePair: null,
    pancakeFeeBps: null,
    pancakeTick: null,
    pancakePrice: null,
    cardReadable: readable,
    totalFeedbacks: Number(row.total_feedbacks ?? 0),
    averageScore: typeof row.average_score === "number" ? row.average_score : null,
    x402Supported: Boolean(row.x402_supported),
    chainId,
    protocols: endpoints.protocols,
    a2aEndpoint: endpoints.a2aEndpoint,
    mcpEndpoint: endpoints.mcpEndpoint,
    claimedJobs,
    extraServices: extraServicesFrom(row),
    cardHydrated: hydrated,
  };
}

function matchesQuery(
  agent: Agent,
  q: string,
  category: AgentKind | "all",
  pulse: PulseFilter,
  x402Only: boolean,
  minFeedback: number,
  doorOnly: boolean,
): boolean {
  return matchesDiscovery(agent, { q, category, pulse, x402Only, minFeedback, doorOnly });
}

export class ScanCatalog implements AgentCatalogPort {
  async page(request: CatalogPageRequest): Promise<RawPage> {
    const limit = Math.min(Math.max(request.limit, 1), 50);
    const offset = Math.max(request.offset, 0);
    const page = Math.floor(offset / limit) + 1;
    const q = request.q.trim();
    const category = request.category;
    const pulse = request.pulse;
    const x402Only = request.x402Only;
    const minFeedback = request.minFeedback;
    const doorOnly = request.doorOnly;
    const cacheKey = `56|${page}|${limit}|${q}|${category}|${pulse}|${x402Only}|${minFeedback}|${doorOnly}`;

    const cached = pageCache.get(cacheKey);
    if (cached) return cached;

    const pending = inflight.get(cacheKey);
    if (pending) return pending;

    const job = this.fetchPage(page, limit, q, category, pulse, x402Only, minFeedback, doorOnly).then((raw) => {
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
    pulse: PulseFilter,
    x402Only: boolean,
    minFeedback: number,
    doorOnly: boolean,
  ): Promise<RawPage> {
    const needles = q.trim()
      ? [q.trim()]
      : categorySearchNeedles(category);
    const searchQ = needles[0] ?? categorySearchQ(category);
    const discovery = { q, category, pulse, x402Only, minFeedback, doorOnly };
    const filtered = q.trim() || category !== "all" || pulse !== "all" || x402Only || minFeedback > 0 || doorOnly;

    if (searchQ) {
      const searched = await this.searchFill(needles, page, limit, discovery);
      if (searched) {
        return searched;
      }
    }

    const listed = await this.listBsc(page, limit);
    const bscOnly = listed.rows.filter((row) => Number(row.chain_id) === BSC_CHAIN);

    if (!filtered) {
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
      const extra = p === page ? listed : await this.listBsc(p, 50);
      for (const row of extra.rows) {
        if (Number(row.chain_id) !== BSC_CHAIN) continue;
        const agent = toAgent(row);
        if (!matchesQuery(agent, q, category, pulse, x402Only, minFeedback, doorOnly) || seen.has(agent.id)) {
          continue;
        }
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

  private async searchFill(
    needles: string[],
    page: number,
    limit: number,
    discovery: {
      q: string;
      category: AgentKind | "all";
      pulse: PulseFilter;
      x402Only: boolean;
      minFeedback: number;
      doorOnly: boolean;
    },
  ): Promise<RawPage | null> {
    const offset = (page - 1) * limit;
    const agents: Agent[] = [];
    const seen = new Set<string>();
    let total = 0;
    let any = false;

    for (let p = 1; p <= 12 && agents.length < limit; p += 1) {
      const searched = await this.searchPages(needles, p, limit);
      if (!searched) break;
      any = true;
      total = searched.total;
      for (const row of searched.rows) {
        if (Number(row.chain_id) !== BSC_CHAIN) continue;
        const agent = toAgent(row);
        if (!matchesQuery(agent, discovery.q, discovery.category, discovery.pulse, discovery.x402Only, discovery.minFeedback, discovery.doorOnly) || seen.has(agent.id)) {
          continue;
        }
        seen.add(agent.id);
        if (seen.size <= offset) continue;
        agents.push(agent);
        if (agents.length >= limit) break;
      }
    }

    if (!any) return null;
    return {
      agents,
      totalOnChain: Math.max(total, offset + agents.length),
      feed: "8004scan",
      searchDegraded: false,
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
  const key = `agent|${chainId}|${tokenId}`;
  const cached = agentCache.get(key);
  if (cached) return cached;
  const pending = agentInflight.get(key);
  if (pending) return pending;
  const job = (async () => {
    const body = await scanGet<ScanAgent>(`/agents/${chainId}/${tokenId}`);
    if (!body.data) throw new Error("8004scan agent missing");
    const agent = { ...toAgent(body.data), cardHydrated: true };
    agentCache.set(key, agent);
    return agent;
  })();
  agentInflight.set(key, job);
  try {
    return await job;
  } finally {
    agentInflight.delete(key);
  }
}
