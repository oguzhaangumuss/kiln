import type { LeaseStorePort } from "@/application/ports/lease-store-port";
import { agentFromLease } from "@/application/open-lease";
import { heartbeatDraft, type Heartbeat } from "@/domain/heartbeat";
import { statusOf, type Lease } from "@/domain/lease";
import { probeAgent } from "@/infrastructure/agent-probe";

const SKIP_MS = 20_000;

export async function pulseLease(
  store: LeaseStorePort,
  leaseId: string,
  opts: { force?: boolean } = {},
): Promise<{ lease: Lease; beat: Heartbeat | null; skipped: boolean }> {
  const lease = await store.get(leaseId);
  if (!lease) throw new Error("Lease not found.");
  if (statusOf(lease) !== "active") {
    return { lease, beat: lease.lastHeartbeat, skipped: true };
  }
  if (!opts.force) {
    const last = await store.lastHeartbeatAt(leaseId);
    if (last && Date.now() - Date.parse(last) < SKIP_MS) {
      return { lease, beat: lease.lastHeartbeat, skipped: true };
    }
  }
  const trace = await probeAgent(agentFromLease(lease));
  const beat = await store.appendHeartbeat(heartbeatDraft(lease.id, trace));
  return { lease: { ...lease, lastHeartbeat: beat }, beat, skipped: false };
}

export async function pulseDueLeases(
  store: LeaseStorePort,
  limit = 20,
): Promise<{ pulsed: number; skipped: number }> {
  const due = await store.listDueForPulse(limit);
  let pulsed = 0;
  let skipped = 0;
  const queue = [...due];
  const workers = 5;
  async function worker() {
    while (queue.length) {
      const lease = queue.shift();
      if (!lease) return;
      try {
        const result = await pulseLease(store, lease.id);
        if (result.skipped) skipped += 1;
        else pulsed += 1;
      } catch {
        skipped += 1;
      }
    }
  }
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return { pulsed, skipped };
}
