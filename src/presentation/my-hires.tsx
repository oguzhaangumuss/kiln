"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { sessionMessage } from "@/domain/session-message";
import { doorStateOf, remainingLabel, type Lease } from "@/domain/lease";
import { monitorSignals } from "@/domain/hire-signals";
import type { Heartbeat } from "@/domain/heartbeat";
import { JargonTip } from "@/presentation/jargon-tip";

export function useHireBook() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync, isPending: signing } = useSignMessage();
  const [bookWallet, setBookWallet] = useState<string | null>(null);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [heartbeats, setHeartbeats] = useState<Heartbeat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshSession = useCallback(async () => {
    const res = await fetch("/api/session");
    const data = (await res.json()) as { wallet?: string | null };
    setBookWallet(data.wallet ?? null);
    return data.wallet ?? null;
  }, []);

  const loadLeases = useCallback(async () => {
    const res = await fetch("/api/leases");
    if (res.status === 401) {
      setLeases([]);
      return [];
    }
    if (!res.ok) return [];
    const data = (await res.json()) as { items: Lease[] };
    setLeases(data.items);
    setSelectedId((current) => {
      if (current && data.items.some((row) => row.id === current)) return current;
      return data.items[0]?.id ?? "";
    });
    return data.items;
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    if (!id) {
      setHeartbeats([]);
      return;
    }
    const res = await fetch(`/api/leases/${id}`);
    if (!res.ok) return;
    const data = (await res.json()) as { lease: Lease; heartbeats: Heartbeat[] };
    setHeartbeats(data.heartbeats);
    setLeases((rows) => rows.map((row) => (row.id === data.lease.id ? data.lease : row)));
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (!bookWallet) return;
    void loadLeases();
  }, [bookWallet, loadLeases]);

  useEffect(() => {
    if (!selectedId || !bookWallet) return;
    void loadDetail(selectedId);
  }, [selectedId, bookWallet, loadDetail]);

  useEffect(() => {
    if (!selectedId || !bookWallet) return;
    const timer = window.setInterval(() => {
      void (async () => {
        await fetch(`/api/leases/${selectedId}/pulse`, { method: "POST" });
        await loadDetail(selectedId);
        await loadLeases();
      })();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [selectedId, bookWallet, loadDetail, loadLeases]);

  async function signIn(): Promise<boolean> {
    if (!address) {
      setError("Connect a wallet first.");
      return false;
    }
    setError(null);
    const nonceRes = await fetch("/api/session/nonce", { method: "POST" });
    const nonceBody = (await nonceRes.json()) as { nonce?: string };
    if (!nonceBody.nonce) {
      setError("Could not start hire-book sign-in.");
      return false;
    }
    try {
      const signature = await signMessageAsync({
        message: sessionMessage(address, nonceBody.nonce),
      });
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature }),
      });
      if (!res.ok) {
        const fail = (await res.json()) as { error?: string };
        throw new Error(fail.error ?? "Sign-in failed.");
      }
      await refreshSession();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
      return false;
    }
  }

  async function pulseNow(id: string) {
    setLoading(true);
    try {
      await fetch(`/api/leases/${id}/pulse`, { method: "POST" });
      await loadDetail(id);
      await loadLeases();
    } finally {
      setLoading(false);
    }
  }

  async function revokeNow(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/leases/${id}/revoke`, { method: "POST" });
      if (!res.ok) {
        const fail = (await res.json()) as { error?: string };
        throw new Error(fail.error ?? "Revoke failed.");
      }
      await loadLeases();
      await loadDetail(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed.");
    } finally {
      setLoading(false);
    }
  }

  const selected = leases.find((row) => row.id === selectedId) ?? null;
  const signedForThisWallet =
    Boolean(address && bookWallet && address.toLowerCase() === bookWallet);

  return {
    address,
    isConnected,
    bookWallet,
    signedForThisWallet,
    signing,
    loading,
    error,
    leases,
    selected,
    selectedId,
    setSelectedId,
    heartbeats,
    signIn,
    pulseNow,
    revokeNow,
    loadLeases,
    loadDetail,
  };
}

function doorWord(lease: Lease): string {
  const door = doorStateOf(lease);
  if (door === "live") return "Catalog live";
  if (door === "silent") return "Catalog silent";
  return "No job URL";
}

function doorClass(lease: Lease): string {
  const door = doorStateOf(lease);
  if (door === "live") return "text-ok";
  if (door === "silent") return "text-heat";
  return "text-amber";
}

export function MyHiresList({
  book,
  onOpen,
}: {
  book: ReturnType<typeof useHireBook>;
  onOpen?: () => void;
}) {
  if (!book.isConnected) {
    return (
      <p className="px-5 py-4 font-sans text-sm leading-6 text-ink/80">
        Connect a wallet to see the agents you leased.
      </p>
    );
  }
  if (!book.signedForThisWallet) {
    return (
      <div className="px-5 py-4">
        <p className="font-sans text-sm leading-6 text-ink/80">
          Hire will ask for this signature automatically. You can also sign now to open stored
          leases.
        </p>
        <button
          type="button"
          onClick={() => void book.signIn()}
          disabled={book.signing}
          className="mt-3 border border-amber bg-amber px-3 py-1.5 font-mono text-[10px] font-semibold text-bg uppercase disabled:opacity-40"
        >
          {book.signing ? "Waiting…" : "Sign hire book"}
        </button>
        {book.error ? <p className="mt-3 font-mono text-[11px] text-heat">{book.error}</p> : null}
      </div>
    );
  }
  if (book.leases.length === 0) {
    return (
      <p className="px-5 py-4 font-sans text-sm leading-6 text-ink/80">
        No leases yet. Hire from the Bay. The record stays after you close this panel.
      </p>
    );
  }
  return (
    <ul className="min-h-0 flex-1 overflow-y-auto">
      {book.leases.map((row) => {
        const active = row.id === book.selectedId;
        return (
          <li key={row.id} className="border-b border-line">
            <button
              type="button"
              onClick={() => {
                book.setSelectedId(row.id);
                onOpen?.();
              }}
              className={`w-full px-5 py-3 text-left ${active ? "bg-panel" : "hover:bg-panel/60"}`}
            >
              <span className="flex items-center justify-between gap-2 font-mono text-xs">
                <span className="truncate text-ink">{row.handle}</span>
                <span className="shrink-0 text-[10px] uppercase text-ink/50">{row.status}</span>
              </span>
              <span className={`mt-1 block font-mono text-[10px] ${doorClass(row)}`}>
                {doorWord(row)} · {remainingLabel(row)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function MyHireDetail({
  book,
  onRevokeChain,
}: {
  book: ReturnType<typeof useHireBook>;
  onRevokeChain?: (envelopeOnchainId: number | null) => Promise<void>;
}) {
  const lease = book.selected;
  if (!book.isConnected || !book.signedForThisWallet) {
    return (
      <p className="p-8 font-sans text-sm leading-6 text-ink/80">
        Hire from the Bay, or sign the hire book on the left. Kiln then stores the lease on
        this wallet.
      </p>
    );
  }
  if (!lease) {
    return <p className="p-8 font-mono text-sm">No lease selected.</p>;
  }
  const signals = monitorSignals(lease, book.heartbeats);
  return (
    <div className="overflow-y-auto px-6 py-5">
      <p className="font-mono text-[10px] tracking-[0.16em] text-ok uppercase">Step 5 · watch</p>
      <h3 className="mt-2 font-mono text-xl text-ink">{lease.handle}</h3>
      <p className="mt-2 max-w-xl font-sans text-sm leading-6 text-ink/80">{lease.mandate}</p>
      <p className={`mt-3 font-mono text-[11px] ${doorClass(lease)}`}>
        {doorWord(lease)} · {remainingLabel(lease)}
      </p>
      <dl className="mt-4 grid gap-2 sm:grid-cols-3">
        {([signals.door, signals.commerce, signals.budget] as const).map((box) => (
          <div key={box.title} className="border border-line px-3 py-3">
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ok">{box.title}</dt>
            <dd className="mt-2 font-sans text-[13px] leading-5 text-ink/85">{box.body}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 max-w-xl font-mono text-[10px] leading-5 text-ink/55">
        Three signals only: <JargonTip term="door" /> (catalog ping), commerce (published{" "}
        <JargonTip term="ERC-8183" /> job names), budget (your cap). This is not a camera into
        private trades, vaults, or PnL.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void book.pulseNow(lease.id)}
          disabled={book.loading || lease.status !== "active"}
          className="min-h-11 border border-amber bg-amber px-4 py-2 font-mono text-xs font-semibold text-bg uppercase disabled:opacity-40"
        >
          Ping catalog now
        </button>
        <button
          type="button"
          onClick={() => {
            void (async () => {
              await onRevokeChain?.(lease.envelopeOnchainId);
              await book.revokeNow(lease.id);
            })();
          }}
          disabled={book.loading || lease.status === "revoked"}
          className="min-h-11 border border-heat px-4 py-2 font-mono text-xs text-heat uppercase disabled:opacity-40"
        >
          Revoke
        </button>
      </div>
      <ol className="mt-5 grid gap-2">
        {book.heartbeats.length === 0 ? (
          <li className="font-mono text-[11px] text-ink/50">No pings stored yet.</li>
        ) : (
          book.heartbeats.map((beat) => (
            <li key={beat.id} className="border border-line px-3 py-2">
              <p className={`font-mono text-[10px] uppercase ${beat.reachable ? "text-ok" : "text-amber"}`}>
                {new Date(beat.at).toLocaleString()} · {beat.reachable ? "answered" : "no answer"}
                {beat.latencyMs !== null ? ` · ${beat.latencyMs}ms` : ""}
                {beat.httpStatus !== null ? ` · HTTP ${beat.httpStatus}` : ""}
              </p>
              <p className="mt-1 font-sans text-[13px] leading-5 text-ink/80">{beat.verdict}</p>
              {beat.skills.length > 0 ? (
                <p className="mt-1 font-mono text-[10px] text-ok">
                  Jobs · {beat.skills.slice(0, 12).join(" · ")}
                  {beat.skills.length > 12 ? ` +${beat.skills.length - 12}` : ""}
                </p>
              ) : beat.snippet ? (
                <p className="mt-1 font-mono text-[10px] text-ink/55">{beat.snippet}</p>
              ) : null}
            </li>
          ))
        )}
      </ol>
      {book.error ? <p className="mt-3 font-mono text-[11px] text-heat">{book.error}</p> : null}
    </div>
  );
}
