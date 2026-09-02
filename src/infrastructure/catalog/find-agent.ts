import type { Agent, Pulse } from "@/domain/agent";
import { parseAgentKind } from "@/domain/kind";
import { jobsFromUnknown, type AdvertisedService } from "@/domain/published-job";
import { recallListedAgent, rememberListedAgents } from "@/infrastructure/catalog/agent-lookup-cache";
import { fetchScanAgent } from "@/infrastructure/catalog/scan-catalog";

const PULSES: Pulse[] = ["live", "stale", "unknown"];

export type AgentLookupHint = {
  tokenId?: string;
  chainId?: number;
  snapshot?: Partial<Agent> | null;
};

function asKind(value: unknown) {
  return parseAgentKind(value);
}

function asPulse(value: unknown): Pulse {
  return typeof value === "string" && (PULSES as string[]).includes(value)
    ? (value as Pulse)
    : "unknown";
}

function asJobs(raw: unknown) {
  return jobsFromUnknown(raw);
}

function asServices(raw: unknown): AdvertisedService[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const endpoint = String(row.endpoint ?? "").trim();
      if (!endpoint) return null;
      return { name: String(row.name ?? "service").trim() || "service", endpoint };
    })
    .filter((row): row is AdvertisedService => Boolean(row));
}

export function agentFromSnapshot(raw: Partial<Agent>, fallbackId: string): Agent | null {
  const id = String(raw.id ?? fallbackId).trim();
  const agentId = String(raw.agentId ?? id.split(":").pop() ?? id).trim();
  if (!id && !agentId) return null;
  return {
    id: id || agentId,
    agentId: agentId || id,
    handle: String(raw.handle ?? `AGENT-${agentId}`).slice(0, 48),
    kind: asKind(raw.kind),
    pulse: asPulse(raw.pulse),
    lastActivityBlock: Number(raw.lastActivityBlock ?? 0) || 0,
    mandate: String(raw.mandate ?? "No readable agent card.").slice(0, 600),
    erc8004: String(raw.erc8004 ?? agentId),
    owner: String(raw.owner ?? "0x0000000000000000000000000000000000000000"),
    agentUri: String(raw.agentUri ?? ""),
    pancakeAprBps: typeof raw.pancakeAprBps === "number" ? raw.pancakeAprBps : null,
    pancakeTvlUsd: typeof raw.pancakeTvlUsd === "number" ? raw.pancakeTvlUsd : null,
    pancakePair: typeof raw.pancakePair === "string" ? raw.pancakePair : null,
    pancakeFeeBps: typeof raw.pancakeFeeBps === "number" ? raw.pancakeFeeBps : null,
    pancakeTick: typeof raw.pancakeTick === "number" ? raw.pancakeTick : null,
    pancakePrice: typeof raw.pancakePrice === "number" ? raw.pancakePrice : null,
    cardReadable: Boolean(raw.cardReadable),
    totalFeedbacks: Number(raw.totalFeedbacks ?? 0) || 0,
    averageScore: typeof raw.averageScore === "number" ? raw.averageScore : null,
    x402Supported: Boolean(raw.x402Supported),
    chainId: Number(raw.chainId ?? 56) || 56,
    protocols: Array.isArray(raw.protocols) ? raw.protocols.map(String) : [],
    a2aEndpoint: raw.a2aEndpoint ? String(raw.a2aEndpoint) : null,
    mcpEndpoint: raw.mcpEndpoint ? String(raw.mcpEndpoint) : null,
    claimedJobs: asJobs(raw.claimedJobs),
    extraServices: asServices(raw.extraServices),
    cardHydrated: Boolean(raw.cardHydrated),
  };
}

function parseLookup(id: string, hint?: AgentLookupHint): { chainId: number; tokenId: string } {
  const parts = id.split(":");
  const hintedToken = hint?.tokenId?.trim();
  const tokenId = hintedToken || parts.pop() || id;
  const chainFromId = parts.length > 0 ? Number(parts[0]) : NaN;
  const chainId =
    hint?.chainId && hint.chainId > 0
      ? hint.chainId
      : Number.isFinite(chainFromId) && chainFromId > 0
        ? chainFromId
        : 56;
  return { chainId, tokenId };
}

function mergeListed(listed: Agent | undefined, scanned: Agent): Agent {
  if (!listed) return { ...scanned, cardHydrated: true };
  return {
    ...scanned,
    pancakeAprBps: listed.pancakeAprBps ?? scanned.pancakeAprBps,
    pancakeTvlUsd: listed.pancakeTvlUsd ?? scanned.pancakeTvlUsd,
    pancakePair: listed.pancakePair ?? scanned.pancakePair,
    pancakeFeeBps: listed.pancakeFeeBps ?? scanned.pancakeFeeBps,
    pancakeTick: listed.pancakeTick ?? scanned.pancakeTick,
    pancakePrice: listed.pancakePrice ?? scanned.pancakePrice,
    cardHydrated: true,
  };
}

export async function findAgent(
  id: string,
  hint?: AgentLookupHint,
): Promise<Agent | null> {
  const cached =
    recallListedAgent(id) ??
    (hint?.tokenId ? recallListedAgent(hint.tokenId) : undefined);

  const { chainId, tokenId } = parseLookup(id, hint);
  const numericToken = /^\d+$/.test(tokenId);

  if (cached?.cardHydrated && (cached.a2aEndpoint || cached.mcpEndpoint)) {
    return cached;
  }

  if (numericToken) {
    try {
      const scanned = mergeListed(cached, await fetchScanAgent(chainId, tokenId));
      rememberListedAgents([scanned]);
      return scanned;
    } catch {
      // listed snapshot below
    }
  }

  if (cached) return cached;

  if (hint?.snapshot) {
    const fromCard = agentFromSnapshot(hint.snapshot, id);
    if (fromCard) {
      rememberListedAgents([fromCard]);
      return fromCard;
    }
  }

  return null;
}
