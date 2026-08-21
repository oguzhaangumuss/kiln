import type { LeaseStorePort } from "@/application/ports/lease-store-port";
import type { Lease } from "@/domain/lease";

export async function revokeLease(
  store: LeaseStorePort,
  leaseId: string,
  wallet: string,
): Promise<Lease> {
  const lease = await store.revoke(leaseId, wallet);
  if (!lease) throw new Error("Lease not found for this wallet.");
  return lease;
}
