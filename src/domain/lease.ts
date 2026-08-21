import type { Heartbeat } from "@/domain/heartbeat";

export type LeaseStatus = "active" | "expired" | "revoked";

export type DoorState = "live" | "silent" | "closed";

export type Lease = {
  id: string;
  wallet: string;
  agentId: string;
  tokenId: string;
  chainId: number;
  handle: string;
  kind: string;
  mandate: string;
  protocols: string[];
  a2aEndpoint: string | null;
  mcpEndpoint: string | null;
  maxUsdt: number;
  hours: number;
  hiredAt: string;
  expiresAt: string;
  revokedAt: string | null;
  envelopeTx: string | null;
  envelopeOnchainId: number | null;
  sampleHash: string | null;
  status: LeaseStatus;
  lastHeartbeat: Heartbeat | null;
};

export function hasLeaseDoor(lease: Pick<Lease, "a2aEndpoint" | "mcpEndpoint" | "protocols">): boolean {
  return Boolean(lease.a2aEndpoint || lease.mcpEndpoint || lease.protocols.length);
}

export function doorStateOf(lease: Lease): DoorState {
  if (!hasLeaseDoor(lease)) return "closed";
  if (lease.lastHeartbeat?.reachable) return "live";
  return "silent";
}

export function remainingMs(lease: Lease, now = Date.now()): number {
  if (lease.status === "revoked" || lease.revokedAt) return 0;
  return Math.max(0, Date.parse(lease.expiresAt) - now);
}

export function statusOf(lease: Lease, now = Date.now()): LeaseStatus {
  if (lease.status === "revoked" || lease.revokedAt) return "revoked";
  if (remainingMs(lease, now) <= 0) return "expired";
  return "active";
}

export function remainingLabel(lease: Lease, now = Date.now()): string {
  const ms = remainingMs(lease, now);
  if (lease.status === "revoked" || lease.revokedAt) return "Revoked";
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h left`;
  }
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

export function expiresAtFrom(hiredAt: string, hours: number): string {
  return new Date(Date.parse(hiredAt) + hours * 3_600_000).toISOString();
}
