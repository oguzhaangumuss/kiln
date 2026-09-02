import type { AgentKind } from "@/domain/agent";
import type { Lease } from "@/domain/lease";

export type HireLogEntry = {
  hiredAt: string;
  handle: string;
  kind: AgentKind | string;
  walletShort: string;
  envelopeTx: string | null;
  maxUsdt: number;
};

export function truncateWallet(wallet: string): string {
  const value = wallet.trim();
  if (value.length < 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function toHireLogEntry(lease: Pick<Lease, "hiredAt" | "handle" | "kind" | "wallet" | "envelopeTx" | "maxUsdt">): HireLogEntry {
  return {
    hiredAt: lease.hiredAt,
    handle: lease.handle,
    kind: lease.kind,
    walletShort: truncateWallet(lease.wallet),
    envelopeTx: lease.envelopeTx,
    maxUsdt: lease.maxUsdt,
  };
}

export function bscTestnetTxUrl(tx: string): string {
  return `https://testnet.bscscan.com/tx/${tx}`;
}
