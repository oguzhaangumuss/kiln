import type { LeaseStorePort } from "@/application/ports/lease-store-port";
import { remainingMs, statusOf, type Lease } from "@/domain/lease";

export async function listMyLeases(store: LeaseStorePort, wallet: string): Promise<Lease[]> {
  const rows = await store.listByWallet(wallet);
  const now = Date.now();
  const out: Lease[] = [];
  for (const lease of rows) {
    const status = statusOf(lease, now);
    if (lease.status === "active" && status === "expired") {
      await store.markExpired(lease.id);
      out.push({ ...lease, status: "expired" });
      continue;
    }
    out.push({ ...lease, status });
  }
  return out;
}

export function leaseStillActive(lease: Lease, now = Date.now()): boolean {
  return statusOf(lease, now) === "active" && remainingMs(lease, now) > 0;
}
