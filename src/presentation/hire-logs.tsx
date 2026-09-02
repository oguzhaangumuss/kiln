"use client";

import { useCallback, useEffect, useState } from "react";
import { bscTestnetTxUrl, type HireLogEntry } from "@/domain/hire-log";
import { kindLabel, parseAgentKind } from "@/domain/kind";

export function HireLogsPanel() {
  const [items, setItems] = useState<HireLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/logs/hires");
      if (!res.ok) throw new Error("Hire log could not be loaded.");
      const data = (await res.json()) as {
        items: HireLogEntry[];
        degraded?: boolean;
        notice?: string;
      };
      setItems(data.items);
      // An unreachable hire book must not read as "nobody hired yet".
      if (data.degraded) setNotice(data.notice ?? "The hire book is unreachable right now.");
    } catch {
      setError("Hire log could not be loaded. Try again.");
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (items === null) {
    return (
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {Array.from({ length: 6 }).map((_, index) => (
          <li key={index} className="border-b border-line px-5 py-4">
            <div className="kiln-skeleton h-3 w-2/5" />
            <div className="kiln-skeleton mt-2 h-3 w-3/5" />
          </li>
        ))}
      </ul>
    );
  }

  if (error) {
    return (
      <div className="px-5 py-4">
        <p className="font-mono text-[11px] text-heat">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-2 min-h-9 border border-heat px-2 py-1 font-mono text-[10px] uppercase text-heat"
        >
          Retry
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="px-5 py-4">
        <p className="font-sans text-sm leading-6 text-ink/80">
          {notice ?? "No Kiln hires stored yet. Hire from the Bay; the envelope tx appears here."}
        </p>
        {notice ? (
          <button
            type="button"
            onClick={() => void load()}
            className="mt-2 min-h-9 border border-amber px-2 py-1 font-mono text-[10px] uppercase text-amber"
          >
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <ul className="min-h-0 flex-1 overflow-y-auto">
      {items.map((row, index) => (
        <li key={`${row.hiredAt}-${row.envelopeTx ?? index}`} className="border-b border-line px-5 py-3">
          <p className="font-mono text-xs text-ink">{row.handle}</p>
          <p className="mt-1 font-mono text-[10px] text-ok">
            {kindLabel(parseAgentKind(String(row.kind)))} · {new Date(row.hiredAt).toLocaleString()} · cap{" "}
            {row.maxUsdt} USDT · {row.walletShort}
          </p>
          {row.envelopeTx ? (
            <a
              href={bscTestnetTxUrl(row.envelopeTx)}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block break-all font-mono text-[10px] text-amber underline"
            >
              TX {row.envelopeTx}
            </a>
          ) : (
            <p className="mt-1 font-mono text-[10px] text-ink/55">No on-chain envelope tx stored.</p>
          )}
        </li>
      ))}
    </ul>
  );
}

export function HireLogsDetail() {
  return (
    <div className="overflow-y-auto px-6 py-5">
      <p className="font-mono text-[10px] tracking-[0.16em] text-ok uppercase">Public hire tape</p>
      <h3 className="mt-2 font-mono text-xl text-ink">Latest Kiln hires</h3>
      <p className="mt-2 max-w-xl font-sans text-sm leading-6 text-ink/80">
        The list is every lease Kiln stored after a hire book signature: time, truncated
        wallet, spend cap, and the BSC testnet envelope transaction when one exists. Sample
        traces and door heartbeats stay on My hires. An empty list means nobody has hired
        through this venue yet — rows are not invented.
      </p>
    </div>
  );
}
