import type { LeaseStorePort } from "@/application/ports/lease-store-port";
import { memoryLeaseStore } from "@/infrastructure/leases/memory-lease-store";
import { supabaseAdmin } from "@/infrastructure/leases/supabase";
import { SupabaseLeaseStore } from "@/infrastructure/leases/supabase-lease-store";

let cached: LeaseStorePort | null = null;

export function createLeaseStore(): LeaseStorePort {
  if (cached) return cached;
  const db = supabaseAdmin();
  cached = db ? new SupabaseLeaseStore(db) : memoryLeaseStore;
  return cached;
}
