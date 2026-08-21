import type { Heartbeat } from "@/domain/heartbeat";
import { expiresAtFrom, statusOf, type Lease, type LeaseStatus } from "@/domain/lease";
import type { OpenLeaseInput, LeaseStorePort } from "@/application/ports/lease-store-port";
import { supabaseAdmin } from "@/infrastructure/leases/supabase";

type LeaseRow = {
  id: string;
  wallet: string;
  agent_id: string;
  token_id: string;
  chain_id: number;
  handle: string;
  kind: string;
  mandate: string;
  protocols: string[] | null;
  a2a_endpoint: string | null;
  mcp_endpoint: string | null;
  max_usdt: number | string;
  hours: number;
  hired_at: string;
  expires_at: string;
  revoked_at: string | null;
  envelope_tx: string | null;
  envelope_onchain_id: number | null;
  sample_hash: string | null;
  sample_trace: unknown;
  status: LeaseStatus;
};

type BeatRow = {
  id: string;
  lease_id: string;
  at: string;
  reachable: boolean;
  http_status: number | null;
  latency_ms: number | null;
  endpoint: string | null;
  skills: string[] | null;
  snippet: string | null;
  verdict: string | null;
};

function asLease(row: LeaseRow, lastHeartbeat: Heartbeat | null): Lease {
  const lease: Lease = {
    id: row.id,
    wallet: row.wallet,
    agentId: row.agent_id,
    tokenId: row.token_id,
    chainId: Number(row.chain_id),
    handle: row.handle,
    kind: row.kind,
    mandate: row.mandate,
    protocols: row.protocols ?? [],
    a2aEndpoint: row.a2a_endpoint,
    mcpEndpoint: row.mcp_endpoint,
    maxUsdt: Number(row.max_usdt),
    hours: Number(row.hours),
    hiredAt: row.hired_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    envelopeTx: row.envelope_tx,
    envelopeOnchainId: row.envelope_onchain_id,
    sampleHash: row.sample_hash,
    status: row.status,
    lastHeartbeat,
  };
  return { ...lease, status: statusOf(lease) };
}

function asBeat(row: BeatRow): Heartbeat {
  return {
    id: row.id,
    leaseId: row.lease_id,
    at: row.at,
    reachable: Boolean(row.reachable),
    httpStatus: row.http_status,
    latencyMs: row.latency_ms,
    endpoint: row.endpoint,
    skills: row.skills ?? [],
    snippet: row.snippet ?? "",
    verdict: row.verdict ?? "",
  };
}

export class SupabaseLeaseStore implements LeaseStorePort {
  constructor(private readonly db: NonNullable<ReturnType<typeof supabaseAdmin>>) {}

  async touchWallet(wallet: string): Promise<void> {
    await this.db.from("kiln_wallets").upsert({
      address: wallet.toLowerCase(),
      last_seen_at: new Date().toISOString(),
    });
  }

  async open(input: OpenLeaseInput): Promise<Lease> {
    const wallet = input.wallet.toLowerCase();
    await this.touchWallet(wallet);
    const hiredAt = input.hiredAt;
    const { data, error } = await this.db
      .from("kiln_leases")
      .insert({
        wallet,
        agent_id: input.agent.id,
        token_id: input.agent.agentId,
        chain_id: input.agent.chainId,
        handle: input.agent.handle,
        kind: input.agent.kind,
        mandate: input.agent.mandate,
        protocols: input.agent.protocols,
        a2a_endpoint: input.agent.a2aEndpoint,
        mcp_endpoint: input.agent.mcpEndpoint,
        max_usdt: input.maxUsdt,
        hours: input.hours,
        hired_at: hiredAt,
        expires_at: expiresAtFrom(hiredAt, input.hours),
        envelope_tx: input.envelopeTx,
        envelope_onchain_id: input.envelopeOnchainId,
        sample_hash: input.sampleHash,
        sample_trace: input.sampleTrace,
        status: "active",
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Lease could not be opened.");
    return asLease(data as LeaseRow, null);
  }

  async listByWallet(wallet: string): Promise<Lease[]> {
    const { data, error } = await this.db
      .from("kiln_leases")
      .select("*")
      .eq("wallet", wallet.toLowerCase())
      .order("hired_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as LeaseRow[];
    const leases: Lease[] = [];
    for (const row of rows) {
      const beats = await this.recentHeartbeats(row.id, 1);
      leases.push(asLease(row, beats[0] ?? null));
    }
    return leases;
  }

  async get(id: string): Promise<Lease | null> {
    const { data, error } = await this.db.from("kiln_leases").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const beats = await this.recentHeartbeats(id, 1);
    return asLease(data as LeaseRow, beats[0] ?? null);
  }

  async revoke(id: string, wallet: string): Promise<Lease | null> {
    const { data, error } = await this.db
      .from("kiln_leases")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", id)
      .eq("wallet", wallet.toLowerCase())
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const beats = await this.recentHeartbeats(id, 1);
    return asLease(data as LeaseRow, beats[0] ?? null);
  }

  async markExpired(id: string): Promise<void> {
    await this.db.from("kiln_leases").update({ status: "expired" }).eq("id", id).eq("status", "active");
  }

  async appendHeartbeat(draft: Omit<Heartbeat, "id">): Promise<Heartbeat> {
    const { data, error } = await this.db
      .from("kiln_heartbeats")
      .insert({
        lease_id: draft.leaseId,
        at: draft.at,
        reachable: draft.reachable,
        http_status: draft.httpStatus,
        latency_ms: draft.latencyMs,
        endpoint: draft.endpoint,
        skills: draft.skills,
        snippet: draft.snippet,
        verdict: draft.verdict,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Heartbeat could not be stored.");
    return asBeat(data as BeatRow);
  }

  async lastHeartbeatAt(leaseId: string): Promise<string | null> {
    const { data, error } = await this.db
      .from("kiln_heartbeats")
      .select("at")
      .eq("lease_id", leaseId)
      .order("at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data?.at ?? null;
  }

  async listDueForPulse(limit: number): Promise<Lease[]> {
    const now = new Date().toISOString();
    const { data, error } = await this.db
      .from("kiln_leases")
      .select("*")
      .eq("status", "active")
      .gt("expires_at", now)
      .order("hired_at", { ascending: true })
      .limit(Math.min(Math.max(limit, 1), 50));
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as LeaseRow[];
    return Promise.all(
      rows.map(async (row) => asLease(row, (await this.recentHeartbeats(row.id, 1))[0] ?? null)),
    );
  }

  async recentHeartbeats(leaseId: string, limit: number): Promise<Heartbeat[]> {
    const { data, error } = await this.db
      .from("kiln_heartbeats")
      .select("*")
      .eq("lease_id", leaseId)
      .order("at", { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 40));
    if (error) throw new Error(error.message);
    return ((data ?? []) as BeatRow[]).map(asBeat);
  }
}
