import type { HireLogEntry } from "@/domain/hire-log";
import type { LeaseStorePort } from "@/application/ports/lease-store-port";

export async function listRecentHires(
  store: LeaseStorePort,
  limit = 40,
): Promise<{ items: HireLogEntry[] }> {
  const items = await store.listRecentHires(Math.min(Math.max(limit, 1), 80));
  return { items };
}
