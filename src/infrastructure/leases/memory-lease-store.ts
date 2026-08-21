import type { Heartbeat } from "@/domain/heartbeat";
import { expiresAtFrom, statusOf, type Lease } from "@/domain/lease";
import type { LeaseStorePort, OpenLeaseInput } from "@/application/ports/lease-store-port";

const wallets = new Set<string>();
const leases = new Map<string, Lease>();
const beats = new Map<string, Heartbeat[]>();
let n = 1;

function id(prefix: string): string {
  n += 1;
  return `${prefix}-${n.toString(16)}`;
}

export class MemoryLeaseStore implements LeaseStorePort {
  async touchWallet(wallet: string): Promise<void> {
    wallets.add(wallet.toLowerCase());
  }

  async open(input: OpenLeaseInput): Promise<Lease> {
    const wallet = input.wallet.toLowerCase();
    await this.touchWallet(wallet);
    const hiredAt = input.hiredAt;
    const lease: Lease = {
      id: id("lease"),
      wallet,
      agentId: input.agent.id,
      tokenId: input.agent.agentId,
      chainId: input.agent.chainId,
      handle: input.agent.handle,
      kind: input.agent.kind,
      mandate: input.agent.mandate,
      protocols: input.agent.protocols,
      a2aEndpoint: input.agent.a2aEndpoint,
      mcpEndpoint: input.agent.mcpEndpoint,
      maxUsdt: input.maxUsdt,
      hours: input.hours,
      hiredAt,
      expiresAt: expiresAtFrom(hiredAt, input.hours),
      revokedAt: null,
      envelopeTx: input.envelopeTx,
      envelopeOnchainId: input.envelopeOnchainId,
      sampleHash: input.sampleHash,
      status: "active",
      lastHeartbeat: null,
    };
    leases.set(lease.id, lease);
    return lease;
  }

  async listByWallet(wallet: string): Promise<Lease[]> {
    const key = wallet.toLowerCase();
    return [...leases.values()]
      .filter((lease) => lease.wallet === key)
      .map((lease) => ({
        ...lease,
        status: statusOf(lease),
        lastHeartbeat: beats.get(lease.id)?.[0] ?? null,
      }))
      .sort((a, b) => Date.parse(b.hiredAt) - Date.parse(a.hiredAt));
  }

  async get(id: string): Promise<Lease | null> {
    const lease = leases.get(id);
    if (!lease) return null;
    return { ...lease, status: statusOf(lease), lastHeartbeat: beats.get(id)?.[0] ?? null };
  }

  async revoke(id: string, wallet: string): Promise<Lease | null> {
    const lease = leases.get(id);
    if (!lease || lease.wallet !== wallet.toLowerCase()) return null;
    const next: Lease = {
      ...lease,
      status: "revoked",
      revokedAt: new Date().toISOString(),
    };
    leases.set(id, next);
    return { ...next, lastHeartbeat: beats.get(id)?.[0] ?? null };
  }

  async markExpired(id: string): Promise<void> {
    const lease = leases.get(id);
    if (!lease || lease.status !== "active") return;
    leases.set(id, { ...lease, status: "expired" });
  }

  async appendHeartbeat(draft: Omit<Heartbeat, "id">): Promise<Heartbeat> {
    const beat: Heartbeat = { ...draft, id: id("beat") };
    const list = beats.get(draft.leaseId) ?? [];
    list.unshift(beat);
    beats.set(draft.leaseId, list.slice(0, 40));
    const lease = leases.get(draft.leaseId);
    if (lease) leases.set(draft.leaseId, { ...lease, lastHeartbeat: beat });
    return beat;
  }

  async lastHeartbeatAt(leaseId: string): Promise<string | null> {
    return beats.get(leaseId)?.[0]?.at ?? null;
  }

  async listDueForPulse(limit: number): Promise<Lease[]> {
    const now = Date.now();
    return [...leases.values()]
      .filter((lease) => statusOf(lease, now) === "active")
      .slice(0, limit)
      .map((lease) => ({ ...lease, lastHeartbeat: beats.get(lease.id)?.[0] ?? null }));
  }

  async recentHeartbeats(leaseId: string, limit: number): Promise<Heartbeat[]> {
    return (beats.get(leaseId) ?? []).slice(0, limit);
  }
}

export const memoryLeaseStore = new MemoryLeaseStore();
