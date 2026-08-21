import type { Agent } from "@/domain/agent";
import type { Heartbeat } from "@/domain/heartbeat";
import type { Lease } from "@/domain/lease";
import type { SampleTrace } from "@/domain/sample-trace";

export type OpenLeaseInput = {
  wallet: string;
  agent: Agent;
  maxUsdt: number;
  hours: number;
  hiredAt: string;
  envelopeTx: string | null;
  envelopeOnchainId: number | null;
  sampleHash: string | null;
  sampleTrace: SampleTrace | null;
};

export type LeaseStorePort = {
  open(input: OpenLeaseInput): Promise<Lease>;
  listByWallet(wallet: string): Promise<Lease[]>;
  get(id: string): Promise<Lease | null>;
  revoke(id: string, wallet: string): Promise<Lease | null>;
  markExpired(id: string): Promise<void>;
  appendHeartbeat(draft: Omit<Heartbeat, "id">): Promise<Heartbeat>;
  lastHeartbeatAt(leaseId: string): Promise<string | null>;
  listDueForPulse(limit: number): Promise<Lease[]>;
  recentHeartbeats(leaseId: string, limit: number): Promise<Heartbeat[]>;
  touchWallet(wallet: string): Promise<void>;
};
