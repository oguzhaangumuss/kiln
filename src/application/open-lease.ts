import type { Agent } from "@/domain/agent";
import { parseAgentKind } from "@/domain/kind";
import type { LeaseStorePort, OpenLeaseInput } from "@/application/ports/lease-store-port";
import { heartbeatDraft } from "@/domain/heartbeat";
import type { Lease } from "@/domain/lease";

export async function openLease(store: LeaseStorePort, input: OpenLeaseInput): Promise<Lease> {
  const lease = await store.open(input);
  if (input.sampleTrace) {
    const beat = await store.appendHeartbeat(heartbeatDraft(lease.id, input.sampleTrace));
    return { ...lease, lastHeartbeat: beat };
  }
  return lease;
}

export function agentFromLease(lease: Lease): Agent {
  return {
    id: lease.agentId,
    agentId: lease.tokenId,
    handle: lease.handle,
    kind: parseAgentKind(lease.kind),
    pulse: "unknown",
    lastActivityBlock: 0,
    mandate: lease.mandate,
    erc8004: `${lease.chainId}:${lease.tokenId}`,
    owner: "0x0000000000000000000000000000000000000000",
    agentUri: lease.a2aEndpoint ?? "",
    pancakeAprBps: null,
    pancakeTvlUsd: null,
    pancakePair: null,
    pancakeFeeBps: null,
    pancakeTick: null,
    pancakePrice: null,
    cardReadable: true,
    totalFeedbacks: 0,
    averageScore: null,
    x402Supported: false,
    chainId: lease.chainId,
    protocols: lease.protocols,
    a2aEndpoint: lease.a2aEndpoint,
    mcpEndpoint: lease.mcpEndpoint,
    claimedJobs: [],
    extraServices: [],
    cardHydrated: false,
  };
}
